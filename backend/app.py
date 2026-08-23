import os
from flask import Flask, send_from_directory, request, jsonify

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ[key.strip()] = val.strip()

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')

supabase_client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase client initialized on backend.")
    except Exception as e:
        print(f"⚠️ Supabase python client could not be initialized: {e}")

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

@app.route('/api/config', methods=['GET'])
def get_config():
    """Dynamically serve public runtime config without exposing in static files."""
    return jsonify({
        'supabaseUrl': SUPABASE_URL,
        'supabaseKey': SUPABASE_KEY
    })

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
