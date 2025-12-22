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

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
