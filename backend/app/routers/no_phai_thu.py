from ast import List
from fastapi import APIRouter
from typing import List, Any
from app.schemas.response import ApiResponse
from app.schemas.no_phai_thu import NoPhaiThuResponse
from app.crud import no_phai_thu as crud_no_phai_thu
from app.core.database import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter(
    prefix="/no-phai-thu",
    tags=["Nợ phải thu"]
)

@router.get("", response_model=ApiResponse[List[NoPhaiThuResponse]])
async def get_all_no_phai_thu(
    time: str = "today",
    db: Session = Depends(get_db)):
    """Get all no phai thu records"""
    result = crud_no_phai_thu.get_no_phai_thus(db=db, time=time)
    return ApiResponse.success_response(data=result, message="Lấy danh sách nợ phải thu thành công")