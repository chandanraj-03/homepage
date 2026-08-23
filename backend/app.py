import os
import sys
import hmac
import hashlib
import uuid
from flask import Flask, send_from_directory, request, jsonify

# Ensure safe UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))
    load_dotenv()
except ImportError:
    pass

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')

supabase_client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[PrivCloud] Supabase client initialized on backend.")
    except Exception as e:
        print(f"[PrivCloud] Supabase python client could not be initialized: {e}")

# Razorpay configuration
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '').strip()
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '').strip()

razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        import razorpay
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        print("[PrivCloud] Razorpay client initialized on backend.")
    except Exception as e:
        print(f"[PrivCloud] Razorpay client could not be initialized: {e}")
else:
    print("[PrivCloud] Razorpay credentials missing in environment variables.")

# Directory paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))

# Ultra-lightweight Flask app
app = Flask(__name__, static_folder=FRONTEND_DIR)

# Strict Major Email Provider Allowlist
ALLOWED_EMAIL_DOMAINS = {
    'gmail.com', 'googlemail.com',
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
    'yahoo.com', 'yahoo.co.in', 'ymail.com',
    'proton.me', 'protonmail.com',
    'icloud.com', 'me.com', 'mac.com',
    'zoho.com',
    'aol.com',
    'gmx.com', 'mail.com'
}

def is_allowed_email_domain(email):
    """Check if email domain belongs to the strict allowlist."""
    if '@' not in email:
        return False
    domain = email.split('@')[-1].lower().strip()
    return domain in ALLOWED_EMAIL_DOMAINS

# ----------------- Frontend Page Routes -----------------

@app.route('/')
def index():
    """Serve landing page."""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/login')
@app.route('/register')
@app.route('/auth')
def auth():
    """Serve unified dynamic authentication page."""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'auth_page'), 'auth.html')

@app.route('/product')
def product():
    """Serve product and architecture page."""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'product_page'), 'product.html')

@app.route('/purchase')
@app.route('/checkout')
def purchase():
    """Serve hidden purchase and license activation page."""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'purchase_page'), 'purchase.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static assets (CSS, JS, media)."""
    return send_from_directory(FRONTEND_DIR, filename)

# ----------------- Lightweight API Routes -----------------

@app.route('/api/auth/validate-email', methods=['POST'])
def validate_email():
    """API endpoint to validate email domain against the strict allowlist."""
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip()
    
    if not is_allowed_email_domain(email):
        return jsonify({
            'valid': False,
            'message': 'Only major email providers are allowed (Gmail, Outlook, Yahoo, Proton, iCloud, Zoho).'
        }), 400

    return jsonify({
        'valid': True,
        'message': 'Email domain is verified.'
    })

# ----------------- Razorpay Payment Endpoints -----------------

@app.route('/api/create-order', methods=['POST'])
def create_order():
    """
    Create Razorpay Order for frontend checkout.
    Expects JSON: { "amount": <amount_in_paise>, "currency": "INR", "receipt": "<optional_receipt_id>", "notes": {...} }
    Returns JSON: { "order_id": "...", "amount": ..., "currency": "...", "key_id": "..." }
    """
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return jsonify({
            'error': 'Razorpay payment gateway credentials not configured on server.'
        }), 500

    if not razorpay_client:
        return jsonify({
            'error': 'Razorpay client is not initialized.'
        }), 500

    data = request.get_json(silent=True) or {}
    
    raw_amount = data.get('amount')
    currency = data.get('currency', 'INR').upper()
    receipt = data.get('receipt') or f"rcpt_{uuid.uuid4().hex[:10]}"
    notes = data.get('notes') or {}

    if raw_amount is None:
        return jsonify({'error': 'Missing required parameter: amount (in paise).'}), 400

    try:
        amount_paise = int(raw_amount)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount. Must be an integer number of paise.'}), 400

    # Minimum order amount validation: 100 paise (₹1.00)
    if amount_paise < 100:
        return jsonify({'error': 'Minimum order amount is 100 paise (₹1.00).'}), 400

    try:
        order_params = {
            'amount': amount_paise,
            'currency': currency,
            'receipt': str(receipt),
            'notes': notes,
            'payment_capture': 1
        }
        order = razorpay_client.order.create(data=order_params)
        
        return jsonify({
            'order_id': order['id'],
            'amount': order['amount'],
            'currency': order['currency'],
            'key_id': RAZORPAY_KEY_ID
        }), 200

    except Exception as e:
        error_message = str(e)
        status_code = 500
        if 'unauthorized' in error_message.lower() or 'auth' in error_message.lower():
            status_code = 401
        return jsonify({
            'error': f'Failed to create Razorpay order: {error_message}'
        }), status_code

@app.route('/api/verify-payment', methods=['POST'])
def verify_payment():
    """
    Verify Razorpay Payment Signature.
    Expects JSON: { "razorpay_order_id": "...", "razorpay_payment_id": "...", "razorpay_signature": "..." }
    Returns JSON: { "success": true, "message": "...", "order_id": "...", "payment_id": "..." }
    """
    if not RAZORPAY_KEY_SECRET:
        return jsonify({
            'success': False,
            'message': 'Razorpay secret key is not configured on server.'
        }), 500

    data = request.get_json(silent=True) or {}
    
    razorpay_order_id = data.get('razorpay_order_id') or data.get('order_id')
    razorpay_payment_id = data.get('razorpay_payment_id') or data.get('payment_id')
    razorpay_signature = data.get('razorpay_signature') or data.get('signature')

    if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
        return jsonify({
            'success': False,
            'message': 'Missing required verification fields: razorpay_order_id, razorpay_payment_id, razorpay_signature.'
        }), 400

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
            return jsonify({
                'success': False,
                'message': 'Payment verification failed: Signature mismatch.'
            }), 400

        # Step 3: Secondary verification with official Razorpay utility if client is available
        if razorpay_client:
            try:
                razorpay_client.utility.verify_payment_signature({
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature
                })
            except Exception as util_err:
                # If the SDK itself detects a signature mismatch, reject it
                if 'SignatureVerificationError' in str(type(util_err)):
                    return jsonify({
                        'success': False,
                        'message': 'Payment verification failed via Razorpay utility.'
                    }), 400

        return jsonify({
            'success': True,
            'message': 'Payment verified successfully.',
            'order_id': razorpay_order_id,
            'payment_id': razorpay_payment_id
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Internal server error during signature verification: {str(e)}'
        }), 500

# ----------------- Server Entrypoint -----------------

if __name__ == '__main__':
    # Render assigns port dynamically via environment variable 'PORT'
    port = int(os.environ.get('PORT', 5001))
    debug_mode = os.environ.get('RENDER') is None  # Debug only locally, not on Render
    
    print("\n" + "=" * 50)
    print("🚀 PrivCloud Clean Lightweight Server running!")
    print(f"🔗 Local URL: http://localhost:{port}")
    print("=" * 50 + "\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
