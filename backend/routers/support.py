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
    Strictly enforces that the user must be a verified purchaser of Basic or Pro license.
    """
    if not payload.email or not payload.email.strip() or "@" not in payload.email:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in with your purchase account to access Customer Support."
        )

    clean_email = payload.email.strip().lower()
    
    # Verify purchase eligibility (must be basic or pro buyer)
    elig_res = await verify_eligibility(clean_email)
    if getattr(elig_res, "status_code", None) == 403 or (isinstance(elig_res, dict) and not elig_res.get("eligible")):
        raise HTTPException(
            status_code=403,
            detail="Customer Support is exclusively reserved for verified Basic and Pro license owners. Please purchase a license to unlock live support."
        )

    clean_name = payload.name or clean_email.split("@")[0].title()
    
    body = {
        "name": clean_name,
        "email": clean_email,
        "external_customer_id": payload.external_customer_id or f"priv_{clean_email.replace('@', '_').replace('.', '_')}"
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
            if res.status_code in (401, 403, 404) and payload.email:
                clean_email = payload.email.strip().lower()
                clean_name = payload.name or clean_email.split("@")[0].title()
                session_body = {
                    "name": clean_name,
                    "email": clean_email,
                    "external_customer_id": payload.external_customer_id or f"priv_{clean_email.replace('@', '_').replace('.', '_')}"
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

