"""
LichSuTraLai model - Lịch sử trả lãi (Payment history)
"""
from sqlalchemy import Column, Integer, String, Date
from app.core.database import Base
import datetime


class LichSuTraLai(Base):
    """
    Lịch sử trả lãi - Payment history
    """
    __tablename__ = "lich_su_tra_lai"

    Stt = Column(Integer, primary_key=True, autoincrement=True)
    MaHD = Column(String, nullable=False, index=True)  # Contract ID (can be from TinChap or TraGop)
    Ngay = Column(Date, nullable=False, default=datetime.date.today)
    SoTien = Column(Integer, nullable=False)
    NoiDung = Column(String, nullable=True)
    TrangThaiThanhToan = Column(String, nullable=False)  # Trạng thái thanh toán
    TrangThaiNgayThanhToan = Column(String, nullable=False)  # Trạng thái ngày thanh toán
    TienDaTra = Column(Integer, nullable=False)  # Total amount paid so far

    def __repr__(self):
        return f"<LichSuTraLai(Stt={self.Stt}, MaHD='{self.MaHD}', SoTien={self.SoTien})>"

