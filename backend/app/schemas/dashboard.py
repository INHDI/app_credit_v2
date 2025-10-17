"""
Dashboard schema
"""

from pydantic import BaseModel, Field
from pydantic import ConfigDict
from typing import List, Any

class LoaiHinhVayDetail(BaseModel):
    """Chi tiết loại hình vay"""
    so_hop_dong: int = Field(..., description="Số hợp đồng")
    tien_cho_vay: int = Field(..., description="Tiền cho vay")
    tien_da_thu: int = Field(..., description="Tiền đã thu")
    tien_no_can_tra: int = Field(..., description="Tiền nợ cần trả")

class LoaiHinhVay(BaseModel):
    """Loại hình vay"""
    tin_chap: LoaiHinhVayDetail = Field(..., description="Tín chấp")
    tra_gop: LoaiHinhVayDetail = Field(..., description="Trả góp")

class TiLeLaiThu(BaseModel):
    """Tỷ lệ lãi thu"""
    da_thu: float = Field(..., description="Phần trăm đã thu")
    chua_thu: float = Field(..., description="Phần trăm chưa thu")

class TiLeLoiNhuan(BaseModel):
    """Tỷ lệ lợi nhuận"""
    tin_chap: float = Field(..., description="% lợi nhuận từ Tín chấp")
    tra_gop: float = Field(..., description="% lợi nhuận từ Trả góp")

class DashboardResponse(BaseModel):
    """Dashboard response"""
    tong_hop_dong: int = Field(..., description="Tổng số hợp đồng")
    tong_tien_da_thu: int = Field(..., description="Tổng số tiền đã thu")
    tong_tien_can_thu: int = Field(..., description="Tổng số tiền cần thu")
    no_phai_thu: int = Field(..., description="Số lượng hợp đồng còn nợ")
    loai_hinh_vay: LoaiHinhVay = Field(..., description="Loại hình vay")
    ti_le_lai_thu: TiLeLaiThu = Field(..., description="Tỷ lệ lãi thu")
    ti_le_loi_nhuan: TiLeLoiNhuan = Field(..., description="Tỷ lệ lợi nhuận")
    
    model_config = ConfigDict(from_attributes=True)