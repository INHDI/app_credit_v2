from sqlalchemy import Column, Integer, String, Date
from app.core.database import Base
import datetime

class LichSu(Base):
    __tablename__ = "lich_su"
    id = Column(Integer, primary_key=True)
    ma_hd = Column(String, nullable=False)
    ho_ten = Column(String, nullable=False)
    ngay = Column(Date, nullable=False)
    so_tien = Column(Integer, nullable=False)
    hanh_dong = Column(String, nullable=False)
    loai_hop_dong = Column(String, nullable=False)