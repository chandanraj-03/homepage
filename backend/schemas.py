"""
Pydantic Request and Response Schemas for PrivCloud FastAPI Backend.
"""

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field

class EmailValidationRequest(BaseModel):
    email: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Any]] = Field(default_factory=list)
    top_k: Optional[int] = 4

class CreateOrderRequest(BaseModel):
    amount: Union[int, float] = Field(..., ge=0, description="Order charge amount in paise")
    currency: Optional[str] = "INR"
    receipt: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: Optional[str] = None
    order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    signature: Optional[str] = None
    user_email: Optional[str] = None
    username: Optional[str] = None
    plan_id: Optional[str] = None
    tier: Optional[str] = None
    amount: Optional[Union[int, float]] = Field(default=None, ge=0)

class UsernameCheckRequest(BaseModel):
    username: str
    full_name: Optional[str] = None

class IdentifierResolveRequest(BaseModel):
    identifier: str

class RegisterProfileRequest(BaseModel):
    full_name: str
    username: str
    email: str

class VerifyProfileRequest(BaseModel):
    email: str
    username: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    identifier: str

class VerifyOtpRequest(BaseModel):
    email: str
    code: str
    type: Optional[str] = "signup"

class ResendOtpRequest(BaseModel):
    email: str
    type: Optional[str] = "signup"

class UpdatePasswordRequest(BaseModel):
    email: str
    new_password: str = Field(..., min_length=6)
    reset_token: Optional[str] = None

class GetProductKeyRequest(BaseModel):
    razorpay_order_id: Optional[str] = None
    order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    payment_id: Optional[str] = None
    plan_id: Optional[str] = None
    tier: Optional[str] = None
    user_email: Optional[str] = None
    email: Optional[str] = None

class DownloadProductRequest(BaseModel):
    razorpay_order_id: Optional[str] = None
    order_id: Optional[str] = None
    user_email: Optional[str] = None


