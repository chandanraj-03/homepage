"""
Hybrid GitHub RAG Chatbot Router.
Handles asynchronous proxying to the external RAG backend service.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse
import httpx
from backend.config import RAG_BACKEND_URL
from backend.schemas import ChatRequest

router = APIRouter(prefix="/api", tags=["Chatbot"])

@router.post("/chat", summary="Chatbot Proxy")
async def chat_proxy(payload: ChatRequest):
    """
    Proxy endpoint to Hybrid GitHub RAG Chatbot backend.
    Forwards user query, conversation history, and retrieval configuration asynchronously.
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
    
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                rag_endpoint,
                json=forward_payload,
                headers={'Content-Type': 'application/json', 'User-Agent': 'PrivCloud-Web/1.0'}
            )
            try:
                res_data = response.json()
            except Exception:
                res_data = {'raw': response.text}
            return JSONResponse(status_code=response.status_code, content=res_data)
            
    except httpx.HTTPStatusError as e:
        try:
            err_json = e.response.json()
            detail = err_json.get('detail') or err_json.get('message') or str(e)
        except Exception:
            detail = e.response.text
        return JSONResponse(
            status_code=e.response.status_code,
            content={
                'error': 'RAG Backend service error',
                'detail': detail,
                'status_code': e.response.status_code
            }
        )
        
    except (httpx.ConnectError, httpx.ConnectTimeout) as e:
        return JSONResponse(
            status_code=503,
            content={
                'error': f'Failed to connect to RAG backend at {RAG_BACKEND_URL}',
                'detail': str(e)
            }
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                'error': 'Unexpected error processing chat request',
                'detail': str(e)
            }
        )

@router.get("/chatbot/health", summary="Chatbot Health Check")
async def chatbot_health():
    """
    Proxy endpoint to check health status of the Hybrid RAG Backend asynchronously.
    """
    rag_health_endpoint = f"{RAG_BACKEND_URL}/api/health"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
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
            'error': str(e)
        }
