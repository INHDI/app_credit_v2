"""
Lich Su (History) API routes
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional, Literal

from app.core.database import get_db
from app.schemas.lich_su import LichSuResponse
from app.schemas.response import ApiResponse
from app.crud import lich_su as crud_lich_su

router = APIRouter(
    prefix="/lich-su",
    tags=["Lịch sử"]
)


def parse_date_string(date_str: Optional[str]) -> Optional[date]:
    """
    Parse date string from DD-MM-YYYY format to date object
    
    Args:
        date_str: Date string in DD-MM-YYYY format
        
    Returns:
        date object or None
        
    Raises:
        HTTPException: If date format is invalid
    """
    if not date_str:
        return None
    
    try:
        return datetime.strptime(date_str, "%d-%m-%Y").date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format: {date_str}. Expected format: DD-MM-YYYY (ví dụ: 01-01-2025)"
        )


@router.get("", response_model=ApiResponse[LichSuResponse])
async def get_lich_su(
    tu_ngay: Optional[str] = Query(
        default=None,
        description="Từ ngày (format: DD-MM-YYYY, ví dụ: 01-01-2025)"
    ),
    den_ngay: Optional[str] = Query(
        default=None,
        description="Đến ngày (format: DD-MM-YYYY, ví dụ: 31-01-2025)"
    ),
    db: Session = Depends(get_db)
):
    """
    Get history data with statistics and details
    
    - **tu_ngay**: Filter from date (optional, format: DD-MM-YYYY)
    - **den_ngay**: Filter to date (optional, format: DD-MM-YYYY)
    
    Returns:
    - **statistics**: List of statistics grouped by date (số người đã trả, số người chưa trả)
    - **details**: Detailed payment history records (all records, no pagination)
    - **total_records**: Total number of records
    """
    # Parse date strings to date objects
    tu_ngay_date = parse_date_string(tu_ngay)
    den_ngay_date = parse_date_string(den_ngay)
    
    result = crud_lich_su.get_lich_su(
        db=db,
        tu_ngay=tu_ngay_date,
        den_ngay=den_ngay_date
    )
    
    return ApiResponse.success_response(
        data=result,
        message="Lấy dữ liệu lịch sử thành công"
    )


@router.get("/statistics", response_model=ApiResponse[dict])
async def financial_statistics(
    granularity: Literal["daily", "weekly", "monthly"] = Query(
        default="daily",
        description="Độ chi tiết thống kê: daily (theo ngày), weekly (theo tuần), monthly (theo tháng)"
    ),
    start_date: str = Query(
        ...,
        description="Ngày bắt đầu (format: DD-MM-YYYY)"
    ),
    end_date: str = Query(
        ...,
        description="Ngày kết thúc (format: DD-MM-YYYY)"
    ),
    db: Session = Depends(get_db),
):
    """
    Get financial statistics with granularity (daily/weekly/monthly)
    
    - **granularity**: Time granularity - daily, weekly, or monthly
    - **start_date**: Start date (format: DD-MM-YYYY)
    - **end_date**: End date (format: DD-MM-YYYY)
    
    Returns:
    - **meta**: Metadata about the query (granularity, date range, bucket count)
    - **summary**: Overall summary (total disbursed, collected, interest, cash flow, contracts)
    - **breakdown**: Breakdown by contract type (tin_chap, tra_gop)
    - **trend**: Time series data grouped by granularity
    - **top_outstanding**: Top 5 contracts with highest outstanding amount
    """
    # Parse dates
    start_date_parsed = parse_date_string(start_date)
    end_date_parsed = parse_date_string(end_date)
    
    # Validate dates
    if not start_date_parsed or not end_date_parsed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format"
        )
    
    if end_date_parsed < start_date_parsed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_date must be greater than or equal to start_date",
        )
    
    # Get statistics
    data = crud_lich_su.get_financial_statistics(
        db, 
        granularity, 
        start_date_parsed, 
        end_date_parsed
    )
    
    return ApiResponse.success_response(
        data=data, 
        message="Thống kê tài chính được tính toán thành công"
    )

