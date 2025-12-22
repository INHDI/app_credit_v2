from ast import List
from fastapi import APIRouter, Depends
from typing import List, Any
from sqlalchemy.orm import Session

from app.schemas.response import ApiResponse
from app.schemas.no_phai_thu import NoPhaiThuResponse
from app.crud import no_phai_thu as crud_no_phai_thu
from app.core.database import get_db
from app.core.deps import require_admin_or_collector
from app.models.user import User

router = APIRouter(
    prefix="/no-phai-thu",
    tags=["Nợ phải thu"]
)

@router.get("", response_model=ApiResponse[List[NoPhaiThuResponse]])
async def get_all_no_phai_thu(
    time: str = "today",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Get all no phai thu records (Admin and Collector)"""
    result = crud_no_phai_thu.get_no_phai_thus(db=db, time=time)
    return ApiResponse.success_response(data=result, message="Lấy danh sách nợ phải thu thành công")