import os
from flask import Flask, send_from_directory, request, jsonify

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
    return send_from_directory(FRONTEND_DIR, 'auth.html')

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
