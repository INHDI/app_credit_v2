"""
LichSuTraLai API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin, require_admin_or_collector
from app.core.enums import UserRole
from app.models.user import User
from app.schemas.lich_su_tra_lai import LichSuTraLai
from app.schemas.no_phai_thu import NoPhaiThuResponse
from app.schemas.response import ApiResponse
from app.crud import lich_su_tra_lai as crud_lich_su, no_phai_thu as crud_no_phai_thu
from app.websocket import broadcast_tin_chap_event, broadcast_tra_gop_event, manager, EventType, broadcast_lich_su_tra_lai_event, broadcast_dashboard_update
from datetime import date

router = APIRouter(
    prefix="/lich-su-tra-lai",
    tags=["Lịch sử trả lãi"]
)


@router.post("", response_model=ApiResponse[Any], status_code=201)
async def create_lich_su( 
    db: Session = Depends(get_db),
    ma_hd: str = "",
    current_user: User = Depends(require_admin_or_collector)
):
    """Create payment history records for a contract (Admin and Collector)"""
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
async def get_all_lich_su(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Get all payment history records (Admin and Collector)"""
    result = crud_lich_su.get_lich_sus(db=db, skip=skip, limit=limit)
    # Convert list of SQLAlchemy models to Pydantic schemas
    lich_sus_response = [LichSuTraLai.model_validate(ls) for ls in result]
    return ApiResponse.success_response(data=lich_sus_response, message="Lấy danh sách lịch sử trả lãi thành công")


@router.delete("/delete_thanh_toan", response_model=ApiResponse[Any])
async def delete_thanh_toan(
    ma_hd: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Delete payment history from date todate (Admin and Collector)"""
    result = crud_lich_su.delete_thanh_toan(db=db, ma_hd=ma_hd)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử trả lãi")

    await broadcast_lich_su_tra_lai_event(
        manager=manager,
        event_type=EventType.LICH_SU_TRA_LAI_DELETED,
        lich_su_data={"ma_hd": ma_hd, "result": result},
        message=f"Xóa thanh toán lãi ngày hiện tại cho hợp đồng {ma_hd}"
    )
    await broadcast_dashboard_update(
        manager=manager,
        dashboard_data={"action": "delete_payment", "ma_hd": ma_hd},
        message="Dashboard cần cập nhật sau khi xóa thanh toán"
    )
    return ApiResponse.success_response(data=result, message="Xóa thanh toán lịch sử trả lãi thành công")


@router.get("/{stt}", response_model=ApiResponse[LichSuTraLai])
async def get_lich_su_by_id(
    stt: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Get a specific payment history record by STT (Admin and Collector)"""
    lich_su = crud_lich_su.get_lich_su(db=db, stt=stt)
    if not lich_su:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử trả lãi")
    # Convert SQLAlchemy model to Pydantic schema
    lich_su_response = LichSuTraLai.model_validate(lich_su)
    return ApiResponse.success_response(data=lich_su_response, message="Lấy thông tin lịch sử trả lãi thành công")


@router.get("/contract/{ma_hd}", response_model=ApiResponse[List[LichSuTraLai]])
async def get_lich_su_by_contract(
    ma_hd: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Get all payment history records for a specific contract (Admin and Collector)"""
    result = crud_lich_su.get_lich_sus_by_contract(db=db, ma_hd=ma_hd)
    # Convert list of SQLAlchemy models to Pydantic schemas
    lich_sus_response = [LichSuTraLai.model_validate(ls) for ls in result]
    return ApiResponse.success_response(data=lich_sus_response, message="Lấy lịch sử trả lãi theo hợp đồng thành công")


@router.delete("/{stt}", response_model=ApiResponse[Any])
async def delete_lich_su(
    stt: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a payment history record (Admin only)"""
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
async def delete_lich_su_by_contract(
    ma_hd: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete all payment history records for a specific contract (Admin only)"""
    so_ban_ghi_da_xoa = crud_lich_su.delete_lich_sus_by_contract(db=db, ma_hd=ma_hd)
    
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
    
@router.delete("/contract/update/{ma_hd}", response_model=ApiResponse[Any])
async def update_lich_su_by_contract(
    ma_hd: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete all payment history records for a specific contract (Admin only)"""
    so_ban_ghi_da_xoa = crud_lich_su.update_lich_sus_by_contract(db=db, ma_hd=ma_hd)
    if so_ban_ghi_da_xoa == 0:
        return ApiResponse.success_response(
            data={"MaHD": ma_hd, "records_deleted": so_ban_ghi_da_xoa}, 
            message=f"Cập nhật lịch sử trả lãi cho hợp đồng {ma_hd} thành công"
            )
    
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Pay a payment history record (Admin and Collector)"""
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

@router.post("/payHD/{ma_hd}", response_model=ApiResponse[Any])
async def pay_lich_su_by_contract(
    ma_hd: str,
    so_tien: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Pay a payment history record by contract (Admin and Collector)"""
    result = crud_lich_su.pay_lich_su_by_contract(db=db, ma_hd=ma_hd, so_tien=so_tien)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử trả lãi cho hợp đồng này")
    
    # Broadcast WebSocket event - quan trọng cho real-time updates!
    await broadcast_lich_su_tra_lai_event(
        manager=manager,
        event_type=EventType.LICH_SU_TRA_LAI_UPDATED,
        lich_su_data={"ma_hd": ma_hd, "so_tien": so_tien, "result": result},
        message=f"Thanh toán {so_tien:,} VNĐ cho hợp đồng {ma_hd} thành công"
    )
    
    # Also trigger dashboard update
    await broadcast_dashboard_update(
        manager=manager,
        dashboard_data={"action": "payment", "ma_hd": ma_hd, "amount": so_tien},
        message="Dashboard cần cập nhật sau thanh toán"
    )
    
    return ApiResponse.success_response(data=result, message="Thanh toán lịch sử trả lãi thành công")

@router.post("/auto-create-lich-su", response_model=ApiResponse[Any])
async def auto_create_lich_su(db: Session = Depends(get_db)):
    """Auto create payment history records for all contracts (No auth - for scheduler)"""
    from app.services.notification import send_telegram_notification, format_daily_payment_reminder
    
    result = crud_lich_su.auto_create_lich_su(db=db)
    
    # Get no phai thu today
    time = "today"
    no_phai_thu = crud_no_phai_thu.get_no_phai_thus(db=db, time=time)
    
    # Collect payment reminders for today
    payments_today = []
    for i in no_phai_thu:
        for j in i.LichSuTraLai:
            if j["Ngay"] == date.today():
                payments_today.append({
                    "ma_hd": i.MaHD,
                    "ho_ten": i.HoTen,
                    "ngay": j["Ngay"],
                    "so_tien": j["SoTien"]
                })
    
    # Send Telegram notification if there are payments today
    telegram_result = {"success": False, "message": "Không có khoản nợ cần thu hôm nay"}
    if payments_today:
        message = format_daily_payment_reminder(payments_today)
        telegram_result = await send_telegram_notification(db, message)
    
    # Send individual notifications to debtors
    from app.services.notification import notify_all_debtors_due_today
    individual_results = await notify_all_debtors_due_today(db)
    
    return ApiResponse.success_response(
        data={
            "lich_su_result": result,
            "payments_today": payments_today,
            "telegram": telegram_result,
            "individual_notifications": individual_results
        }, 
        message="Tự động cập nhật lịch sử trả lãi và gửi thông báo thành công"
    )


@router.post("/pay-full/{ma_hd}", response_model=ApiResponse[Any])
async def pay_full_lich_su(
    ma_hd: str,
    tien_lai: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Pay full payment history records for a specific contract (Admin and Collector).

    Optional query param `tien_lai` allows specifying how much interest is being paid now.
    """
    result = crud_lich_su.tat_toan_hop_dong(db=db, ma_hd=ma_hd, tien_lai=tien_lai)
    
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

@router.put("/{ma_hd}", response_model=ApiResponse[Any])
async def update_lich_su(
    ma_hd: str,
    tien_da_tra: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Update a payment history record (Admin and Collector)"""
    result = crud_lich_su.update_lich_su(db=db, ma_hd=ma_hd, tien_da_tra=tien_da_tra)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử trả lãi")

    await broadcast_lich_su_tra_lai_event(
        manager=manager,
        event_type=EventType.LICH_SU_TRA_LAI_UPDATED,
        lich_su_data={"ma_hd": ma_hd, "tien_da_tra": tien_da_tra, "result": result},
        message=f"Cập nhật số tiền đã trả cho hợp đồng {ma_hd}"
    )
    await broadcast_dashboard_update(
        manager=manager,
        dashboard_data={"action": "update_payment", "ma_hd": ma_hd, "amount": tien_da_tra},
        message="Dashboard cần cập nhật sau khi sửa thanh toán"
    )
    return ApiResponse.success_response(data=result, message="Cập nhật lịch sử trả lãi thành công")


@router.post("/confirm-payment/{ma_hd}", response_model=ApiResponse[Any])
async def confirm_manual_payment(
    ma_hd: str,
    so_tien: int,
    hinh_thuc_thanh_toan: str = "Chuyển khoản",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually confirm a payment and send Telegram notification.
    Used when user confirms they have completed the bank transfer.
    """
    from app.services.notification import send_telegram_notification, format_payment_notification
    from app.core.enums import UserRole
    
    # Process the payment
    result = crud_lich_su.pay_lich_su_by_contract(db=db, ma_hd=ma_hd, so_tien=so_tien)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử trả lãi cho hợp đồng này")
    
    # Broadcast WebSocket event
    await broadcast_lich_su_tra_lai_event(
        manager=manager,
        event_type=EventType.LICH_SU_TRA_LAI_UPDATED,
        lich_su_data={"ma_hd": ma_hd, "so_tien": so_tien, "result": result, "source": "manual_confirm"},
        message=f"Xác nhận thanh toán {so_tien:,} VNĐ cho hợp đồng {ma_hd}"
    )
    
    await broadcast_dashboard_update(
        manager=manager,
        dashboard_data={"action": "payment_confirmed", "ma_hd": ma_hd, "amount": so_tien},
        message="Dashboard cần cập nhật sau xác nhận thanh toán"
    )
    
    # Send Telegram notification only when debtor confirms payment
    telegram_result = {"success": False, "message": "Chỉ gửi thông báo khi người nợ thanh toán"}
    if current_user.role == UserRole.DEBTOR.value:
        payer_name = result.get("ho_ten", "Khách hàng") if isinstance(result, dict) else "Khách hàng"
        message = format_payment_notification(ma_hd, so_tien, payer_name, hinh_thuc_thanh_toan)
        telegram_result = await send_telegram_notification(db, message)
    
    return ApiResponse.success_response(
        data={
            "payment": result,
            "telegram": telegram_result
        },
        message="Xác nhận thanh toán và gửi thông báo thành công"
    )
