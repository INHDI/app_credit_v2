"""
TraGop schemas for API request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import Optional, List, Any


class TraGopCreate(BaseModel):
    """Schema for creating TraGop"""
    HoTen: str = Field(..., description="Họ tên người vay")
    NgayVay: date = Field(..., description="Ngày vay")
    SoTienVay: int = Field(...,gt=0, description="Số tiền vay")
    KyDong: int = Field(...,gt=0, description="Kỳ đóng (số ngày giữa các kỳ thanh toán)")
    SoLanTra: int = Field(...,gt=0, description="Tổng số lần phải trả")
    LaiSuat: int = Field(..., description="Lãi suất (tổng lãi cả kỳ hạn, VNĐ)")


class TraGopUpdate(BaseModel):
    """Schema for updating TraGop"""
    HoTen: Optional[str] = None
    NgayVay: Optional[date] = None
    SoTienVay: Optional[int] = None
    KyDong: Optional[int] = None
    SoLanTra: Optional[int] = None
    LaiSuat: Optional[int] = None
    TrangThai: Optional[str] = None


class TraGop(BaseModel):
    """Schema for TraGop response - can serialize from SQLAlchemy model"""
    MaHD: str = Field(..., description="Mã hợp đồng")
    HoTen: str = Field(..., description="Họ tên người vay")
    NgayVay: date = Field(..., description="Ngày vay")
    SoTienVay: int = Field(..., description="Số tiền vay")
    KyDong: int = Field(..., description="Kỳ đóng (số ngày giữa các kỳ thanh toán)")
    SoLanTra: int = Field(..., description="Tổng số lần phải trả")
    LaiSuat: int = Field(..., description="Lãi suất (tổng lãi cả kỳ hạn, VNĐ)")
    TrangThai: str = Field(..., description="Trạng thái")
    
    model_config = ConfigDict(from_attributes=True)

class TraGopResponse(BaseModel):
    """Schema for TraGop response"""
    MaHD: str = Field(..., description="Mã hợp đồng")
    HoTen: str = Field(..., description="Họ tên người vay")
    NgayVay: date = Field(..., description="Ngày vay")
    SoTienVay: int = Field(..., description="Số tiền vay")
    KyDong: int = Field(..., description="Kỳ đóng (số ngày giữa các kỳ thanh toán)")
    SoLanTra: int = Field(..., description="Tổng số lần phải trả")
    LaiSuat: int = Field(..., description="Lãi suất (tổng lãi cả kỳ hạn, VNĐ)")
    TrangThai: str = Field(..., description="Trạng thái")
    LichSuTraLai: List[Any] = Field(..., description="Lịch sử trả lãi")
    DaThanhToan: int = Field(..., description="Đã thanh toán")
    ConLai: int = Field(..., description="Còn lại")

    model_config = ConfigDict(from_attributes=True)