"""
Dashboard API routes
"""
from fastapi import APIRouter, Depends, Query
from app.schemas.response import ApiResponse
from app.schemas.dashboard import DashboardResponse
from app.core.database import get_db
from app.core.enums import TimePeriod
from sqlalchemy.orm import Session
from app.crud import dashboard as crud_dashboard

router = APIRouter(
    prefix="/dashboard", 
    tags=["Dashboard"]
)

@router.get("", response_model=ApiResponse[DashboardResponse])
async def get_dashboard(
    time_period: str = Query(
        default="all",
        description="Mốc thời gian: all, this_month, this_quarter, this_year"
    ),
    db: Session = Depends(get_db)
):
    """Get dashboard data with time period filter"""
    # Validate time_period
    if time_period not in TimePeriod.list_values():
        time_period = TimePeriod.ALL.value
    
    result = crud_dashboard.get_dashboard(db=db, time_period=time_period)
    return ApiResponse.success_response(data=result, message="Lấy dữ liệu dashboard thành công")