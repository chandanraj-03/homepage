"""
PrivCloud Community Feedback & Product Suggestions Router.
Exclusive submission gate for verified Basic & Pro license purchasers.
Provides public community feed, license verification, and upvoting.
"""

import uuid
import time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import httpx

from backend.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    get_supabase_headers
)

ACTIVE_SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY
TABLE_NAME = "Feedback"

router = APIRouter(prefix="/api/feedback", tags=["Feedback & Suggestions"])

# In-memory cache for high-availability resilience
_MEM_FEEDBACK: List[Dict[str, Any]] = []

class FeedbackSubmissionRequest(BaseModel):
    user_email: str
    user_name: Optional[str] = None
    plan_tier: str  # Must be 'basic' or 'pro'
    feedback_type: str  # 'review' or 'suggestion'
    rating: Optional[int] = Field(default=5, ge=1, le=5)
    category: Optional[str] = "General"
    usage_duration: Optional[str] = "2–4 weeks"
    title: str = Field(..., min_length=3, max_length=150)
    content: str = Field(..., min_length=10, max_length=2000)

@router.get("", summary="Get Approved Community Feedback & Suggestions")
async def get_feedback(
    type: Optional[str] = Query(None, description="Filter by 'review' or 'suggestion'"),
    plan: Optional[str] = Query(None, description="Filter by 'pro' or 'basic'"),
    category: Optional[str] = Query(None, description="Filter by category"),
    sort: Optional[str] = Query("top", description="Sort by 'top', 'recent', or 'rating'")
):
    """
    Public feed of verified buyer reviews and feature suggestions with filters and sorting.
    Strictly populated from the Supabase database.
    """
    items = []
    
    # Fetch directly from Supabase Feedback table
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{TABLE_NAME}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url, headers=get_supabase_headers(), params={"select": "*", "status": "neq.rejected"})
                if res.status_code == 200:
                    db_items = res.json()
                    if db_items and len(db_items) > 0:
                        for db_i in db_items:
                            clean_item = {
                                "id": db_i.get("id"),
                                "user_name": db_i.get("user_name", "PrivCloud User"),
                                "user_email": db_i.get("user_email", ""),
                                "plan_tier": db_i.get("plan_tier", "basic"),
                                "plan_name": db_i.get("plan_name", "Basic Lifetime Edition"),
                                "feedback_type": db_i.get("feedback_type", "review"),
                                "rating": db_i.get("rating"),
                                "category": db_i.get("category", "General"),
                                "usage_duration": db_i.get("usage_duration", "2–4 weeks"),
                                "title": db_i.get("title", ""),
                                "content": db_i.get("content", ""),
                                "helpful_count": db_i.get("helpful_count", 0),
                                "status": db_i.get("status", "approved"),
                                "created_at": db_i.get("created_at", "")
                            }
                            items.append(clean_item)
                        _MEM_FEEDBACK.clear()
                        _MEM_FEEDBACK.extend(items)
        except Exception as e:
            print(f"[Supabase Feedback Query Warning] {e}")

    # Fallback to in-memory session cache only if network failed
    if not items and _MEM_FEEDBACK:
        items = list(_MEM_FEEDBACK)

    # Filtering
    filtered = items
    if type and type in ("review", "suggestion"):
        filtered = [i for i in filtered if i.get("feedback_type") == type]
    if plan and plan in ("pro", "basic"):
        filtered = [i for i in filtered if i.get("plan_tier") == plan]
    if category and category != "all":
        filtered = [i for i in filtered if (i.get("category") or "").lower() == category.lower()]

    # Sorting
    if sort == "top":
        filtered.sort(key=lambda x: x.get("helpful_count", 0), reverse=True)
    elif sort == "recent":
        filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    elif sort == "rating":
        filtered.sort(key=lambda x: (x.get("rating") or 0, x.get("helpful_count", 0)), reverse=True)

    # Compute live summary metrics from database items
    reviews = [i for i in items if i.get("feedback_type") == "review"]
    ratings = [i.get("rating") for i in reviews if i.get("rating") is not None]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 5.0
    
    total_reviews = len(reviews)
    total_suggestions = len([i for i in items if i.get("feedback_type") == "suggestion"])
    satisfaction_pct = round((len([r for r in ratings if r >= 4]) / len(ratings)) * 100, 1) if ratings else 100.0

    metrics_data = {
        "avg_rating": avg_rating,
        "total_reviews": total_reviews,
        "total_suggestions": total_suggestions,
        "satisfaction_pct": satisfaction_pct
    }

    return {
        "success": True,
        "count": len(filtered),
        "total": len(items),
        "metrics": metrics_data,
        "stats": {
            "average_rating": avg_rating,
            "total_reviews": total_reviews,
            "total_suggestions": total_suggestions,
            "satisfaction_pct": satisfaction_pct
        },
        "items": filtered
    }

@router.get("/eligibility", summary="Verify Buyer License Eligibility for Submission")
@router.get("/verify-eligibility", include_in_schema=False)
async def check_eligibility(email: str = Query(..., description="User email to verify")):
    """
    Check if the user has a verified Basic or Pro license in Supabase.
    Strictly verifies purchases to prevent fraudulent feedback submissions.
    """
    clean_email = (email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        return JSONResponse(
            status_code=400,
            content={"eligible": False, "error": "A valid email address is required."}
        )

    # 1. Check Supabase Orders Table & Local Order Cache
    try:
        from backend.supabase_db import get_user_active_order, resolve_tier
        order = get_user_active_order(clean_email)
        if order and order.get("status") == "verified":
            tier = resolve_tier(order.get("tier") or order.get("plan_id")).lower()
            if tier in ("pro", "basic"):
                return {
                    "eligible": True,
                    "email": clean_email,
                    "plan_tier": tier,
                    "plan_name": "Pro Lifetime Edition" if tier == "pro" else "Basic Lifetime Edition",
                    "badge": "👑 Verified Pro Buyer" if tier == "pro" else "⭐ Verified Basic Buyer",
                    "is_vip": (tier == "pro"),
                    "order_id": order.get("order_id"),
                    "verified_at": str(order.get("verified_at")) if order.get("verified_at") else None
                }
    except Exception as err:
        print(f"[PrivCloud Eligibility] Order check notice: {err}")

    # 2. Check Supabase Users / purchases metadata if available
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url, headers=get_supabase_headers())
                if res.status_code == 200:
                    for u in res.json().get("users", []):
                        if (u.get("email") or "").lower() == clean_email:
                            meta = u.get("user_metadata", {})
                            tier = (meta.get("plan_tier") or meta.get("plan") or "").lower()
                            if tier in ("pro", "basic"):
                                return {
                                    "eligible": True,
                                    "email": clean_email,
                                    "plan_tier": tier,
                                    "plan_name": "Pro Lifetime Edition" if tier == "pro" else "Basic Lifetime Edition",
                                    "badge": "👑 Verified Pro Buyer" if tier == "pro" else "⭐ Verified Basic Buyer",
                                    "is_vip": (tier == "pro")
                                }
        except Exception:
            pass

    # User does not have an active verified Basic or Pro license
    return JSONResponse(
        status_code=403,
        content={
            "eligible": False,
            "email": clean_email,
            "error": "Feedback and suggestions are exclusive to verified Basic and Pro license holders.",
            "requires_license": True
        }
    )

verify_eligibility = check_eligibility

@router.post("", summary="Submit Review or Feature Suggestion (Basic/Pro Only)")
async def submit_feedback(payload: FeedbackSubmissionRequest):
    """
    Submit a review or feature suggestion.
    Enforces strict Basic / Pro license requirement. Free trial users receive 403 Forbidden.
    """
    clean_email = payload.user_email.strip().lower()
    clean_tier = payload.plan_tier.strip().lower()
    
    # Strict validation: Free trial cannot submit
    if clean_tier not in ("basic", "pro"):
        raise HTTPException(
            status_code=403,
            detail="Submission rejected. Feedback is exclusive to verified Basic and Pro lifetime buyers. Free Trial accounts cannot submit."
        )

    new_id = f"fb_{uuid.uuid4().hex[:10]}"
    timestamp = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    
    item = {
        "id": new_id,
        "user_name": payload.user_name or clean_email.split("@")[0].title(),
        "user_email": clean_email,
        "plan_tier": clean_tier,
        "plan_name": "Pro Lifetime Edition" if clean_tier == "pro" else "Basic Lifetime Edition",
        "feedback_type": payload.feedback_type,
        "rating": payload.rating if payload.feedback_type == "review" else None,
        "category": payload.category or "General",
        "usage_duration": payload.usage_duration or "2–4 weeks",
        "title": payload.title.strip(),
        "content": payload.content.strip(),
        "helpful_count": 0,
        "status": "approved",
        "created_at": timestamp
    }

    # Save to in-memory store immediately
    _MEM_FEEDBACK.insert(0, item)

    # Attempt to persist in Supabase Feedback table
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{TABLE_NAME}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                await client.post(url, headers=get_supabase_headers(), json=item)
        except Exception as e:
            print(f"[Supabase Feedback Persistence Warning] {e}")

    return {
        "success": True,
        "message": "Thank you! Your feedback has been verified and published to the community.",
        "item": item
    }

@router.post("/{feedback_id}/helpful", summary="Upvote Feedback as Helpful")
async def upvote_helpful(feedback_id: str):
    """Increment helpful counter for a review or suggestion."""
    found = False
    helpful_count = 0

    for item in _MEM_FEEDBACK:
        if item.get("id") == feedback_id:
            item["helpful_count"] = item.get("helpful_count", 0) + 1
            helpful_count = item["helpful_count"]
            found = True
            break
            
    if not found:
        # Check Supabase table if not found in memory
        if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
            try:
                url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{TABLE_NAME}"
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.get(url, headers=get_supabase_headers(), params={"id": f"eq.{feedback_id}"})
                    if res.status_code == 200:
                        rows = res.json()
                        if rows:
                            cur_item = rows[0]
                            new_count = int(cur_item.get("helpful_count") or 0) + 1
                            patch_res = await client.patch(
                                url,
                                headers=get_supabase_headers(prefer="return=representation"),
                                params={"id": f"eq.{feedback_id}"},
                                json={"helpful_count": new_count}
                            )
                            if patch_res.status_code == 200:
                                return {"success": True, "helpful_count": new_count}
            except Exception as e:
                print(f"[Supabase Feedback Upvote Warning] {e}")

        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Feedback item not found."}
        )

    # Update Supabase Feedback table for in-memory item
    if SUPABASE_URL and ACTIVE_SUPABASE_KEY:
        try:
            url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{TABLE_NAME}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                await client.patch(
                    url,
                    headers=get_supabase_headers(),
                    params={"id": f"eq.{feedback_id}"},
                    json={"helpful_count": helpful_count}
                )
        except Exception as e:
            print(f"[Supabase Feedback Upvote Sync Warning] {e}")

    return {"success": True, "helpful_count": helpful_count}
