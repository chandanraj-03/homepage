"""
FastAPI Backend Proxy Router for Render Customer Support Chat API.
Proxies requests from browser clients to https://support-chat-api.onrender.com
to guarantee 100% CORS compatibility and seamless message delivery.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, Header, UploadFile, File, Form
import httpx

from backend.routers.feedback import verify_eligibility

SUPPORT_API_BASE = "https://support-chat-api.onrender.com"

router = APIRouter(prefix="/api/support", tags=["Customer Support Proxy"])

class ProxySessionRequest(BaseModel):
    name: Optional[str] = "Customer"
    email: Optional[str] = None
    external_customer_id: Optional[str] = None

class ProxySendMessageRequest(BaseModel):
    conversation_id: str
    access_token: str
    content: Optional[str] = Field(default="", max_length=5000)
    attachment: Optional[Dict[str, Any]] = None
    email: Optional[str] = None
    name: Optional[str] = None
    external_customer_id: Optional[str] = None

@router.post("/session", summary="Create or Resume Customer Session on Render")
async def proxy_customer_session(payload: ProxySessionRequest):
    """
    Proxies session creation to https://support-chat-api.onrender.com/api/v1/customer/session
    Resolves customer tier (Pro VIP, Basic, or Community Support) and guarantees seamless access.
    """
    clean_email = None
    if payload.email and payload.email.strip() and "@" in payload.email:
        clean_email = payload.email.strip().lower()

    # Determine customer tier & badge
    tier_prefix = "[🛡️ Customer]"
    if clean_email:
        try:
            elig_res = await verify_eligibility(clean_email)
            if isinstance(elig_res, dict) and elig_res.get("eligible"):
                plan = elig_res.get("plan_tier", "").lower()
                if plan == "pro" or elig_res.get("is_vip"):
                    tier_prefix = "[👑 Pro VIP]"
                elif plan == "basic":
                    tier_prefix = "[⭐ Basic]"
        except Exception:
            pass

    raw_name = (payload.name or (clean_email.split("@")[0].title() if clean_email else "Valued Customer")).strip()
    # Remove existing prefixes if already included
    for prefix in ("[👑 Pro VIP]", "[⭐ Basic]", "[🛡️ Customer]", "[💬 Visitor]"):
        if raw_name.startswith(prefix):
            raw_name = raw_name[len(prefix):].strip()

    formatted_name = f"{tier_prefix} {raw_name}".strip()
    
    ext_id = payload.external_customer_id
    if not ext_id:
        if clean_email:
            ext_id = f"priv_{clean_email.replace('@', '_').replace('.', '_')}"
        else:
            ext_id = f"guest_{raw_name.lower().replace(' ', '_')}"

    body = {
        "name": formatted_name,
        "email": clean_email,
        "external_customer_id": ext_id
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{SUPPORT_API_BASE}/api/v1/customer/session",
                json=body
            )
            if res.status_code in (200, 201):
                data = res.json()
                data["tier_prefix"] = tier_prefix
                return data
            else:
                raise HTTPException(status_code=res.status_code, detail=res.text)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Support Chat API on Render: {exc}")

@router.post("/send", summary="Send Customer Message to Render")
async def proxy_send_message(payload: ProxySendMessageRequest):
    """
    Proxies message dispatch to https://support-chat-api.onrender.com/api/v1/customer/conversations/{conv_id}/messages
    Supports optional text and optional image attachment payload.
    Auto-recovers fresh session if conversation was deleted or expired on Render.
    """
    headers = {
        "Authorization": f"Bearer {payload.access_token}",
        "Content-Type": "application/json"
    }

    msg_body: Dict[str, Any] = {
        "content": payload.content or ""
    }
    if payload.attachment:
        msg_body["attachment"] = payload.attachment

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{SUPPORT_API_BASE}/api/v1/customer/conversations/{payload.conversation_id}/messages",
                headers=headers,
                json=msg_body
            )
            if res.status_code in (200, 201):
                return res.json()

            # If conversation was deleted on Render (404) or token expired (401/403), auto-heal
            if res.status_code in (401, 403, 404):
                clean_email = payload.email.strip().lower() if (payload.email and payload.email.strip()) else None
                clean_name = (payload.name or (clean_email.split("@")[0].title() if clean_email else "Valued Customer")).strip()
                ext_id = payload.external_customer_id or (f"priv_{clean_email.replace('@', '_').replace('.', '_')}" if clean_email else f"guest_{clean_name.lower().replace(' ', '_')}")
                session_body = {
                    "name": clean_name,
                    "email": clean_email,
                    "external_customer_id": ext_id
                }
                sess_res = await client.post(
                    f"{SUPPORT_API_BASE}/api/v1/customer/session",
                    json=session_body
                )
                if sess_res.status_code in (200, 201):
                    fresh_sess = sess_res.json()
                    fresh_token = fresh_sess.get("access_token")
                    fresh_cid = fresh_sess.get("conversation_id")
                    if fresh_token and fresh_cid:
                        retry_headers = {
                            "Authorization": f"Bearer {fresh_token}",
                            "Content-Type": "application/json"
                        }
                        retry_res = await client.post(
                            f"{SUPPORT_API_BASE}/api/v1/customer/conversations/{fresh_cid}/messages",
                            headers=retry_headers,
                            json=msg_body
                        )
                        if retry_res.status_code in (200, 201):
                            data = retry_res.json()
                            data["fresh_session"] = fresh_sess
                            return data

            raise HTTPException(status_code=res.status_code, detail=res.text)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to send message to Support Chat API on Render: {exc}")

@router.get("/messages", summary="Fetch Conversation Messages from Render")
async def proxy_get_messages(
    conversation_id: str = Query(..., description="Active conversation ID"),
    access_token: str = Query(..., description="Customer JWT access token")
):
    """
    Proxies message retrieval from https://support-chat-api.onrender.com/api/v1/customer/conversations/{conv_id}/messages
    """
    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                f"{SUPPORT_API_BASE}/api/v1/customer/conversations/{conversation_id}/messages",
                headers=headers
            )
            if res.status_code == 200:
                return res.json()
            else:
                raise HTTPException(status_code=res.status_code, detail=res.text)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch messages from Support Chat API on Render: {exc}")

@router.post("/upload", summary="Proxy Customer Image Upload to Render Support API")
async def proxy_upload_file(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    """
    Proxies multipart image upload to https://support-chat-api.onrender.com/api/v1/files
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    clean_token = authorization.replace("Bearer ", "").strip()
    headers = {
        "Authorization": f"Bearer {clean_token}"
    }

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller")

    files = {
        "upload": (file.filename or "attachment.png", file_bytes, file.content_type or "image/png")
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{SUPPORT_API_BASE}/api/v1/files",
                headers=headers,
                files=files
            )
            if res.status_code in (200, 201):
                return res.json()
            else:
                raise HTTPException(status_code=res.status_code, detail=res.text)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to upload image to Render Support API: {exc}")

@router.get("/status", summary="Check Customer Support Conversation Status and Attachment Permission")
async def proxy_get_status(
    email: str = Query(..., description="Customer email address"),
    name: Optional[str] = Query(None, description="Customer name"),
    external_customer_id: Optional[str] = Query(None, description="External customer ID")
):
    """
    Checks the latest status and attachment permission for customer's active conversation.
    """
    clean_email = email.strip().lower()
    clean_name = name or clean_email.split("@")[0].title()
    body = {
        "name": clean_name,
        "email": clean_email,
        "external_customer_id": external_customer_id or f"priv_{clean_email.replace('@', '_').replace('.', '_')}"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{SUPPORT_API_BASE}/api/v1/customer/session",
                json=body
            )
            if res.status_code in (200, 201):
                return res.json()
            else:
                raise HTTPException(status_code=res.status_code, detail=res.text)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to query status from Support API on Render: {exc}")

