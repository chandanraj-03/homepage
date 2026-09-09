"""
Centralized Configuration and Client Initializations for PrivCloud Backend.
Handles environment variables, directory paths, and third-party SDK clients (Supabase, Razorpay).
"""

import os
import sys

# Ensure safe UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from dotenv import load_dotenv

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))
FRONTEND_DIR = os.path.abspath(os.path.join(WORKSPACE_DIR, 'frontend'))

# Load environment variables from .env using standard python-dotenv
env_path = os.path.join(WORKSPACE_DIR, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path, override=False)

# Supabase Configuration (Strictly from Environment)
SUPABASE_URL = (
    os.environ.get('SUPABASE_URL') or 
    os.environ.get('PROJECT_URL') or 
    os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or 
    ''
).strip()

SUPABASE_KEY = (
    os.environ.get('SUPABASE_KEY') or 
    os.environ.get('SUPABASE_ANON_KEY') or 
    os.environ.get('PUBLISHABLE_KEY') or 
    os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or 
    ''
).strip()

SUPABASE_SERVICE_ROLE_KEY = (
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or
    os.environ.get('SERVICE_ROLE_KEY') or
    ''
).strip()

# Prefer service role key for backend operations if configured, otherwise use standard anon key
ACTIVE_SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY

# Fail-fast notice if critical credentials are not configured
if not SUPABASE_URL:
    print("[PrivCloud Config] WARNING: SUPABASE_URL is not set in environment variables.")
if not SUPABASE_KEY:
    print("[PrivCloud Config] WARNING: SUPABASE_KEY is not set in environment variables.")

# Centralized Plan to Tier Mapping
PLAN_TO_TIER_MAP = {
    'trial': 'TRIAL',
    'free': 'TRIAL',
    'free_trial': 'TRIAL',
    'free-trial': 'TRIAL',
    '9a8f10e7b9c2d4a6': 'TRIAL',
    'basic': 'BASIC',
    '4d9e1a7b0c3f8e2a': 'BASIC',
    'pro': 'PRO',
    '6b2f8c1a9d4e07bf': 'PRO'
}

def get_supabase_headers(prefer: str | None = None) -> dict[str, str]:
    """Generate authenticated headers for Supabase REST and Admin API requests."""
    h = {
        "apikey": ACTIVE_SUPABASE_KEY,
        "Authorization": f"Bearer {ACTIVE_SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    if prefer:
        h["Prefer"] = prefer
    return h

# Support & Contact Configuration
SUPPORT_EMAIL = os.environ.get('SUPPORT_EMAIL', 'privcloud0@gmail.com').strip()

# CORS Allowed Origins
ALLOWED_ORIGINS_RAW = os.environ.get(
    'ALLOWED_ORIGINS',
    'http://localhost:5001,http://127.0.0.1:5001,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000,http://127.0.0.1:8000,https://privcloud.io'
).strip()
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS_RAW.split(',') if o.strip()]
for origin in ('null', 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000', 'http://127.0.0.1:8000'):
    if origin not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(origin)

# Razorpay Configuration
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '').strip()
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '').strip()

razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        import razorpay
        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry

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
        razorpay_client = client
        print("[PrivCloud] Resilient Razorpay client initialized on backend.")
    except Exception as e:
        print(f"[PrivCloud] Razorpay client could not be initialized: {e}")
else:
    print("[PrivCloud] Razorpay credentials missing in environment variables.")

# Free Trial Duration Configuration
TRIAL_DAYS = int(os.environ.get('TRIAL_DAYS', '14'))

# Product Download URL (Supabase Windows Installer)
PRODUCT_DOWNLOAD_URL = (
    os.environ.get('PRODUCT_DOWNLOAD_URL') or
    os.environ.get('PRODUCT_URL') or
    'https://qrxjyvezlotjwggtgoqe.supabase.co/storage/v1/object/public/assets/PrivCloud_Setup.exe'
).strip()


# Hybrid GitHub RAG Backend Configuration
RAG_BACKEND_URL = os.environ.get('RAG_BACKEND_URL', 'https://hybrid-github-rag-backend.onrender.com').strip().rstrip('/')

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

# Optional Resend API Email Dispatch Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '').strip()
RESEND_FROM = os.environ.get('RESEND_FROM', 'PrivCloud <onboarding@resend.dev>').strip()

# Optional SMTP Email Dispatch Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.resend.com' if RESEND_API_KEY else '').strip()
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587')) if os.environ.get('SMTP_PORT') else 587
SMTP_USER = os.environ.get('SMTP_USER', os.environ.get('MAIL_USERNAME', 'resend' if RESEND_API_KEY else '')).strip()
SMTP_PASS = os.environ.get('SMTP_PASS', os.environ.get('MAIL_PASSWORD', RESEND_API_KEY or '')).strip()
SMTP_FROM = os.environ.get('SMTP_FROM', RESEND_FROM if RESEND_API_KEY else 'noreply@privcloud.io').strip()

def is_allowed_email_domain(email: str) -> bool:
    """Check if email domain belongs to the strict allowlist."""
    if not email or '@' not in email:
        return False
    domain = email.split('@')[-1].lower().strip()
    return domain in ALLOWED_EMAIL_DOMAINS
