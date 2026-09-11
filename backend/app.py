"""
PrivCloud Clean FastAPI Server Entrypoint & Master Orchestrator.
Connects all domain-specific routers (pages, auth, chatbot, payments),
configures CORS middleware, serves static frontend assets, and starts the ASGI server.
"""

import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend and workspace directories are accessible in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))
for path in (BASE_DIR, WORKSPACE_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

from backend.config import FRONTEND_DIR, ALLOWED_ORIGINS
from backend.routers import pages_router, auth_router, chatbot_router, payments_router, feedback_router, support_router

# Initialize FastAPI application
app = FastAPI(
    title="PrivCloud Backend",
    description="High-performance ASGI backend for PrivCloud with AI Chatbot RAG, Supabase, and Razorpay integrations.",
    version="3.0.0"
)

# Enable CORS middleware with strictly defined allowed origins and automatic Vercel domain support
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https:\/\/([a-zA-Z0-9_\-]+\.)*vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", summary="Backend Health Check", tags=["System"])
async def health_check():
    """Health check endpoint for Render, container orchestrators, and uptime monitors."""
    return {
        "status": "healthy",
        "service": "PrivCloud Backend",
        "version": "3.0.0"
    }

# ----------------- Connect Modular Routers -----------------
# 1. Page Routes (/, /auth, /product, /purchase, /login, /register, /feedback, /support, etc.)
app.include_router(pages_router)

# 2. Authentication & Config API (/api/config, /api/auth/validate-email)
app.include_router(auth_router)

# 3. Hybrid RAG Chatbot Proxy API (/api/chat, /api/chatbot/health)
app.include_router(chatbot_router)

# 4. Razorpay Payment API (/api/create-order, /api/verify-payment)
app.include_router(payments_router)

# 5. Community Feedback & Suggestions API (/api/feedback)
app.include_router(feedback_router)

# 6. Customer Support Render Proxy API (/api/support)
app.include_router(support_router)

# ----------------- Secure Static Asset Serving -----------------
_STATIC_INDEX: dict[str, str] = {}

def _init_static_index() -> None:
    """Pre-compute index of all files in FRONTEND_DIR for O(1) lookup."""
    global _STATIC_INDEX
    _STATIC_INDEX = {}
    if not os.path.isdir(FRONTEND_DIR):
        return
    for root, _, files in os.walk(FRONTEND_DIR):
        for f in files:
            full = os.path.abspath(os.path.join(root, f))
            rel = os.path.relpath(full, FRONTEND_DIR).replace('\\', '/')
            _STATIC_INDEX[rel] = full
            if f not in _STATIC_INDEX:
                _STATIC_INDEX[f] = full

_init_static_index()

@app.get("/{filename:path}", include_in_schema=False)
async def serve_static_asset(filename: str):
    """
    Serve static assets (CSS, JS, media) from FRONTEND_DIR safely with O(1) lookup
    and path traversal protection.
    """
    # 1. Path traversal guard
    clean_name = os.path.normpath(filename).replace('\\', '/').lstrip('/')
    if '..' in clean_name.split('/'):
        raise HTTPException(status_code=403, detail="Access denied")

    target = os.path.abspath(os.path.join(FRONTEND_DIR, clean_name))
    file_to_send = None

    # Check direct path within FRONTEND_DIR
    if os.path.commonpath([FRONTEND_DIR, target]) == FRONTEND_DIR and os.path.isfile(target):
        file_to_send = target
    else:
        # Check indexed static assets with strict bounds checking
        indexed = _STATIC_INDEX.get(clean_name) or _STATIC_INDEX.get(os.path.basename(clean_name))
        if indexed and os.path.isfile(indexed) and os.path.commonpath([FRONTEND_DIR, os.path.realpath(indexed)]) == FRONTEND_DIR:
            file_to_send = indexed

    if file_to_send:
        response = FileResponse(file_to_send)
        if file_to_send.endswith(('.js', '.css', '.html')):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response

    raise HTTPException(status_code=404, detail="File not found")

# ----------------- Server Entrypoint -----------------
if __name__ == '__main__':
    import uvicorn
    # Render assigns port dynamically via environment variable 'PORT'
    port = int(os.environ.get('PORT', 5001))
    debug_mode = os.environ.get('RENDER') is None  # Debug reload locally, not in production
    
    print("\n" + "=" * 55)
    print("🚀 PrivCloud Clean Modular FastAPI Server running!")
    print(f"🔗 Local App URL:   http://localhost:{port}")
    print(f"📖 Swagger Docs:    http://localhost:{port}/docs")
    print(f"📚 ReDoc Specs:     http://localhost:{port}/redoc")
    print("=" * 55 + "\n")
    
    uvicorn.run("backend.app:app", host='0.0.0.0', port=port, reload=debug_mode, reload_dirs=[BASE_DIR, WORKSPACE_DIR])

