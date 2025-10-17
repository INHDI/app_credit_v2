"""
Lich Su (History) schemas for API request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import List


class LichSuStatisticsByDate(BaseModel):
    """Thống kê theo từng ngày"""
    ngay: date = Field(..., description="Ngày")
    so_nguoi_da_tra: int = Field(..., description="Số người đã trả")
    so_nguoi_chua_tra: int = Field(..., description="Số người chưa trả")


class LichSuDetail(BaseModel):
    """Chi tiết lịch sử trả lãi"""
    stt: int = Field(..., description="Số thứ tự (Stt)")
    ngay: date = Field(..., description="Ngày")
    ma_hd: str = Field(..., description="Mã hợp đồng")
    ho_ten: str = Field(..., description="Họ tên")
    so_tien_thanh_toan: int = Field(..., description="Số tiền thanh toán (TienDaTra)")
    loai_hop_dong: str = Field(..., description="Loại hợp đồng (TC/TG)")
    trang_thai: str = Field(..., description="Trạng thái thanh toán")


class LichSuResponse(BaseModel):
    """Response cho API lịch sử"""
    statistics: List[LichSuStatisticsByDate] = Field(..., description="Thống kê theo ngày")
    details: List[LichSuDetail] = Field(..., description="Chi tiết lịch sử")
    total_records: int = Field(..., description="Tổng số bản ghi")

