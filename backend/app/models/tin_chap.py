"""
TinChap model - Tín chấp (Credit without collateral)
"""
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from app.core.database import Base
import datetime


class TinChap(Base):
    """
    Tín chấp - Credit without collateral
    """
    __tablename__ = "tin_chap"

    MaHD = Column(String, primary_key=True, index=True)  # Format: TCXXX
    HoTen = Column(String, nullable=False)
    NgayVay = Column(Date, nullable=False, default=datetime.date.today)
    SoTienVay = Column(Integer, nullable=False)
    KyDong = Column(Integer, nullable=False)  # Payment period (days) - Số ngày giữa các kỳ thanh toán
    LaiSuat = Column(Integer, nullable=False)  # Fixed interest amount (VNĐ)
    SoTienTraGoc = Column(Integer, nullable=True, default=0)  # Số tiền trả gốc (nếu cần cho tất toán)
    TrangThai = Column(String, nullable=False)  # [TrangThaiThanhToan, TrangThaiNgayThanhToan]
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Liên kết người nợ (optional)

