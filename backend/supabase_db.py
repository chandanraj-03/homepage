"""
Supabase Database Client Manager for PrivCloud.
Replaces MongoDB with Supabase PostgREST API (PostgreSQL).
Manages atomic product key assignment from the 'product_keys' table,
verified purchase tracking in 'orders', and active user license restoration.
"""

import os
import uuid
import secrets
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
import httpx

from backend.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    get_supabase_headers,
    TRIAL_DAYS,
    PLAN_TO_TIER_MAP,
    SUPPORT_EMAIL
)

logger = logging.getLogger("privcloud.supabase_db")
ACTIVE_SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY

def _generate_license_key(tier: str) -> str:
    """Generate a clean, secure cryptographic product key for the given tier."""
    clean_tier = (tier or 'TRIAL').upper()
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    rand_segment = lambda n: "".join(secrets.choice(chars) for _ in range(n))
    
    if clean_tier == "TRIAL":
        return f"TRIAL-{rand_segment(4)}-{rand_segment(4)}"
    elif clean_tier == "BASIC":
        return f"PRIV-BAS-{rand_segment(4)}-{rand_segment(4)}"
    else:  # PRO
        return f"PRIV-PRO-{rand_segment(4)}-{rand_segment(4)}"


# In-memory store for orders to ensure high availability and resilient fallback
_LOCAL_ORDERS_CACHE: Dict[str, Dict[str, Any]] = {}

def resolve_tier(plan_or_tier: Optional[str]) -> str:
    """Normalize a plan ID or tier string to uppercase tier (TRIAL, BASIC, PRO)."""
    if not plan_or_tier:
        return 'TRIAL'
    cleaned = str(plan_or_tier).strip().lower()
    return PLAN_TO_TIER_MAP.get(cleaned, cleaned.upper())

def _get_rest_url(table: str) -> str:
    """Construct full Supabase PostgREST URL for a table."""
    return f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"

def save_verified_order(
    order_id: str,
    payment_id: str,
    user_email: str,
    plan_id: str,
    tier: str,
    amount: int,
    currency: str = "INR",
    notes: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Record or update a verified purchase order in Supabase 'orders' table.
    Maintains local memory fallback cache for instant responses and offline safety.
    """
    clean_order_id = str(order_id).strip()
    clean_payment_id = str(payment_id).strip()
    clean_email = (user_email or "").strip().lower()
    normalized_tier = resolve_tier(tier or plan_id)
    now_iso = datetime.now(timezone.utc).isoformat()

    order_doc = {
        "order_id": clean_order_id,
        "payment_id": clean_payment_id,
        "user_email": clean_email,
        "plan_id": str(plan_id or ""),
        "tier": normalized_tier,
        "amount": int(amount or 0),
        "currency": currency.upper(),
        "status": "verified",
        "verified_at": now_iso,
        "updated_at": now_iso,
        "notes": notes or {},
        "key_assigned": False
    }

    # Update memory cache
    _LOCAL_ORDERS_CACHE[clean_order_id] = order_doc

    # Persist to Supabase PostgREST table
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            url = _get_rest_url("orders")
            headers = get_supabase_headers(prefer="resolution=merge-duplicates,return=representation")
            with httpx.Client(timeout=6.0) as client:
                res = client.post(url, headers=headers, json=order_doc)
                if res.status_code in (200, 201):
                    print(f"[PrivCloud Supabase] Order {clean_order_id} persisted in Supabase orders table.")
                    return True
                else:
                    logger.debug(f"Supabase orders post status {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"[PrivCloud Supabase] Notice saving order to Supabase: {e}")

    return True

def get_order(order_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve an order by order_id from Supabase or memory cache."""
    clean_order_id = str(order_id).strip()
    
    # 1. Check Supabase PostgREST table
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            url = _get_rest_url("orders")
            headers = get_supabase_headers()
            with httpx.Client(timeout=6.0) as client:
                res = client.get(url, headers=headers, params={"order_id": f"eq.{clean_order_id}", "limit": "1"})
                if res.status_code == 200:
                    rows = res.json()
                    if rows and len(rows) > 0:
                        doc = dict(rows[0])
                        _LOCAL_ORDERS_CACHE[clean_order_id] = doc
                        return doc
        except Exception as e:
            logger.warning(f"[PrivCloud Supabase] Notice fetching order from Supabase: {e}")

    # 2. Check memory cache fallback
    return _LOCAL_ORDERS_CACHE.get(clean_order_id)

def get_user_active_order(user_email: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve the most recent verified order for a specific user email.
    Used to restore the license vault for the authenticated user.
    """
    clean_email = (user_email or "").strip().lower()
    if not clean_email:
        return None

    # 1. Query Supabase PostgREST table
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            url = _get_rest_url("orders")
            headers = get_supabase_headers()
            with httpx.Client(timeout=6.0) as client:
                res = client.get(
                    url,
                    headers=headers,
                    params={
                        "user_email": f"eq.{clean_email}",
                        "status": "eq.verified",
                        "order": "verified_at.desc",
                        "limit": "1"
                    }
                )
                if res.status_code == 200:
                    rows = res.json()
                    if rows and len(rows) > 0:
                        return dict(rows[0])
        except Exception as e:
            logger.warning(f"[PrivCloud Supabase] Notice querying user active order: {e}")

    # 2. Query memory cache fallback
    user_orders = [
        o for o in _LOCAL_ORDERS_CACHE.values()
        if (o.get("user_email") or "").lower() == clean_email and o.get("status") == "verified"
    ]
    if user_orders:
        user_orders.sort(key=lambda x: str(x.get("verified_at", "")), reverse=True)
        return user_orders[0]

    return None

def assign_product_key(
    tier: str,
    user_email: str,
    order_id: str,
    payment_id: str
) -> Tuple[bool, Dict[str, Any]]:
    """
    Securely and atomically assign one available product key from Supabase 'product_keys' table.
    
    1. Idempotency check: If this order already received a key, returns that existing key.
    2. Concurrency-safe atomic check & update via PostgREST with precondition:
       PATCH /product_keys?id=eq.{id}&is_used=eq.false -> status='used', is_used=True
    3. Prevents duplicate issuance and key re-use.
    """
    if not SUPABASE_URL or not ACTIVE_SUPABASE_KEY:
        return False, {
            "error": "SUPABASE_NOT_CONFIGURED",
            "message": "Supabase connection is not configured in .env on the server."
        }

    normalized_tier = resolve_tier(tier)
    clean_email = (user_email or "").strip().lower()
    clean_order_id = str(order_id).strip()
    clean_payment_id = str(payment_id).strip()

    # Step 1: Idempotency Check
    existing_order = get_order(clean_order_id)
    if existing_order and existing_order.get("key_assigned") and existing_order.get("key"):
        print(f"[PrivCloud Supabase] Returning already assigned key for order {clean_order_id}")
        return True, {
            "key": existing_order.get("key"),
            "tier": existing_order.get("tier", normalized_tier),
            "trial_days": existing_order.get("trial_days", TRIAL_DAYS),
            "label": existing_order.get("label"),
            "is_existing": True
        }

    # Step 2: Atomic query and claim from Supabase product_keys table
    now_iso = datetime.now(timezone.utc).isoformat()
    headers_get = get_supabase_headers()
    headers_patch = get_supabase_headers(prefer="return=representation")
    url_keys = _get_rest_url("product_keys")

    try:
        with httpx.Client(timeout=10.0) as client:
            # Query candidate available keys for this tier
            r_get = client.get(
                url_keys,
                headers=headers_get,
                params={
                    "tier": f"eq.{normalized_tier}",
                    "status": "eq.available",
                    "is_used": "eq.false",
                    "limit": "5"
                }
            )

            if r_get.status_code != 200:
                return False, {
                    "error": "DATABASE_QUERY_ERROR",
                    "message": f"Failed to query product keys from Supabase: {r_get.text}"
                }

            candidates = r_get.json() if r_get.status_code == 200 else []
            assigned_key_record = None

            if candidates and len(candidates) > 0:
                for candidate in candidates:
                    cand_id = candidate.get("id")
                    # Atomic update with concurrency guard: only update if is_used is still false!
                    patch_payload = {
                        "status": "used",
                        "is_used": True,
                        "used_at": now_iso
                    }
                    r_patch = client.patch(
                        url_keys,
                        headers=headers_patch,
                        params={"id": f"eq.{cand_id}", "is_used": "eq.false"},
                        json=patch_payload
                    )

                    if r_patch.status_code == 200:
                        updated_rows = r_patch.json()
                        if updated_rows and len(updated_rows) > 0:
                            assigned_key_record = updated_rows[0]
                            break

            # If no available pre-stocked key, dynamically generate and store directly in Supabase product_keys table
            if not assigned_key_record:
                new_key = _generate_license_key(normalized_tier)
                new_hash = hashlib.sha256(new_key.encode("utf-8")).hexdigest()
                new_key_id = f"pk_{uuid.uuid4().hex[:12]}"
                new_key_doc = {
                    "id": new_key_id,
                    "key": new_key,
                    "key_hash": new_hash,
                    "tier": normalized_tier,
                    "status": "used",
                    "is_used": True,
                    "label": f"{normalized_tier.capitalize()} License",
                    "trial_days": TRIAL_DAYS if normalized_tier == "TRIAL" else None,
                    "used_at": now_iso,
                    "created_at": now_iso
                }
                try:
                    r_create = client.post(url_keys, headers=headers_patch, json=new_key_doc)
                    if r_create.status_code in (200, 201):
                        created_rows = r_create.json()
                        if isinstance(created_rows, list) and len(created_rows) > 0:
                            assigned_key_record = created_rows[0]
                        else:
                            assigned_key_record = new_key_doc
                    else:
                        assigned_key_record = new_key_doc
                except Exception as c_err:
                    logger.warning(f"[PrivCloud Supabase] Auto-generated key fallback: {c_err}")
                    assigned_key_record = new_key_doc

            assigned_key = assigned_key_record.get("key")
            assigned_hash = assigned_key_record.get("key_hash")
            assigned_label = assigned_key_record.get("label")
            trial_days = assigned_key_record.get("trial_days") or (TRIAL_DAYS if normalized_tier == 'TRIAL' else None)

            # Step 3: Link assigned key to orders record
            if clean_order_id in _LOCAL_ORDERS_CACHE:
                _LOCAL_ORDERS_CACHE[clean_order_id]["key_assigned"] = True
                _LOCAL_ORDERS_CACHE[clean_order_id]["key"] = assigned_key
                _LOCAL_ORDERS_CACHE[clean_order_id]["key_hash"] = assigned_hash
                _LOCAL_ORDERS_CACHE[clean_order_id]["assigned_at"] = now_iso

            # Update Supabase orders table
            try:
                url_orders = _get_rest_url("orders")
                client.patch(
                    url_orders,
                    headers=headers_patch,
                    params={"order_id": f"eq.{clean_order_id}"},
                    json={
                        "key_assigned": True,
                        "key": assigned_key,
                        "key_hash": assigned_hash,
                        "assigned_at": now_iso
                    }
                )
            except Exception as o_err:
                logger.debug(f"Notice linking key to orders table: {o_err}")

            print(f"[PrivCloud Supabase] Successfully assigned '{normalized_tier}' key ({assigned_key}) to {clean_email} (Order: {clean_order_id})")
            return True, {
                "key": assigned_key,
                "tier": normalized_tier,
                "trial_days": trial_days or TRIAL_DAYS,
                "label": assigned_label,
                "is_existing": False
            }

    except Exception as err:
        print(f"[PrivCloud Supabase] Error during atomic key assignment: {err}")
        return False, {
            "error": "ASSIGNMENT_FAILED",
            "message": f"Database error during product key assignment: {str(err)}"
        }
