"""
Debtor Portal API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any
from datetime import date

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.core.enums import UserRole
from app.schemas.response import ApiResponse
from app.models.user import User
from app.models.tin_chap import TinChap
from app.models.tra_gop import TraGop
from app.models.lich_su_tra_lai import LichSuTraLai

router = APIRouter(
    prefix="/debtor",
    tags=["Debtor Portal"]
)


@router.get("/contracts", response_model=ApiResponse[Dict[str, Any]])
async def get_debtor_contracts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DEBTOR]))
):
    """
    Get all contracts associated with the current debtor user
    """
    user_id = current_user.id
    
    # Get TinChap contracts
    tin_chap_contracts = db.query(TinChap).filter(TinChap.user_id == user_id).all()
    
    # Get TraGop contracts
    tra_gop_contracts = db.query(TraGop).filter(TraGop.user_id == user_id).all()
    
    result = {
        "tin_chap": [
            {
                "MaHD": tc.MaHD,
                "HoTen": tc.HoTen,
                "NgayVay": str(tc.NgayVay),
                "SoTienVay": tc.SoTienVay,
                "KyDong": tc.KyDong,
                "LaiSuat": tc.LaiSuat,
                "TrangThai": tc.TrangThai,
                "LoaiHopDong": "Tín chấp"
            }
            for tc in tin_chap_contracts
        ],
        "tra_gop": [
            {
                "MaHD": tg.MaHD,
                "HoTen": tg.HoTen,
                "NgayVay": str(tg.NgayVay),
                "SoTienVay": tg.SoTienVay,
                "KyDong": tg.KyDong,
                "SoLanTra": tg.SoLanTra,
                "LaiSuat": tg.LaiSuat,
                "TrangThai": tg.TrangThai,
                "LoaiHopDong": "Trả góp"
            }
            for tg in tra_gop_contracts
        ],
        "total_contracts": len(tin_chap_contracts) + len(tra_gop_contracts)
    }
    
    return ApiResponse.success_response(
        data=result,
        message="Lấy danh sách hợp đồng thành công"
    )


@router.get("/payment-schedule", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_payment_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DEBTOR]))
):
    """
    Get upcoming payment schedule for the current debtor user
    """
    user_id = current_user.id
    today = date.today()
    
    # Get contract IDs for this user
    tin_chap_ids = [tc.MaHD for tc in db.query(TinChap.MaHD).filter(TinChap.user_id == user_id).all()]
    tra_gop_ids = [tg.MaHD for tg in db.query(TraGop.MaHD).filter(TraGop.user_id == user_id).all()]
    all_contract_ids = tin_chap_ids + tra_gop_ids
    
    if not all_contract_ids:
        return ApiResponse.success_response(
            data=[],
            message="Không có lịch trả lãi"
        )
    
    # Get upcoming payment records
    payment_schedule = db.query(LichSuTraLai).filter(
        LichSuTraLai.MaHD.in_(all_contract_ids),
        LichSuTraLai.ThanhToan == False,
        LichSuTraLai.Ngay >= today
    ).order_by(LichSuTraLai.Ngay.asc()).limit(20).all()
    
    result = [
        {
            "Stt": p.Stt,
            "MaHD": p.MaHD,
            "Ngay": str(p.Ngay),
            "SoTien": p.SoTien,
            "TrangThaiThanhToan": p.TrangThaiThanhToan,
            "TrangThaiNgayThanhToan": p.TrangThaiNgayThanhToan,
            "LoaiHopDong": "Tín chấp" if p.MaHD.startswith("TC") else "Trả góp"
        }
        for p in payment_schedule
    ]
    
    return ApiResponse.success_response(
        data=result,
        message="Lấy lịch trả lãi thành công"
    )


@router.get("/summary", response_model=ApiResponse[Dict[str, Any]])
async def get_debtor_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DEBTOR]))
):
    """
    Get debt summary for the current debtor user:
    - Total borrowed amount
    - Total amount paid
    - Total amount remaining
    - Number of contracts
    """
    user_id = current_user.id
    
    # Get TinChap contracts
    tin_chap_contracts = db.query(TinChap).filter(TinChap.user_id == user_id).all()
    
    # Get TraGop contracts
    tra_gop_contracts = db.query(TraGop).filter(TraGop.user_id == user_id).all()
    
    all_contract_ids = [tc.MaHD for tc in tin_chap_contracts] + [tg.MaHD for tg in tra_gop_contracts]
    
    # Calculate totals
    total_borrowed = sum(tc.SoTienVay for tc in tin_chap_contracts) + sum(tg.SoTienVay for tg in tra_gop_contracts)
    total_interest = sum(tc.LaiSuat for tc in tin_chap_contracts) + sum(tg.LaiSuat for tg in tra_gop_contracts)
    
    # Get amount paid from payment history
    total_paid = 0
    if all_contract_ids:
        paid_records = db.query(LichSuTraLai).filter(
            LichSuTraLai.MaHD.in_(all_contract_ids),
            LichSuTraLai.ThanhToan == True
        ).all()
        total_paid = sum(p.TienDaTra for p in paid_records)
    
    # Get amount remaining (unpaid payments)
    total_remaining = 0
    if all_contract_ids:
        unpaid_records = db.query(LichSuTraLai).filter(
            LichSuTraLai.MaHD.in_(all_contract_ids),
            LichSuTraLai.ThanhToan == False
        ).all()
        total_remaining = sum(p.SoTien for p in unpaid_records)
    
    result = {
        "tong_vay": total_borrowed,
        "tong_lai": total_interest,
        "da_tra": total_paid,
        "con_lai": total_remaining,
        "so_hop_dong_tin_chap": len(tin_chap_contracts),
        "so_hop_dong_tra_gop": len(tra_gop_contracts),
        "tong_hop_dong": len(all_contract_ids)
    }
    
    return ApiResponse.success_response(
        data=result,
        message="Lấy tổng hợp nợ thành công"
    )


@router.get("/payment-history", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_payment_history(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DEBTOR]))
):
    """
    Get payment history for the current debtor user
    """
    user_id = current_user.id
    
    # Get contract IDs for this user
    tin_chap_ids = [tc.MaHD for tc in db.query(TinChap.MaHD).filter(TinChap.user_id == user_id).all()]
    tra_gop_ids = [tg.MaHD for tg in db.query(TraGop.MaHD).filter(TraGop.user_id == user_id).all()]
    all_contract_ids = tin_chap_ids + tra_gop_ids
    
    if not all_contract_ids:
        return ApiResponse.success_response(
            data=[],
            message="Không có lịch sử thanh toán"
        )
    
    # Get payment history with pagination
    offset = (page - 1) * page_size
    payment_history = db.query(LichSuTraLai).filter(
        LichSuTraLai.MaHD.in_(all_contract_ids)
    ).order_by(LichSuTraLai.Ngay.desc()).offset(offset).limit(page_size).all()
    
    # Get total count
    total_count = db.query(LichSuTraLai).filter(
        LichSuTraLai.MaHD.in_(all_contract_ids)
    ).count()
    
    result = [
        {
            "Stt": p.Stt,
            "MaHD": p.MaHD,
            "Ngay": str(p.Ngay),
            "SoTien": p.SoTien,
            "TienDaTra": p.TienDaTra,
            "ThanhToan": p.ThanhToan,
            "TrangThaiThanhToan": p.TrangThaiThanhToan,
            "TrangThaiNgayThanhToan": p.TrangThaiNgayThanhToan,
            "LoaiHopDong": "Tín chấp" if p.MaHD.startswith("TC") else "Trả góp"
        }
        for p in payment_history
    ]
    
    return ApiResponse.success_response(
        data={
            "items": result,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        },
        message="Lấy lịch sử thanh toán thành công"
    )
