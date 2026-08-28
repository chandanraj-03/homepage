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

from backend.config import FRONTEND_DIR
from backend.routers import pages_router, auth_router, chatbot_router, payments_router

# Initialize FastAPI application
app = FastAPI(
    title="PrivCloud Backend",
    description="High-performance ASGI backend for PrivCloud with AI Chatbot RAG, Supabase, and Razorpay integrations.",
    version="3.0.0"
)

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Connect Modular Routers -----------------
# 1. Page Routes (/, /auth, /product, /purchase, /login, /register, etc.)
app.include_router(pages_router)

# 2. Authentication & Config API (/api/config, /api/auth/validate-email)
app.include_router(auth_router)

# 3. Hybrid RAG Chatbot Proxy API (/api/chat, /api/chatbot/health)
app.include_router(chatbot_router)

# 4. Razorpay Payment API (/api/create-order, /api/verify-payment)
app.include_router(payments_router)

# ----------------- Dynamic Static Asset Route -----------------
@app.get("/{filename:path}", include_in_schema=False)
async def serve_static_asset(filename: str):
    """
    Serve static assets (CSS, JS, media) from FRONTEND_DIR or nested subdirectories.
    Placed after all explicit API and page routers.
    """
    target = os.path.join(FRONTEND_DIR, filename)
    if os.path.exists(target) and os.path.isfile(target):
        return FileResponse(target)

    # Fallback search nested subdirectories (auth_page, landing_page, etc.)
    base_name = os.path.basename(filename)
    if base_name:
        for root, dirs, files in os.walk(FRONTEND_DIR):
            if base_name in files:
                found_target = os.path.join(root, base_name)
                if os.path.isfile(found_target):
                    return FileResponse(found_target)

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
    
    uvicorn.run("backend.app:app", host='0.0.0.0', port=port, reload=debug_mode)
