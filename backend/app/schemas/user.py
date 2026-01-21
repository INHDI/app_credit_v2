"""
User schemas for API request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """Schema for creating a new user (registration)"""
    ho_ten: str = Field(..., min_length=1, description="Họ tên người dùng")
    so_dien_thoai: str = Field(..., min_length=10, max_length=11, description="Số điện thoại")
    email: str = Field(..., description="Email")
    password: str = Field(..., min_length=6, description="Mật khẩu (tối thiểu 6 ký tự)")
    role: Optional[str] = Field(default="debtor", description="Vai trò (admin/collector/debtor)")


class UserLogin(BaseModel):
    """Schema for user login"""
    email: str = Field(..., description="Email")
    password: str = Field(..., description="Mật khẩu")


class UserUpdate(BaseModel):
    """Schema for updating user"""
    ho_ten: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """Schema for user response (without password)"""
    id: int = Field(..., description="ID người dùng")
    ho_ten: str = Field(..., description="Họ tên")
    so_dien_thoai: str = Field(..., description="Số điện thoại")
    email: str = Field(..., description="Email")
    role: str = Field(..., description="Vai trò")
    is_active: bool = Field(..., description="Trạng thái hoạt động")
    created_at: datetime = Field(..., description="Ngày tạo")
    
    # OTP fields
    otp_enabled: bool = Field(default=False, description="2FA đã được bật")
    otp_verified: bool = Field(default=False, description="Đã xác thực OTP lần đầu")
    must_change_password: bool = Field(default=True, description="Cần đổi mật khẩu")
    
    # Telegram fields
    telegram_chat_id: Optional[str] = Field(None, description="Telegram Chat ID")
    telegram_verified: bool = Field(default=False, description="Đã xác thực Telegram")

    model_config = ConfigDict(from_attributes=True)

    @field_validator('must_change_password', 'telegram_verified', 'otp_enabled', 'otp_verified', mode='before')
    @classmethod
    def handle_none_bool(cls, v: Optional[bool]) -> bool:
        return bool(v)


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


class TokenData(BaseModel):
    """Schema for token payload data"""
    user_id: int = Field(..., description="User ID")
    email: str = Field(..., description="Email")
    role: str = Field(..., description="User role")


class UserWithToken(BaseModel):
    """Schema for login response with user info and token"""
    user: UserResponse
    token: Token
