"""
LichSuTraLai API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.database import get_db
from app.schemas.lich_su_tra_lai import LichSuTraLai
from app.schemas.response import ApiResponse
from app.crud import lich_su_tra_lai as crud_lich_su
from app.websocket import manager, EventType, broadcast_lich_su_tra_lai_event, broadcast_dashboard_update

router = APIRouter(
    prefix="/lich-su-tra-lai",
    tags=["Lịch sử trả lãi"]
)


@router.post("", response_model=ApiResponse[Any], status_code=201)
async def create_lich_su( 
    db: Session = Depends(get_db),
    ma_hd: str = ""
):
    """Create payment history records for a contract"""
    result = crud_lich_su.create_lich_su(db=db, ma_hd=ma_hd)
    
    # Broadcast WebSocket event
    await broadcast_lich_su_tra_lai_event(
        manager=manager,
        event_type=EventType.LICH_SU_TRA_LAI_CREATED,
        lich_su_data={"ma_hd": ma_hd, "result": result},
        message=f"Tạo lịch sử trả lãi cho hợp đồng {ma_hd} thành công"
    )
    
    return ApiResponse.success_response(data=result, message="Tạo lịch sử trả lãi thành công")


@router.get("", response_model=ApiResponse[List[LichSuTraLai]])
async def get_all_lich_su(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all payment history records"""
    result = crud_lich_su.get_lich_sus(db=db, skip=skip, limit=limit)
    # Convert list of SQLAlchemy models to Pydantic schemas
    lich_sus_response = [LichSuTraLai.model_validate(ls) for ls in result]
    return ApiResponse.success_response(data=lich_sus_response, message="Lấy danh sách lịch sử trả lãi thành công")


@router.get("/{stt}", response_model=ApiResponse[LichSuTraLai])
async def get_lich_su_by_id(stt: int, db: Session = Depends(get_db)):
    """Get a specific payment history record by STT"""
    lich_su = crud_lich_su.get_lich_su(db=db, stt=stt)
    if not lich_su:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử trả lãi")
    # Convert SQLAlchemy model to Pydantic schema
    lich_su_response = LichSuTraLai.model_validate(lich_su)
    return ApiResponse.success_response(data=lich_su_response, message="Lấy thông tin lịch sử trả lãi thành công")


@router.get("/contract/{ma_hd}", response_model=ApiResponse[List[LichSuTraLai]])
async def get_lich_su_by_contract(ma_hd: str, db: Session = Depends(get_db)):
    """Get all payment history records for a specific contract"""
    result = crud_lich_su.get_lich_sus_by_contract(db=db, ma_hd=ma_hd)
    # Convert list of SQLAlchemy models to Pydantic schemas
    lich_sus_response = [LichSuTraLai.model_validate(ls) for ls in result]
    return ApiResponse.success_response(data=lich_sus_response, message="Lấy lịch sử trả lãi theo hợp đồng thành công")


@router.delete("/{stt}", response_model=ApiResponse[Any])
async def delete_lich_su(stt: int, db: Session = Depends(get_db)):
    """Delete a payment history record"""
    success = crud_lich_su.delete_lich_su(db=db, stt=stt)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử trả lãi")
    
    # Broadcast WebSocket event
    await broadcast_lich_su_tra_lai_event(
        manager=manager,
        event_type=EventType.LICH_SU_TRA_LAI_DELETED,
        lich_su_data={"stt": stt},
        message=f"Xóa lịch sử trả lãi kỳ {stt} thành công"
    )
    
    return ApiResponse.success_response(data={"Stt": stt}, message="Xóa lịch sử trả lãi thành công")


@router.delete("/contract/{ma_hd}", response_model=ApiResponse[Any])
async def delete_lich_su_by_contract(ma_hd: str, db: Session = Depends(get_db)):
    """Delete all payment history records for a specific contract"""
    so_ban_ghi_da_xoa = crud_lich_su.delete_lich_sus_by_contract(db=db, ma_hd=ma_hd)
    if so_ban_ghi_da_xoa == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử trả lãi cho hợp đồng này")
    
    # Broadcast WebSocket event
    await broadcast_lich_su_tra_lai_event(
        manager=manager,
        event_type=EventType.LICH_SU_TRA_LAI_DELETED,
        lich_su_data={"ma_hd": ma_hd, "records_deleted": so_ban_ghi_da_xoa},
        message=f"Xóa {so_ban_ghi_da_xoa} bản ghi lịch sử trả lãi cho hợp đồng {ma_hd}"
    )
    
    return ApiResponse.success_response(
        data={"MaHD": ma_hd, "records_deleted": so_ban_ghi_da_xoa}, 
        message=f"Xóa {so_ban_ghi_da_xoa} bản ghi lịch sử trả lãi cho hợp đồng {ma_hd} thành công"
    )

@router.post("/pay/{stt}", response_model=ApiResponse[Any])
async def pay_lich_su(
    stt: int,
    so_tien: int,
    db: Session = Depends(get_db)
):
    """Pay a payment history record"""
    result = crud_lich_su.pay_lich_su(db=db, stt=stt, so_tien=so_tien)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử trả lãi")
    
    # Broadcast WebSocket event - quan trọng cho real-time updates!
    await broadcast_lich_su_tra_lai_event(
        manager=manager,
        event_type=EventType.LICH_SU_TRA_LAI_UPDATED,
        lich_su_data={"stt": stt, "so_tien": so_tien, "result": result},
        message=f"Thanh toán {so_tien:,} VNĐ cho kỳ {stt} thành công"
    )
    
    # Also trigger dashboard update
    await broadcast_dashboard_update(
        manager=manager,
        dashboard_data={"action": "payment", "stt": stt, "amount": so_tien},
        message="Dashboard cần cập nhật sau thanh toán"
    )
    
    return ApiResponse.success_response(data=result, message="Thanh toán lịch sử trả lãi thành công")

@router.post("/auto-create-lich-su", response_model=ApiResponse[Any])
async def auto_create_lich_su(db: Session = Depends(get_db)):
    """Auto create payment history records for all contracts"""
    result = crud_lich_su.auto_create_lich_su(db=db)
    return ApiResponse.success_response(data=result, message="Tự động cập nhật lịch sử trả lãi thành công")


@router.post("/pay-full/{ma_hd}", response_model=ApiResponse[Any])
async def pay_full_lich_su(
    ma_hd: str,
    db: Session = Depends(get_db)
):
    """Pay full payment history records for a specific contract"""
    result = crud_lich_su.tat_toan_hop_dong(db=db, ma_hd=ma_hd)
    
    # Broadcast WebSocket event cho tất toán
    await broadcast_lich_su_tra_lai_event(
        manager=manager,
        event_type=EventType.LICH_SU_TRA_LAI_UPDATED,
        lich_su_data={"ma_hd": ma_hd, "action": "pay_full", "result": result},
        message=f"Tất toán hợp đồng {ma_hd} thành công"
    )
    
    # Trigger dashboard update
    await broadcast_dashboard_update(
        manager=manager,
        dashboard_data={"action": "pay_full", "ma_hd": ma_hd},
        message="Dashboard cần cập nhật sau tất toán"
    )
    
    return ApiResponse.success_response(data=result, message="Tất toán hợp đồng thành công")