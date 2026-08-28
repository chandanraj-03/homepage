"""
User Profile and Authentication Registry for PrivCloud backed entirely by Supabase.
Handles persistent user metadata, username uniqueness validation,
email mapping, and dynamic OTP verification directly in Supabase.
"""

import re
import time
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any, Tuple
import httpx
from backend.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY,
    RESEND_FROM,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM
)

# Prefer service role key for backend operations if configured, otherwise use standard key
ACTIVE_SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY
TABLE_NAME = "Users"

# Dynamic In-Memory Registries
_ACTIVE_OTPS: Dict[str, Dict[str, Any]] = {}
_PENDING_PROFILES: Dict[str, Dict[str, Any]] = {}
OTP_EXPIRY_SECONDS = 600  # 10 minutes
MAX_VERIFY_ATTEMPTS = 5

def _get_headers(prefer: Optional[str] = None) -> Dict[str, str]:
    """Generate authenticated headers for Supabase API."""
    h = {
        "apikey": ACTIVE_SUPABASE_KEY,
        "Authorization": f"Bearer {ACTIVE_SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    if prefer:
        h["Prefer"] = prefer
    return h

def _supabase_query(params: Dict[str, str]) -> list:
    """Execute a GET query against Supabase Users table."""
    if not SUPABASE_URL or not ACTIVE_SUPABASE_KEY:
        return []
    
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{TABLE_NAME}"
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, headers=_get_headers(), params=params)
            if resp.status_code == 200:
                return resp.json()
            else:
                return []
    except Exception as e:
        print(f"[PrivCloud Supabase] Query exception: {e}")
        return []

def validate_username_format(username: str) -> Tuple[bool, str]:
    """
    Validate username format:
    - 3 to 30 characters
    - Alphanumeric, underscores, and dots
    - Cannot start or end with a dot or underscore
    - No consecutive dots or underscores
    """
    if not username:
        return False, "Username cannot be empty."
    username = username.strip()
    if len(username) < 3:
        return False, "Username must be at least 3 characters long."
    if len(username) > 30:
        return False, "Username cannot exceed 30 characters."
    if not re.match(r'^[a-zA-Z0-9._]+$', username):
        return False, "Username can only contain letters, numbers, underscores (_), and periods (.)."
    if username.startswith('.') or username.startswith('_') or username.endswith('.') or username.endswith('_'):
        return False, "Username cannot begin or end with a period or underscore."
    if '..' in username or '__' in username or '._' in username or '_.' in username:
        return False, "Username cannot contain consecutive symbols."
    return True, "Valid username format."

def is_username_available(username: str) -> bool:
    """Check if a username is available in Supabase Users table or Auth metadata (case-insensitive)."""
    key = username.strip().lower()
    
    # 1. Check Supabase public.Users table
    rows = _supabase_query({"username": f"ilike.{key}", "select": "id,username"})
    if len(rows) > 0:
        return False
        
    # 2. Check Supabase auth.users metadata
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.get(f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users", headers=_get_headers())
                if r.status_code == 200:
                    for u in r.json().get("users", []):
                        meta = u.get("user_metadata", {})
                        if (meta.get("username") or "").lower() == key:
                            return False
        except Exception:
            pass
            
    return True

def _get_taken_usernames_set() -> set:
    """Fetch all taken usernames from Supabase in a single fast query."""
    taken = set()
    rows = _supabase_query({"select": "username"})
    for r in rows:
        u = r.get("username")
        if u:
            taken.add(u.strip().lower())
            
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            with httpx.Client(timeout=4.0) as client:
                r = client.get(f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users", headers=_get_headers())
                if r.status_code == 200:
                    for u in r.json().get("users", []):
                        meta = u.get("user_metadata", {})
                        uname = meta.get("username")
                        if uname:
                            taken.add(uname.strip().lower())
        except Exception:
            pass
            
    return taken

def generate_username_suggestions(base_username: str, full_name: Optional[str] = None, limit: int = 4) -> list:
    """
    Generate smart, clean username suggestions based on user's full name and base username.
    Checks candidates against Supabase in a single fast batch to guarantee availability.
    """
    first = ""
    last = ""
    if full_name:
        clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', full_name).strip().lower()
        parts = [p for p in clean_name.split() if p]
        if len(parts) >= 2:
            first, last = parts[0], parts[-1]
        elif len(parts) == 1:
            first = parts[0]
            
    base = re.sub(r'[^a-zA-Z0-9._]', '', (base_username or "").strip().lower()).strip('._')
    
    raw_patterns = []
    if first and last:
        raw_patterns.extend([
            f"{first}_{last}",
            f"{first}{last}",
            f"{last}_{first}",
            f"{last}{first}",
            f"{first}.{last}",
            f"{last}.{first}",
            f"{first}_{last[:1]}",
            f"{first[:1]}_{last}",
            f"{first}{last[:1]}",
            f"{first[:1]}{last}"
        ])
    elif first:
        raw_patterns.extend([
            f"{first}_priv",
            f"{first}_cloud",
            f"{first}"
        ])
        
    if base:
        raw_patterns.extend([
            f"{base}_{secrets.randbelow(90) + 10}",
            f"{base}{secrets.randbelow(90) + 10}",
            f"{base}_{secrets.randbelow(900) + 100}",
            f"{base}{secrets.randbelow(900) + 100}"
        ])
        
    if first:
        raw_patterns.extend([
            f"{first}_{secrets.randbelow(90) + 10}",
            f"{first}{secrets.randbelow(90) + 10}",
            f"{first}_{secrets.randbelow(900) + 100}"
        ])

    taken = _get_taken_usernames_set()
    seen = set()
    valid_available_suggestions = []
    
    for pat in raw_patterns:
        pat = pat.strip('._')
        if not pat or pat in seen or pat == base or pat in taken:
            continue
        seen.add(pat)
        
        is_valid, _ = validate_username_format(pat)
        if is_valid:
            valid_available_suggestions.append(pat)
            if len(valid_available_suggestions) >= limit:
                break
                
    while len(valid_available_suggestions) < limit:
        seed = base or first or "user"
        cand = f"{seed}_{secrets.randbelow(9000) + 1000}"
        if cand not in seen and cand not in taken:
            seen.add(cand)
            valid_available_suggestions.append(cand)
                
    return valid_available_suggestions[:limit]

def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Retrieve user record from Supabase by username, enriched with full_name."""
    key = username.strip().lower()
    user_record = None
    rows = _supabase_query({"username": f"ilike.{key}", "select": "*"})
    if rows and len(rows) > 0:
        user_record = dict(rows[0])
        
    # Check Supabase auth users to enrich with full_name
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.get(f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users", headers=_get_headers())
                if r.status_code == 200:
                    for u in r.json().get("users", []):
                        meta = u.get("user_metadata", {})
                        if (meta.get("username") or "").lower() == key or (user_record and (u.get("email") or "").lower() == (user_record.get("email") or "").lower()):
                            full_name = meta.get("full_name") or meta.get("name")
                            if user_record:
                                user_record["full_name"] = full_name
                                return user_record
                            return {
                                "id": u.get("id"),
                                "email": u.get("email"),
                                "username": meta.get("username"),
                                "full_name": full_name
                            }
        except Exception:
            pass
            
    return user_record

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieve user record from Supabase by email, enriched with full_name."""
    key = email.strip().lower()
    user_record = None
    rows = _supabase_query({"email": f"ilike.{key}", "select": "*"})
    if rows and len(rows) > 0:
        user_record = dict(rows[0])
        
    # Check Supabase auth users to enrich with full_name
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.get(f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users", headers=_get_headers())
                if r.status_code == 200:
                    for u in r.json().get("users", []):
                        if (u.get("email") or "").lower() == key:
                            meta = u.get("user_metadata", {})
                            full_name = meta.get("full_name") or meta.get("name")
                            if user_record:
                                user_record["full_name"] = full_name
                                return user_record
                            return {
                                "id": u.get("id"),
                                "email": u.get("email"),
                                "username": meta.get("username") or key.split('@')[0],
                                "full_name": full_name
                            }
        except Exception:
            pass
            
    return user_record

def resolve_identifier(identifier: str) -> Optional[Dict[str, Any]]:
    """
    Resolve an identifier (either email or username) to the user record in Supabase.
    """
    if not identifier:
        return None
    ident = identifier.strip()
    if '@' in ident:
        return get_user_by_email(ident)
    return get_user_by_username(ident)

def sync_user_to_supabase_table(email: str, username: Optional[str] = None, full_name: Optional[str] = None, user_id: Optional[str] = None) -> bool:
    """
    Persist user data (id, email, username, version) into the Supabase 'Users' table.
    """
    if not SUPABASE_URL or not ACTIVE_SUPABASE_KEY:
        return False

    e_key = email.strip().lower()
    target_id = user_id
    target_username = username
    target_full_name = full_name

    headers = _get_headers(prefer="resolution=merge-duplicates,return=representation")

    try:
        with httpx.Client(timeout=10.0) as client:
            # If user_id or username missing, retrieve from Supabase Auth admin API
            if not target_id or not target_username:
                r_auth = client.get(f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users", headers=_get_headers())
                if r_auth.status_code == 200:
                    for u in r_auth.json().get("users", []):
                        if (u.get("email") or "").lower() == e_key:
                            target_id = target_id or u.get("id")
                            meta = u.get("user_metadata", {})
                            target_username = target_username or meta.get("username") or _PENDING_PROFILES.get(e_key, {}).get("username") or e_key.split('@')[0]
                            target_full_name = target_full_name or meta.get("full_name") or _PENDING_PROFILES.get(e_key, {}).get("full_name")
                            break

            # If still missing from auth (pending verification), use pending profile
            if not target_username and e_key in _PENDING_PROFILES:
                target_username = _PENDING_PROFILES[e_key].get("username")

            if target_id and target_username:
                payload = {
                    "id": target_id,
                    "email": e_key,
                    "username": target_username.strip(),
                    "version": "1.0.0"
                }
                r_post = client.post(f"{SUPABASE_URL.rstrip('/')}/rest/v1/{TABLE_NAME}", headers=headers, json=payload)
                if r_post.status_code in (200, 201):
                    print(f"[PrivCloud Supabase] Successfully persisted user in Users table: {e_key} -> @{target_username}")
                    return True
                else:
                    print(f"[PrivCloud Supabase] Insert into Users table returned ({r_post.status_code}): {r_post.text}")
    except Exception as e:
        print(f"[PrivCloud Supabase] Exception syncing to Users table: {e}")

    return False

def register_user(full_name: str, username: str, email: str, is_verified: bool = False, password: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Validate and prepare profile for Supabase Auth registration.
    Ensures uniqueness of both username and email.
    """
    valid_format, msg = validate_username_format(username)
    if not valid_format:
        return False, msg, None

    u_key = username.strip().lower()
    e_key = email.strip().lower()

    # 1. Check if username is already taken by a different email
    existing_by_user = get_user_by_username(u_key)
    if existing_by_user:
        if existing_by_user.get("email", "").lower() != e_key:
            return False, "This username is already taken. Please choose another.", None
        return True, "Profile already registered.", existing_by_user

    # 2. Check if email is already taken by a different username
    existing_by_email = get_user_by_email(e_key)
    if existing_by_email:
        if existing_by_email.get("username", "").lower() != u_key:
            return False, "This email address is already associated with another account.", None
        return True, "Profile already registered.", existing_by_email

    # Cache pending profile
    _PENDING_PROFILES[e_key] = {
        "full_name": full_name.strip(),
        "username": username.strip(),
        "email": e_key
    }

    return True, "Profile verified and ready for registration.", {
        "email": e_key,
        "username": username.strip(),
        "full_name": full_name.strip()
    }

def mark_user_verified(email: str, username: Optional[str] = None) -> bool:
    """Mark user account as verified and persist in Supabase Users table."""
    e_key = email.strip().lower()
    u_name = username or _PENDING_PROFILES.get(e_key, {}).get("username")
    f_name = _PENDING_PROFILES.get(e_key, {}).get("full_name")
    
    return sync_user_to_supabase_table(email=e_key, username=u_name, full_name=f_name)

# ----------------------------------------------------
# Dynamic Cryptographic OTP & Resend Engine
# ----------------------------------------------------
def _dispatch_otp_email(email: str, code: str) -> None:
    """Send OTP via Resend API or SMTP if configured."""
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #eaeaea; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 22px;">PrivCloud Verification</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Sign in or complete account registration</p>
        </div>
        <p style="color: #334155; font-size: 15px; margin-bottom: 20px;">Your 6-digit confirmation code is:</p>
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 18px; text-align: center; border-radius: 10px; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0284c7; font-family: monospace;">
            {code}
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px; margin-bottom: 0;">This code is valid for 10 minutes and can only be used once. If you did not request this, please ignore this email.</p>
    </div>
    """

    if RESEND_API_KEY:
        try:
            resend_url = "https://api.resend.com/emails"
            resend_payload = {
                "from": RESEND_FROM,
                "to": [email],
                "subject": f"Your PrivCloud Verification Code: {code}",
                "html": html_content
            }
            resend_headers = {
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            }
            with httpx.Client(timeout=10.0) as client:
                r = client.post(resend_url, headers=resend_headers, json=resend_payload)
                if r.status_code in (200, 201):
                    print(f"[PrivCloud Resend] Verification email sent to {email}")
        except Exception as e:
            print(f"[PrivCloud Resend] Resend dispatch exception: {e}")

    if SMTP_HOST and SMTP_USER and SMTP_PASS:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Your PrivCloud Verification Code: {code}"
            msg["From"] = SMTP_FROM
            msg["To"] = email
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10.0) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_FROM, [email], msg.as_string())
        except Exception as e:
            print(f"[PrivCloud Mailer] SMTP delivery exception: {e}")

def generate_user_otp(email: str) -> str:
    """
    Generate a cryptographically random dynamic 6-digit numeric OTP for email,
    store it with a 10-minute expiry, and dispatch it.
    """
    e_key = email.strip().lower()
    code = f"{secrets.randbelow(900000) + 100000}"
    now = time.time()
    _ACTIVE_OTPS[e_key] = {
        "code": code,
        "expires_at": now + OTP_EXPIRY_SECONDS,
        "attempts": 0,
        "created_at": now
    }
    _dispatch_otp_email(e_key, code)
    return code

def verify_user_otp(email: str, code: str) -> Tuple[bool, str]:
    """
    Verify the dynamic 6-digit OTP for the specified email.
    """
    if not code or len(code.strip()) != 6 or not code.strip().isdigit():
        return False, "OTP code must be exactly 6 digits."
    
    e_key = email.strip().lower()
    otp_record = _ACTIVE_OTPS.get(e_key)
    
    if not otp_record:
        return False, "No active confirmation code found for this email. Please click 'Resend Code'."
    
    now = time.time()
    if now > otp_record.get("expires_at", 0):
        _ACTIVE_OTPS.pop(e_key, None)
        return False, "Confirmation code has expired. Please click 'Resend Code' to receive a new one."
    
    if otp_record.get("attempts", 0) >= MAX_VERIFY_ATTEMPTS:
        _ACTIVE_OTPS.pop(e_key, None)
        return False, "Too many invalid attempts. Please request a new confirmation code."
    
    stored_code = otp_record.get("code")
    clean_input_code = code.strip()
    
    if secrets.compare_digest(clean_input_code, stored_code):
        _ACTIVE_OTPS.pop(e_key, None)
        mark_user_verified(email=e_key)
        return True, "OTP verified successfully."
    else:
        otp_record["attempts"] = otp_record.get("attempts", 0) + 1
        remaining = MAX_VERIFY_ATTEMPTS - otp_record["attempts"]
        if remaining <= 0:
            _ACTIVE_OTPS.pop(e_key, None)
            return False, "Too many invalid attempts. Please request a new confirmation code."
        return False, f"Invalid confirmation code. {remaining} attempt(s) remaining."

