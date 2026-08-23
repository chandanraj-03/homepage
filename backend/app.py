import os
import socket
from flask import Flask, send_from_directory

# Get absolute path to frontend folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))

app = Flask(__name__, static_folder=FRONTEND_DIR)

def get_local_ip():
    """Retrieve local Wi-Fi IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(FRONTEND_DIR, filename)

if __name__ == '__main__':
    port = 5001
    local_ip = get_local_ip()
    
    print("\n" + "=" * 55)
    print("🚀 PrivCloud Flask Server is running!")
    print(f"💻 On your Laptop: http://localhost:{port}")
    print(f"📱 On your Mobile: http://{local_ip}:{port}")
    print("=" * 55 + "\n")
    
    # host='0.0.0.0' allows connections from any device on your Wi-Fi network
    app.run(host='0.0.0.0', port=port, debug=True)
