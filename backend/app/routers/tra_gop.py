"""
TraGop API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.database import get_db
from app.schemas.tra_gop import TraGopCreate, TraGopResponse, TraGopUpdate, TraGop
from app.schemas.response import ApiResponse
from app.crud import tra_gop as crud_tra_gop
from app.utils.id_generator import generate_tra_gop_id

router = APIRouter(
    prefix="/tra-gop",
    tags=["Trả góp"]
)


@router.post("", response_model=ApiResponse[TraGop], status_code=201)
async def create_tra_gop(tra_gop: TraGopCreate, db: Session = Depends(get_db)):
    """Create a new TraGop contract"""
    ma_hd = generate_tra_gop_id(db)
    result = crud_tra_gop.create_tra_gop(db=db, tra_gop=tra_gop, ma_hd=ma_hd)
    # Convert SQLAlchemy model to Pydantic schema
    tra_gop_response = TraGop.model_validate(result)
    return ApiResponse.success_response(data=tra_gop_response, message="Tạo hợp đồng trả góp thành công")


@router.get("", response_model=ApiResponse[List[TraGopResponse]])
async def get_all_tra_gop(
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
    search: str | None = None,
    sort_by: str = "NgayVay",
    sort_dir: str = "desc",
    today_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get all TraGop contracts with filter/search/sort/pagination"""
    result = crud_tra_gop.get_tra_gops(
        db=db,
        status=status,
        page=page,
        page_size=page_size,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        today_only=today_only,
    )
    return ApiResponse.success_response(data=result, message="Lấy danh sách hợp đồng trả góp thành công")


@router.get("/{ma_hd}", response_model=ApiResponse[TraGopResponse])
async def get_tra_gop_by_id(ma_hd: str, db: Session = Depends(get_db)):
    """Get a specific TraGop contract by MaHD"""
    tra_gop = crud_tra_gop.get_tra_gop_with_history(db=db, ma_hd=ma_hd)
    if not tra_gop:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng trả góp")
    return ApiResponse.success_response(data=tra_gop, message="Lấy thông tin hợp đồng trả góp thành công")


@router.put("/{ma_hd}", response_model=ApiResponse[TraGop])
async def update_tra_gop(ma_hd: str, tra_gop_update: TraGopUpdate, db: Session = Depends(get_db)):
    """Update a TraGop contract"""
    db_tra_gop = crud_tra_gop.update_tra_gop(db=db, ma_hd=ma_hd, tra_gop_update=tra_gop_update)
    if not db_tra_gop:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng trả góp")
    # Convert SQLAlchemy model to Pydantic schema
    tra_gop_response = TraGop.model_validate(db_tra_gop)
    return ApiResponse.success_response(data=tra_gop_response, message="Cập nhật hợp đồng trả góp thành công")


@router.delete("/{ma_hd}", response_model=ApiResponse[Any])
async def delete_tra_gop(ma_hd: str, db: Session = Depends(get_db)):
    """Delete a TraGop contract"""
    success = crud_tra_gop.delete_tra_gop(db=db, ma_hd=ma_hd)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng trả góp")
    return ApiResponse.success_response(data={"MaHD": ma_hd}, message="Xóa hợp đồng trả góp thành công")

