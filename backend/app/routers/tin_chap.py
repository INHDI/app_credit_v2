"""
TinChap API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.database import get_db
from app.schemas.tin_chap import TinChapCreate, TinChapResponse, TinChapUpdate, TinChap
from app.schemas.response import ApiResponse
from app.crud import tin_chap as crud_tin_chap
from app.utils.id_generator import generate_tin_chap_id
from app.websocket import manager, EventType, broadcast_tin_chap_event, broadcast_dashboard_update

router = APIRouter(
    prefix="/tin-chap",
    tags=["Tín chấp"]
)


@router.post("", response_model=ApiResponse[TinChap], status_code=201)
async def create_tin_chap(tin_chap: TinChapCreate, db: Session = Depends(get_db)):
    """Create a new TinChap contract"""
    ma_hd = generate_tin_chap_id(db)
    result = crud_tin_chap.create_tin_chap(db=db, tin_chap=tin_chap, ma_hd=ma_hd)
    # Convert SQLAlchemy model to Pydantic schema
    tin_chap_response = TinChap.model_validate(result)
    
    # Broadcast WebSocket event
    await broadcast_tin_chap_event(
        manager=manager,
        event_type=EventType.TIN_CHAP_CREATED,
        tin_chap_data=tin_chap_response.model_dump(mode='json'),
        message=f"Tạo hợp đồng tín chấp {ma_hd} thành công"
    )
    
    # Trigger dashboard update
    await broadcast_dashboard_update(
        manager=manager,
        dashboard_data={"action": "tin_chap_created", "ma_hd": ma_hd},
        message="Dashboard cần cập nhật sau tạo tín chấp mới"
    )
    
    return ApiResponse.success_response(data=tin_chap_response, message="Tạo hợp đồng tín chấp thành công")


@router.get("", response_model=ApiResponse[List[TinChapResponse]])
async def get_all_tin_chap(
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
    search: str | None = None,
    sort_by: str = "NgayVay",
    sort_dir: str = "desc",
    today_only: bool = False,
    db: Session = Depends(get_db)
    ):
    """Get all TinChap contracts with filter/search/sort/pagination"""
    result = crud_tin_chap.get_tin_chaps(
        db=db,
        status=status,
        page=page,
        page_size=page_size,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        today_only=today_only,
    )
    return ApiResponse.success_response(data=result, message="Lấy danh sách hợp đồng tín chấp thành công")


@router.get("/{ma_hd}", response_model=ApiResponse[TinChapResponse])
async def get_tin_chap_by_id(ma_hd: str, db: Session = Depends(get_db)):
    """Get a specific TinChap contract by MaHD"""
    tin_chap = crud_tin_chap.get_tin_chap_with_history(db=db, ma_hd=ma_hd)
    if not tin_chap:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng tín chấp")
    return ApiResponse.success_response(data=tin_chap, message="Lấy thông tin hợp đồng tín chấp thành công")


@router.put("/{ma_hd}", response_model=ApiResponse[TinChap])
async def update_tin_chap(ma_hd: str, tin_chap_update: TinChapUpdate, db: Session = Depends(get_db)):
    """Update a TinChap contract"""
    db_tin_chap = crud_tin_chap.update_tin_chap(db=db, ma_hd=ma_hd, tin_chap_update=tin_chap_update)
    if not db_tin_chap:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng tín chấp")
    # Convert SQLAlchemy model to Pydantic schema
    tin_chap_response = TinChap.model_validate(db_tin_chap)
    
    # Broadcast WebSocket event
    await broadcast_tin_chap_event(
        manager=manager,
        event_type=EventType.TIN_CHAP_UPDATED,
        tin_chap_data=tin_chap_response.model_dump(mode='json'),
        message=f"Cập nhật hợp đồng tín chấp {ma_hd} thành công"
    )
    
    # Trigger dashboard update
    await broadcast_dashboard_update(
        manager=manager,
        dashboard_data={"action": "tin_chap_updated", "ma_hd": ma_hd},
        message="Dashboard cần cập nhật sau update tín chấp"
    )
    
    return ApiResponse.success_response(data=tin_chap_response, message="Cập nhật hợp đồng tín chấp thành công")


@router.delete("/{ma_hd}", response_model=ApiResponse[Any])
async def delete_tin_chap(ma_hd: str, db: Session = Depends(get_db)):
    """Delete a TinChap contract"""
    success = crud_tin_chap.delete_tin_chap(db=db, ma_hd=ma_hd)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng tín chấp")
    
    # Broadcast WebSocket event
    await broadcast_tin_chap_event(
        manager=manager,
        event_type=EventType.TIN_CHAP_DELETED,
        tin_chap_data={"MaHD": ma_hd},
        message=f"Xóa hợp đồng tín chấp {ma_hd} thành công"
    )
    
    # Trigger dashboard update
    await broadcast_dashboard_update(
        manager=manager,
        dashboard_data={"action": "tin_chap_deleted", "ma_hd": ma_hd},
        message="Dashboard cần cập nhật sau xóa tín chấp"
    )
    
    return ApiResponse.success_response(data={"MaHD": ma_hd}, message="Xóa hợp đồng tín chấp thành công")

@router.put("/tra-goc/{ma_hd}", response_model=ApiResponse[Any])
async def tra_goc_tin_chap(
    ma_hd: str, 
    so_tien_tra_goc: int,
    db: Session = Depends(get_db)):
    """Trả gốc hợp đồng tín chấp"""
    success = crud_tin_chap.tra_goc_tin_chap(db=db, ma_hd=ma_hd, so_tien_tra_goc=so_tien_tra_goc)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng tín chấp")
    
    # Broadcast WebSocket event
    await broadcast_tin_chap_event(
        manager=manager,
        event_type=EventType.TIN_CHAP_UPDATED,
        tin_chap_data={"MaHD": ma_hd, "so_tien_tra_goc": so_tien_tra_goc},
        message=f"Trả gốc hợp đồng tín chấp {ma_hd} thành công"
    )
    
    return ApiResponse.success_response(data={"MaHD": ma_hd}, message="Trả gốc hợp đồng tín chấp thành công")