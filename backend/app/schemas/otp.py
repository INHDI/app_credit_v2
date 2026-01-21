"""
OTP schemas for API request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional


class OTPSetupResponse(BaseModel):
    """Response for OTP setup - contains QR code data for first-time setup"""
    qr_code_base64: str = Field(..., description="Base64 encoded QR code PNG image")
    secret: str = Field(..., description="TOTP secret for manual entry (base32)")
    otpauth_url: str = Field(..., description="otpauth:// URL for QR code")


class OTPVerifyRequest(BaseModel):
    """Request to verify OTP code"""
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$", description="6-digit OTP code")


class PasswordChangeRequest(BaseModel):
    """Request to change password"""
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=6, description="New password (minimum 6 characters)")


class LoginStep1Request(BaseModel):
    """Request for login step 1 (email + password)"""
    email: str = Field(..., description="Email")
    password: str = Field(..., description="Password")


from app.schemas.user import Token, UserResponse

class LoginStep1Response(BaseModel):
    """Response after email/password verified - indicates next steps"""
    requires_otp: bool = Field(default=True, description="Always true - OTP required for all users")
    requires_setup: bool = Field(..., description="True if first time - user needs to scan QR code")
    requires_password_change: bool = Field(..., description="True if user must change password after login")
    temp_token: str = Field(..., description="Temporary token for OTP verification step (expires in 5 minutes)")
    user_email: str = Field(..., description="User's email for display")
    
    # Optional fields for when OTP is disabled
    token: Optional[Token] = Field(None, description="Access token (if OTP disabled)")
    user: Optional[UserResponse] = Field(None, description="User info (if OTP disabled)")


class OTPLoginRequest(BaseModel):
    """Request for OTP verification + complete login"""
    temp_token: str = Field(..., description="Temporary token from login step 1")
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$", description="6-digit OTP code")


class OTPSetupRequest(BaseModel):
    """Request to get OTP setup QR code (for first-time setup)"""
    temp_token: str = Field(..., description="Temporary token from login step 1")
