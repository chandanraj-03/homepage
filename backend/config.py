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

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))
FRONTEND_DIR = os.path.abspath(os.path.join(WORKSPACE_DIR, 'frontend'))

# Load environment variables from .env
env_path = os.path.join(WORKSPACE_DIR, '.env')
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
            elif ':' in line:
                key, val = line.split(':', 1)
            else:
                continue
            k = key.strip().upper().replace(' ', '_')
            v = val.strip().strip('"').strip("'")
            os.environ[k] = v

# Supabase Configuration
SUPABASE_URL = (
    os.environ.get('SUPABASE_URL') or 
    os.environ.get('PROJECT_URL') or 
    os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or 
    'https://qrxjyvezlotjwggtgoqe.supabase.co'
).strip()

SUPABASE_KEY = (
    os.environ.get('SUPABASE_KEY') or 
    os.environ.get('SUPABASE_ANON_KEY') or 
    os.environ.get('PUBLISHABLE_KEY') or 
    os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or 
    'sb_publishable_TBuxXwl_-StgMpP1deF7zw_2Z9izNgU'
).strip()

SUPABASE_SERVICE_ROLE_KEY = (
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or
    os.environ.get('SERVICE_ROLE_KEY') or
    ''
).strip()

# Razorpay Configuration
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
