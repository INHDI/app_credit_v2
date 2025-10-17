"""
LichSuTraLai schemas for API request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import Optional


class LichSuTraLaiBase(BaseModel):
    """Base schema for LichSuTraLai"""
    MaHD: str = Field(..., description="Mã hợp đồng")
    Ngay: date = Field(..., description="Ngày trả")
    SoTien: int = Field(..., gt=0, description="Số tiền trả")
    NoiDung: Optional[str] = Field(None, description="Nội dung")
    TrangThaiThanhToan: str = Field(..., description="Trạng thái thanh toán")
    TrangThaiNgayThanhToan: str = Field(..., description="Trạng thái ngày thanh toán")
    TienDaTra: int = Field(..., description="Tổng tiền đã trả")


class LichSuTraLaiCreate(LichSuTraLaiBase):
    """Schema for creating LichSuTraLai"""
    pass


class LichSuTraLaiUpdate(BaseModel):
    """Schema for updating LichSuTraLai"""
    MaHD: Optional[str] = None
    Ngay: Optional[date] = None
    SoTien: Optional[int] = None
    NoiDung: Optional[str] = None
    TrangThaiThanhToan: Optional[str] = None
    TrangThaiNgayThanhToan: Optional[str] = None
    TienDaTra: Optional[int] = None


class LichSuTraLai(BaseModel):
    """Schema for LichSuTraLai response - can serialize from SQLAlchemy model"""
    Stt: int = Field(..., description="Số thứ tự")
    MaHD: str = Field(..., description="Mã hợp đồng")
    Ngay: date = Field(..., description="Ngày trả")
    SoTien: int = Field(..., description="Số tiền trả")
    NoiDung: Optional[str] = Field(None, description="Nội dung")
    TrangThaiThanhToan: str = Field(..., description="Trạng thái thanh toán")
    TrangThaiNgayThanhToan: str = Field(..., description="Trạng thái ngày thanh toán")
    TienDaTra: int = Field(..., description="Tổng tiền đã trả")
    
    model_config = ConfigDict(from_attributes=True)
