"""
Enums cho ứng dụng quản lý tín dụng
"""
from enum import Enum


class TrangThaiThanhToan(str, Enum):
    """Trạng thái thanh toán"""
    CHUA_THANH_TOAN = "Chưa thanh toán"
    DONG_DU = "Đóng đủ"
    THANH_TOAN_MOT_PHAN = "Thanh toán một phần"
    CHUA_DONG_DU = "Chưa đóng đủ"
    DA_TAT_TOAN = "Đã tất toán"
    
    @classmethod
    def list_values(cls):
        """Trả về danh sách tất cả các giá trị"""
        return [status.value for status in cls]


class TrangThaiNgayThanhToan(str, Enum):
    """Trạng thái ngày thanh toán"""
    CHUA_DEN_HAN = "Chưa đến hạn"
    DEN_HAN = "Đến hạn"
    QUA_HAN = "Quá hạn"
    QUA_KY_DONG_LAI = "Quá kỳ đóng lãi"

    @classmethod
    def list_values(cls):
        """Trả về danh sách tất cả các giá trị"""
        return [status.value for status in cls]


class TimePeriod(str, Enum):
    """Mốc thời gian cho dashboard"""
    ALL = "all"
    THIS_MONTH = "this_month"
    THIS_QUARTER = "this_quarter"
    THIS_YEAR = "this_year"

    @classmethod
    def list_values(cls):
        """Trả về danh sách tất cả các giá trị"""
        return [period.value for period in cls]

# Export all enums
__all__ = [
    "TrangThaiThanhToan", 
    "TrangThaiNgayThanhToan",
    "TimePeriod",
]

