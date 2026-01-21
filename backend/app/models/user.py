"""
User model - Người dùng
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base
from datetime import datetime


class User(Base):
    """
    User model - Lưu trữ thông tin người dùng
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ho_ten = Column(String, nullable=False)
    so_dien_thoai = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="debtor")  # admin, collector, debtor
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # OTP/2FA fields (Bắt buộc cho tất cả roles)
    otp_secret = Column(String, nullable=True)        # TOTP secret key (base32)
    otp_enabled = Column(Boolean, default=False)       # 2FA đã được setup
    otp_verified = Column(Boolean, default=False)      # Đã verify OTP lần đầu
    
    # First login fields
    must_change_password = Column(Boolean, default=True)  # Bắt buộc đổi mật khẩu lần đầu
    
    # Telegram integration (cho debtor)
    telegram_chat_id = Column(String, nullable=True, unique=True)  # Chat ID cá nhân
    telegram_verified = Column(Boolean, default=False)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
