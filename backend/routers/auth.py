"""
Authentication & Configuration Router for PrivCloud.
Handles dynamic Supabase config, email provider allowlist checks,
username uniqueness verification, dual-identifier resolution (email or username),
user profile registration, and OTP verification state updates.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from backend.config import SUPABASE_URL, SUPABASE_KEY, is_allowed_email_domain
from backend.schemas import (
    EmailValidationRequest,
    UsernameCheckRequest,
    IdentifierResolveRequest,
    RegisterProfileRequest,
    VerifyProfileRequest,
    ForgotPasswordRequest,
    VerifyOtpRequest,
    ResendOtpRequest
)
from backend.users_db import (
    validate_username_format,
    is_username_available,
    resolve_identifier,
    register_user,
    generate_user_otp,
    verify_user_otp,
    mark_user_verified,
    generate_username_suggestions
)

router = APIRouter(prefix="/api", tags=["Authentication & Config"])

@router.get("/config", summary="Get Public Runtime Config")
async def get_config():
    """Dynamically serve public runtime config without exposing secrets in static files."""
    return {
        'supabaseUrl': SUPABASE_URL,
        'supabaseKey': SUPABASE_KEY
    }

@router.post("/auth/validate-email", summary="Validate Email Domain")
async def validate_email(payload: EmailValidationRequest):
    """API endpoint to validate email domain against the strict provider allowlist."""
    email = payload.email.strip()
    
    if not is_allowed_email_domain(email):
        return JSONResponse(
            status_code=400,
            content={
                'valid': False,
                'message': 'Only major email providers are allowed (Gmail, Outlook, Yahoo, Proton, iCloud, Zoho).'
            }
        )

    return {
        'valid': True,
        'message': 'Email domain is verified.'
    }

@router.post("/auth/check-username", summary="Check Username Availability & Get Suggestions")
async def check_username(payload: UsernameCheckRequest):
    """
    Check if a username has valid syntax and is available.
    Returns smart available suggestions if the username is taken.
    """
    username = payload.username.strip()
    full_name = payload.full_name.strip() if payload.full_name else None
    
    valid_format, msg = validate_username_format(username)
    if not valid_format:
        # Generate suggestions based on full_name if available
        suggestions = generate_username_suggestions(base_username=username, full_name=full_name, limit=4)
        return JSONResponse(
            status_code=400,
            content={
                'available': False,
                'valid': False,
                'message': msg,
                'suggestions': suggestions
            }
        )

    available = is_username_available(username)
    if not available:
        suggestions = generate_username_suggestions(base_username=username, full_name=full_name, limit=4)
        return JSONResponse(
            status_code=409,
            content={
                'available': False,
                'valid': True,
                'message': 'This username is already taken. Please choose another.',
                'suggestions': suggestions
            }
        )

    return {
        'available': True,
        'valid': True,
        'message': 'Username is available.',
        'suggestions': []
    }

@router.post("/auth/resolve-identifier", summary="Resolve Username or Email to Profile")
async def resolve_auth_identifier(payload: IdentifierResolveRequest):
    """
    Resolve an identifier (username or email) into user profile details.
    Allows Instagram-style dual login (Email OR Username).
    """
    ident = payload.identifier.strip()
    if not ident:
        return JSONResponse(
            status_code=400,
            content={'found': False, 'message': 'Identifier cannot be empty.'}
        )

    user = resolve_identifier(ident)
    if not user:
        # If it looks like an email, we return the email itself so Supabase can attempt authentication
        if '@' in ident:
            return {
                'found': True,
                'email': ident,
                'username': ident.split('@')[0],
                'full_name': ident.split('@')[0]
            }
        return JSONResponse(
            status_code=404,
            content={'found': False, 'message': f"No account found with username '@{ident}'."}
        )

    return {
        'found': True,
        'email': user.get('email'),
        'username': user.get('username'),
        'full_name': user.get('full_name')
    }

@router.post("/auth/register-profile", summary="Register User Profile")
async def register_profile(payload: RegisterProfileRequest):
    """
    Validate and persist user profile metadata (full_name, username, email)
    ensuring uniqueness of both username and email before OTP verification.
    """
    email = payload.email.strip()
    username = payload.username.strip()
    full_name = payload.full_name.strip()

    if not full_name or len(full_name) < 2:
        return JSONResponse(
            status_code=400,
            content={'success': False, 'message': 'Please provide a valid full name.'}
        )

    if not is_allowed_email_domain(email):
        return JSONResponse(
            status_code=400,
            content={
                'success': False,
                'message': 'Only major email providers are allowed (Gmail, Outlook, Yahoo, Proton, iCloud, Zoho).'
            }
        )

    valid_format, msg = validate_username_format(username)
    if not valid_format:
        return JSONResponse(
            status_code=400,
            content={'success': False, 'message': msg}
        )

    success, msg, record = register_user(full_name, username, email, is_verified=False)
    if not success:
        return JSONResponse(
            status_code=409,
            content={'success': False, 'message': msg}
        )

    # Automatically generate and dispatch fresh dynamic OTP
    generate_user_otp(email)

    return {
        'success': True,
        'message': 'Profile registered successfully. Confirmation code sent.',
        'profile': record
    }

@router.post("/auth/verify-profile", summary="Mark Profile as Verified")
async def verify_profile(payload: VerifyProfileRequest):
    """
    Mark the user's registered profile as verified after successful OTP verification.
    """
    email = payload.email.strip()
    username = payload.username.strip() if payload.username else None
    
    updated = mark_user_verified(email=email, username=username)
    return {
        'success': updated,
        'message': 'Profile verification status updated.' if updated else 'Profile not found.'
    }

@router.post("/auth/forgot-password", summary="Initiate Forgot Password")
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Resolve identifier (username or email) and return the email to send reset instructions to.
    """
    ident = payload.identifier.strip()
    if not ident:
        return JSONResponse(
            status_code=400,
            content={'success': False, 'message': 'Please enter your email or username.'}
        )

    user = resolve_identifier(ident)
    target_email = user.get('email') if user else (ident if '@' in ident else None)

    if not target_email:
        return JSONResponse(
            status_code=404,
            content={'success': False, 'message': f"No account found associated with '{ident}'."}
        )

    return {
        'success': True,
        'email': target_email,
        'message': f"Password reset instructions will be sent to {target_email}."
    }

@router.post("/auth/verify-otp", summary="Verify OTP Code")
async def verify_otp_endpoint(payload: VerifyOtpRequest):
    """
    Verify user 6-digit confirmation code.
    """
    email = payload.email.strip()
    code = payload.code.strip()
    
    success, message = verify_user_otp(email=email, code=code)
    if not success:
        return JSONResponse(
            status_code=400,
            content={'success': False, 'message': message}
        )
        
    return {
        'success': True,
        'message': 'Code verified successfully.'
    }

@router.post("/auth/resend-otp", summary="Resend OTP Code")
async def resend_otp_endpoint(payload: ResendOtpRequest):
    """
    Generate and resend OTP code for email.
    """
    email = payload.email.strip()
    otp = generate_user_otp(email)
    
    return {
        'success': True,
        'message': f"A new 6-digit confirmation code has been generated for {email}."
    }
