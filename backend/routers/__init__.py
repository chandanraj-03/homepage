"""
Routers package for PrivCloud FastAPI Backend.
"""
from .pages import router as pages_router
from .auth import router as auth_router
from .chatbot import router as chatbot_router
from .payments import router as payments_router
from .feedback import router as feedback_router
from .support import router as support_router

__all__ = ["pages_router", "auth_router", "chatbot_router", "payments_router", "feedback_router", "support_router"]
