"""
Hybrid GitHub RAG Chatbot Router.
Handles asynchronous proxying to the external RAG backend service with
multi-tier resilient LLM fallback (Groq / OpenRouter / Static KB).
"""

import os
import logging
import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from backend.config import RAG_BACKEND_URL, SUPPORT_EMAIL
from backend.schemas import ChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Chatbot"])

GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '').strip()
GROQ_MODEL = os.environ.get('GROQ_MODEL', 'openai/gpt-oss-120b').strip()
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '').strip()
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'deepseek/deepseek-chat').strip()

PRIVCLOUD_SYSTEM_PROMPT = f"""You are PrivCloud AI, the expert, friendly, and helpful product assistant for PrivCloud.
PrivCloud is a high-performance, self-hosted personal cloud storage and media server software designed natively for Windows.

Core Capabilities & Highlights:
1. 100% Zero-Telemetry & Zero-Knowledge Privacy:
   - User files and metadata stay strictly on their own local Windows machine / hardware.
   - No telemetry, no third-party data tracking, and no external storage snooping.
2. Gigabit LAN Speeds & Secure Remote HTTPS Tunnel:
   - Ultra-fast local network file transfers and media streaming leveraging full Gigabit LAN bandwidth.
   - Encrypted HTTPS remote tunnel for secure anywhere-access without complex router port forwarding or exposed public IPs.
3. In-Browser 4K Media Playback & Document Suite:
   - Seamless 4K video streaming with hardware acceleration, lossless audio playback, and integrated PDF/document viewer.
   - Client upload dropboxes allowing third parties to securely drop files with optional password protection and expiration links.
4. Transparent One-Time Lifetime Pricing (Zero Subscriptions):
   - 14-Day Free Trial: 1 drive, 100 GB storage limit, basic streaming.
   - Basic Edition: INR 1,499 (~$19) one-time lifetime license. 2 drives, 2 TB storage quota, 1080p media streaming.
   - Pro Edition: INR 2,999 (~$39) one-time lifetime license. Unlimited drives, unlimited storage quota, 4K streaming, remote HTTPS tunnel, priority updates.
5. Windows Native Deployment:
   - Delivered as a lightweight installer (`PrivCloud_Setup.exe`).
   - Desktop control panel with live resource monitoring, quota guard, and service management.
6. Support & Contact:
   - Official Support Email: {SUPPORT_EMAIL}

Guidelines:
- Be clear, concise, and friendly.
- Use markdown bolding and bullet points for clean readability.
- Answer user questions thoroughly based on PrivCloud features, architecture, and pricing.
- If asked about contacting human support, direct them to {SUPPORT_EMAIL}.
"""

def _get_static_fallback(query: str) -> str:
    """Deterministic fallback responses for PrivCloud queries when external APIs are offline."""
    q = query.lower()
    if any(k in q for k in ["feature", "key feature", "what can", "capabilities", "highlight"]):
        return (
            "**Key Features of PrivCloud**\n\n"
            "- **Zero-Telemetry & Zero-Knowledge Privacy**: Files stay strictly on your local Windows PC—no third-party cloud access or data collection.\n"
            "- **Gigabit LAN Speed**: Instant file transfers and local 4K streaming utilizing full network bandwidth.\n"
            "- **Encrypted Remote HTTPS Tunnel**: Secure remote access from anywhere without port forwarding or router modifications.\n"
            "- **In-Browser 4K Media Suite**: Stream 4K video, lossless audio, preview PDFs, and share password-protected client dropboxes.\n"
            "- **Lifetime Ownership**: One-time payment (Basic & Pro) with zero recurring monthly or yearly subscription fees.\n"
            "- **Native Windows Desktop UI**: Lightweight `PrivCloud_Setup.exe` with real-time storage metrics and Quota Guard.\n\n"
            f"Need further assistance? Reach out to support at **{SUPPORT_EMAIL}**."
        )
    if any(k in q for k in ["price", "pricing", "plan", "cost", "pro", "basic", "trial"]):
        return (
            "**PrivCloud Plans & Pricing**\n\n"
            "- **14-Day Free Trial**: Free instant activation. 1 virtual drive, 100 GB storage quota, and basic streaming.\n"
            "- **Basic Edition (₹1,499 / ~$19 Lifetime)**: 2 virtual drives, 2 TB storage limit, 1080p media streaming, and full local network sharing.\n"
            "- **Pro Edition (₹2,999 / ~$39 Lifetime)**: Unlimited virtual drives, unlimited storage, 4K streaming, encrypted remote HTTPS tunnel, and priority support.\n\n"
            "All paid licenses are **lifetime one-time purchases** with zero recurring subscription fees."
        )
    if any(k in q for k in ["install", "setup", "download", "windows"]):
        return (
            "**Installing PrivCloud**\n\n"
            "1. Download the native Windows installer (`PrivCloud_Setup.exe`) from your purchase receipt or the downloads section.\n"
            "2. Run the setup wizard to install the service and desktop control panel.\n"
            "3. Open PrivCloud, enter your license key (or activate the 14-day free trial), and configure your storage drives.\n\n"
            f"For troubleshooting or custom installations, contact **{SUPPORT_EMAIL}**."
        )
    return (
        "**PrivCloud Personal Cloud Assistant**\n\n"
        "PrivCloud is a 100% private, self-hosted cloud storage and media streaming platform for Windows with Gigabit LAN speeds and lifetime licensing.\n\n"
        "- Ask about **features**, **pricing**, **security**, or **setup**.\n"
        f"- For personalized support, email our team at **{SUPPORT_EMAIL}**."
    )

async def _generate_fallback_answer(message: str, history: list) -> str:
    """Query Groq or OpenRouter with the comprehensive PrivCloud knowledge base."""
    messages = [{"role": "system", "content": PRIVCLOUD_SYSTEM_PROMPT}]
    if history:
        for turn in history[-6:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    # 1. Try Groq API
    if GROQ_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": GROQ_MODEL or "openai/gpt-oss-120b",
                        "messages": messages,
                        "temperature": 0.3,
                        "max_tokens": 600
                    }
                )
                if res.status_code == 200:
                    ans = res.json()["choices"][0]["message"]["content"].strip()
                    if ans:
                        return ans
        except Exception as e:
            logger.warning(f"[Chatbot Fallback] Groq failed ({e}), trying OpenRouter...")

    # 2. Try OpenRouter API
    if OPENROUTER_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": OPENROUTER_MODEL or "deepseek/deepseek-chat",
                        "messages": messages,
                        "temperature": 0.3,
                        "max_tokens": 600
                    }
                )
                if res.status_code == 200:
                    ans = res.json()["choices"][0]["message"]["content"].strip()
                    if ans:
                        return ans
        except Exception as e:
            logger.warning(f"[Chatbot Fallback] OpenRouter failed ({e}), using static KB...")

    # 3. Static deterministic fallback
    return _get_static_fallback(message)

@router.post("/chat", summary="Chatbot Proxy")
async def chat_proxy(payload: ChatRequest):
    """
    Proxy endpoint to Hybrid GitHub RAG Chatbot backend with resilient multi-tier LLM fallback.
    """
    message = payload.message.strip()
    if not message:
        return JSONResponse(status_code=400, content={'error': 'Message cannot be empty.'})

    forward_payload = {
        'message': message,
        'history': payload.history or [],
        'top_k': payload.top_k or 4
    }

    rag_endpoint = f"{RAG_BACKEND_URL}/api/chat"

    # Attempt 1: Query remote RAG backend
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                rag_endpoint,
                json=forward_payload,
                headers={'Content-Type': 'application/json', 'User-Agent': 'PrivCloud-Web/1.0'}
            )
            if response.status_code == 200:
                res_data = response.json()
                answer_text = (res_data.get('answer') or res_data.get('response') or '').strip()
                lower_ans = answer_text.lower()

                # Detect canned refusals / lack of retrieval
                canned_refusals = [
                    "don't have enough details",
                    "not enough details",
                    "couldn't find that information",
                    "could not find that information",
                    "not found in the repository",
                    "not found in the documentation",
                    "does not contain information",
                    "i don't have information"
                ]

                if answer_text and not any(r in lower_ans for r in canned_refusals):
                    res_data['answer'] = answer_text
                    return JSONResponse(status_code=200, content=res_data)

                logger.info("[Chatbot] RAG returned refusal; engaging resilient fallback.")
    except Exception as e:
        logger.warning(f"[Chatbot] RAG backend unreachable ({e}); engaging resilient fallback.")

    # Attempt 2: Resilient LLM Fallback (Groq / OpenRouter / Static)
    try:
        fallback_ans = await _generate_fallback_answer(message, payload.history or [])
        return JSONResponse(status_code=200, content={
            'answer': fallback_ans,
            'provider': 'privcloud-resilient-ai',
            'fallback': True
        })
    except Exception as err:
        logger.error(f"[Chatbot] Error generating fallback answer: {err}")
        return JSONResponse(status_code=200, content={
            'answer': _get_static_fallback(message),
            'provider': 'privcloud-static-kb',
            'fallback': True
        })

@router.get("/chatbot/health", summary="Chatbot Health Check")
async def chatbot_health():
    """
    Proxy endpoint to check health status of the Hybrid RAG Backend asynchronously.
    """
    rag_health_endpoint = f"{RAG_BACKEND_URL}/api/health"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                rag_health_endpoint,
                headers={'User-Agent': 'PrivCloud-Web/1.0'}
            )
            try:
                res_data = response.json()
            except Exception:
                res_data = {'raw': response.text}
            return {
                'backend_url': RAG_BACKEND_URL,
                'status': 'online',
                'details': res_data
            }
    except Exception as e:
        return {
            'backend_url': RAG_BACKEND_URL,
            'status': 'offline',
            'error': str(e),
            'fallback_available': bool(GROQ_API_KEY or OPENROUTER_API_KEY)
        }
