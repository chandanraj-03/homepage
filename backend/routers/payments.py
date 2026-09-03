"""
Razorpay Payment Processing Router.
Handles order creation, client keys, and constant-time HMAC-SHA256 signature verification.
"""

import hmac
import hashlib
import uuid
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from backend.config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, razorpay_client
from backend.schemas import CreateOrderRequest, VerifyPaymentRequest

router = APIRouter(prefix="/api", tags=["Payments"])

import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_resilient_razorpay_client():
    """Create a fresh Razorpay client with automated HTTP connection retries."""
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return None
    try:
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        if hasattr(client, 'session') and isinstance(client.session, requests.Session):
            retry_strategy = Retry(
                total=3,
                backoff_factor=0.3,
                status_forcelist=[500, 502, 503, 504],
                raise_on_status=False
            )
            adapter = HTTPAdapter(max_retries=retry_strategy)
            client.session.mount('https://', adapter)
            client.session.mount('http://', adapter)
        return client
    except Exception as err:
        print(f"[Razorpay] Client creation error: {err}")
        return None

@router.post("/create-order", summary="Create Razorpay Order")
async def create_order(payload: CreateOrderRequest):
    """
    Create Razorpay Order for frontend checkout with automatic retries on connection reset.
    Expects JSON: { "amount": <amount_in_paise>, "currency": "INR", "receipt": "<optional_receipt_id>", "notes": {...} }
    Returns JSON: { "order_id": "...", "amount": ..., "currency": "...", "key_id": "..." }
    """
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return JSONResponse(
            status_code=500,
            content={'error': 'Razorpay payment gateway credentials not configured on server.'}
        )

    raw_amount = payload.amount
    currency = (payload.currency or 'INR').upper()
    receipt = payload.receipt or f"rcpt_{uuid.uuid4().hex[:10]}"
    notes = payload.notes or {}

    if raw_amount is None:
        return JSONResponse(
            status_code=400,
            content={'error': 'Missing required parameter: amount (in paise).'}
        )

    try:
        amount_paise = int(raw_amount)
    except (ValueError, TypeError):
        return JSONResponse(
            status_code=400,
            content={'error': 'Invalid amount. Must be an integer number of paise.'}
        )

    # Minimum order amount validation: 100 paise (₹1.00)
    if amount_paise < 100:
        return JSONResponse(
            status_code=400,
            content={'error': 'Minimum order amount is 100 paise (₹1.00).'}
        )

    order_params = {
        'amount': amount_paise,
        'currency': currency,
        'receipt': str(receipt),
        'notes': notes,
        'payment_capture': 1
    }

    # Attempt order creation with automatic retry for transient socket/connection drops
    last_exception = None
    for attempt in range(1, 4):
        try:
            client = create_resilient_razorpay_client()
            if not client:
                raise Exception("Razorpay client is not initialized.")
            
            order = client.order.create(data=order_params)
            
            return {
                'order_id': order['id'],
                'amount': order['amount'],
                'currency': order['currency'],
                'key_id': RAZORPAY_KEY_ID
            }
        except Exception as e:
            last_exception = e
            error_str = str(e).lower()
            # If network/connection drop, wait briefly and retry with a fresh session
            if attempt < 3 and ('connection' in error_str or 'remotedisconnected' in error_str or 'timeout' in error_str):
                time.sleep(0.3 * attempt)
                continue
            break

    error_message = str(last_exception) if last_exception else "Unknown error occurred"
    status_code = 500
    if 'unauthorized' in error_message.lower() or 'auth' in error_message.lower():
        status_code = 401
    return JSONResponse(
        status_code=status_code,
        content={'error': f'Failed to create Razorpay order: {error_message}'}
    )

@router.post("/verify-payment", summary="Verify Razorpay Payment")
async def verify_payment(payload: VerifyPaymentRequest):
    """
    Verify Razorpay Payment Signature.
    Expects JSON: { "razorpay_order_id": "...", "razorpay_payment_id": "...", "razorpay_signature": "..." }
    Returns JSON: { "success": true, "message": "...", "order_id": "...", "payment_id": "..." }
    """
    if not RAZORPAY_KEY_SECRET:
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'message': 'Razorpay secret key is not configured on server.'
            }
        )

    razorpay_order_id = payload.razorpay_order_id or payload.order_id
    razorpay_payment_id = payload.razorpay_payment_id or payload.payment_id
    razorpay_signature = payload.razorpay_signature or payload.signature

    if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
        return JSONResponse(
            status_code=400,
            content={
                'success': False,
                'message': 'Missing required verification fields: razorpay_order_id, razorpay_payment_id, razorpay_signature.'
            }
        )

    try:
        # Step 1: Compute HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
        message_to_sign = f"{razorpay_order_id}|{razorpay_payment_id}".encode('utf-8')
        generated_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode('utf-8'),
            message_to_sign,
            hashlib.sha256
        ).hexdigest()

        # Step 2: Constant-time comparison to prevent timing attacks
        is_valid = hmac.compare_digest(generated_signature, str(razorpay_signature))

        if not is_valid:
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'message': 'Payment verification failed: Signature mismatch.'
                }
            )

        # Step 3: Secondary verification with official Razorpay utility if client is available
        if razorpay_client:
            try:
                razorpay_client.utility.verify_payment_signature({
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature
                })
            except Exception as util_err:
                if 'SignatureVerificationError' in str(type(util_err)):
                    return JSONResponse(
                        status_code=400,
                        content={
                            'success': False,
                            'message': 'Payment verification failed via Razorpay utility.'
                        }
                    )

        return {
            'success': True,
            'message': 'Payment verified successfully.',
            'order_id': razorpay_order_id,
            'payment_id': razorpay_payment_id
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'message': f'Internal server error during signature verification: {str(e)}'
            }
        )
