"""
Frontend HTML Page Serving Router.
Serves landing page, unified auth, product architecture, and checkout/purchase pages.
"""

import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from backend.config import FRONTEND_DIR

router = APIRouter(tags=["Pages"])

@router.get("/", summary="Serve Landing Page")
async def serve_index():
    """Serve landing page."""
    index_path = os.path.join(FRONTEND_DIR, 'index.html')
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="index.html not found")

@router.get("/login", summary="Serve Auth Page")
@router.get("/register", summary="Serve Auth Page")
@router.get("/auth", summary="Serve Auth Page")
@router.get("/auth.html", summary="Serve Auth Page")
async def serve_auth():
    """Serve unified dynamic authentication page."""
    auth_path = os.path.join(FRONTEND_DIR, 'auth_page', 'auth.html')
    if os.path.isfile(auth_path):
        return FileResponse(auth_path)
    raise HTTPException(status_code=404, detail="auth.html not found")

@router.get("/product", summary="Serve Product Page")
async def serve_product():
    """Serve product and architecture page."""
    prod_path = os.path.join(FRONTEND_DIR, 'product_page', 'product.html')
    if os.path.isfile(prod_path):
        return FileResponse(prod_path)
    raise HTTPException(status_code=404, detail="product.html not found")

@router.get("/purchase", summary="Serve Purchase Page")
@router.get("/checkout", summary="Serve Purchase Page")
async def serve_purchase():
    """Serve purchase and license activation page."""
    purch_path = os.path.join(FRONTEND_DIR, 'purchase_page', 'purchase.html')
    if os.path.isfile(purch_path):
        return FileResponse(purch_path)
    raise HTTPException(status_code=404, detail="purchase.html not found")

@router.get("/about", summary="Serve About / Demo Page")
@router.get("/demo", summary="Serve Product Demo Page")
@router.get("/product-demo", summary="Serve Product Demo Page")
@router.get("/product_demo", summary="Serve Product Demo Page")
@router.get("/demo.html", summary="Serve Product Demo Page")
async def serve_demo():
    """Serve product demo and installation instructions page."""
    demo_path = os.path.join(FRONTEND_DIR, 'demo_page', 'demo.html')
    if os.path.isfile(demo_path):
        return FileResponse(demo_path)
    raise HTTPException(status_code=404, detail="demo.html not found")

@router.get("/feedback", summary="Serve Dedicated Feedback & Roadmap Page")
@router.get("/feedback.html", summary="Serve Dedicated Feedback & Roadmap Page")
async def serve_feedback():
    """Serve dedicated community feedback, verified buyer reviews, and suggestions page."""
    feedback_path = os.path.join(FRONTEND_DIR, 'feedback_page', 'feedback.html')
    if os.path.isfile(feedback_path):
        return FileResponse(feedback_path)
    raise HTTPException(status_code=404, detail="feedback.html not found")

@router.get("/support", summary="Serve Dedicated Customer Support Desk")
@router.get("/support.html", summary="Serve Dedicated Customer Support Desk")
async def serve_support():
    """Serve dedicated customer support desk page."""
    support_path = os.path.join(FRONTEND_DIR, 'support_page', 'customer_support.html')
    if os.path.isfile(support_path):
        return FileResponse(support_path)
    return RedirectResponse(url="/purchase", status_code=302)

