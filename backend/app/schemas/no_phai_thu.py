from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import List, Any

class NoPhaiThuResponse(BaseModel):
    MaHD: str = Field(..., description="Mã hợp đồng")
    HoTen: str = Field(..., description="Họ tên người vay")
    NgayVay: date = Field(..., description="Ngày vay")
    SoTienVay: int = Field(..., description="Số tiền vay")
    KyDong: int = Field(..., description="Kỳ đóng (số ngày giữa các kỳ thanh toán)")
    LaiSuat: int = Field(..., description="Lãi suất (số tiền cố định mỗi kỳ, VNĐ)")
    SoTienTraGoc: int = Field(..., description="Số tiền trả gốc")
    SoLanTra: int = Field(default=0, description="Số lần trả (chỉ áp dụng cho hợp đồng trả góp)")
    TrangThaiThanhToan: str = Field(..., description="Trạng thái thanh toán")
    TrangThaiNgayThanhToan: str = Field(..., description="Trạng thái ngày thanh toán")
    LichSuTraLai: List[Any] = Field(..., description="Lịch sử trả lãi")
    LaiDaTra: int = Field(..., description="Lãi đã trả")
    TongTienVayVaLai: int = Field(..., description="Tổng số tiền vay + tổng lãi phải trả")
    LaiConLai: int = Field(..., description="Lãi còn lại")

    model_config = ConfigDict(from_attributes=True)