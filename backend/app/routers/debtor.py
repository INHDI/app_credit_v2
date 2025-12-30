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
    
    tin_chap_list = []
    for tc in tin_chap_contracts:
        # Calculate details
        lich_sus = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == tc.MaHD).all()
        lai_da_tra = sum(ls.TienDaTra for ls in lich_sus)
        goc_con_lai = 0
        if tc:
            goc_con_lai = tc.SoTienVay - (tc.SoTienTraGoc or 0)
        
        # Calculate remaining interest logic (simplified from crud)
        total_interest_due = sum(ls.SoTien for ls in lich_sus)
        # Check if paid up to today
        # today = date.today()
        # lich_sus_to_day = [ls for ls in lich_sus if ls.Ngay >= today and ls.TrangThaiThanhToan == "Đóng đủ"]
        # Simplified:
        lai_con_lai = max(0, total_interest_due - lai_da_tra)

        tin_chap_list.append({
            "MaHD": tc.MaHD,
            "HoTen": tc.HoTen,
            "NgayVay": str(tc.NgayVay),
            "SoTienVay": tc.SoTienVay,
            "KyDong": tc.KyDong,
            "LaiSuat": tc.LaiSuat,
            "TrangThai": tc.TrangThai,
            "LoaiHopDong": "Tín chấp",
            "LaiDaTra": lai_da_tra,
            "GocConLai": goc_con_lai,
            "LaiConLai": lai_con_lai
        })

    tra_gop_list = []
    for tg in tra_gop_contracts:
        # Calculate details
        histories = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == tg.MaHD).all()
        da_thanh_toan = sum(h.TienDaTra for h in histories)
        tong_phai_tra = sum(h.SoTien for h in histories)
        con_lai = max(0, tong_phai_tra - da_thanh_toan)

        tra_gop_list.append({
            "MaHD": tg.MaHD,
            "HoTen": tg.HoTen,
            "NgayVay": str(tg.NgayVay),
            "SoTienVay": tg.SoTienVay,
            "KyDong": tg.KyDong,
            "SoLanTra": tg.SoLanTra,
            "LaiSuat": tg.LaiSuat,
            "TrangThai": tg.TrangThai,
            "LoaiHopDong": "Trả góp",
            "DaThanhToan": da_thanh_toan, # General paid
            "ConLai": con_lai, # General remaining
            # Map to common fields for frontend table convenience if needed
            "LaiDaTra": da_thanh_toan, 
            "GocConLai": con_lai, # Using GocConLai as "Total Remaining" for TraGop to fit table structure
            "LaiConLai": 0 # Not applicable separate interest for TraGop in this table view usually
        })

    result = {
        "tin_chap": tin_chap_list,
        "tra_gop": tra_gop_list,
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
    # Note: LaiSuat might be rate or amount. Summing it might not represent Total Interest Amount directly if it's a rate. 
    # But sticking to existing logic for now unless 'LaiSuat' field is confirmed to be amount.
    total_interest = sum(tc.LaiSuat for tc in tin_chap_contracts) + sum(tg.LaiSuat for tg in tra_gop_contracts)
    
    # Get all payment history for these contracts
    all_history = []
    if all_contract_ids:
        all_history = db.query(LichSuTraLai).filter(
            LichSuTraLai.MaHD.in_(all_contract_ids)
        ).all()
        
    # Calculate Paid and Remaining based on history
    # Paid = Sum of TienDaTra of all records
    total_paid = sum(p.TienDaTra for p in all_history)
    
    # Remaining = Sum of (SoTien - TienDaTra) for all records where SoTien > TienDaTra
    # This accounts for unpaid and partially paid installments
    total_remaining = sum(max(0, p.SoTien - p.TienDaTra) for p in all_history)
    
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


@router.post("/generate-qr", response_model=ApiResponse[Dict[str, str]])
async def generate_payment_qr(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DEBTOR]))
):
    """
    Generate VietQR URL for payment using VietQR.io Quick Link API (Way 2 - Recommended)
    
    Standard: EMVCo / VietQR
    Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png
    """
    import urllib.parse
    
    ma_hd = data.get("ma_hd")
    amount = data.get("amount", 0)
    
    if not ma_hd:
        raise HTTPException(status_code=400, detail="Missing MaHD")
        
    # Get System Settings
    from app.models.settings import SystemSettings, Bank
    settings = db.query(SystemSettings).first()
    
    # 1. Determine Bank Info (BIN & Account)
    # Default fallback (MBBank)
    bank_id = "970422" # MBBank BIN
    account_no = "0000000000"
    account_name = "CREDIT SYSTEM"
    template = "compact" # 'compact', 'qr_only', 'print'
    
    if settings:
        if settings.bank_account_no:
            account_no = settings.bank_account_no
        if settings.bank_account_name:
            account_name = settings.bank_account_name
            
        if settings.bank_id:
            bank = db.query(Bank).filter(Bank.id == settings.bank_id).first()
            if bank:
                # Prioritize BIN (Tag 00/01 mapping logic usually relies on BIN in standard EMVCo)
                # But VietQR QuickLink accepts Bank Code (e.g. VCB, MB) too.
                # We use BIN for best compatibility.
                bank_id = bank.bin if bank.bin else bank.code

    # 2. Construct Payment Content (Tag 62 -> 08)
    # Syntax: THANH TOAN HD <MA_HD>
    # Note: VietQR content should be unsigned (no accents) and safe characters specific for banking apps
    content = f"THANH TOAN HD {ma_hd}"
    
    # 3. URL Encode parameters
    encoded_content = urllib.parse.quote(content)
    encoded_name = urllib.parse.quote(account_name)
    
    # 4. Generate Quick Link
    qr_url = f"https://img.vietqr.io/image/{bank_id}-{account_no}-{template}.png?amount={int(amount)}&addInfo={encoded_content}&accountName={encoded_name}"
    
    return ApiResponse.success_response(
        data={"qr_url": qr_url},
        message="Tạo mã QR thành công"
    )


@router.get("/payment-history", response_model=ApiResponse[Dict[str, Any]])
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


@router.get("/contract-history/{ma_hd}", response_model=ApiResponse[List[Dict[str, Any]]])
async def get_debtor_contract_history(
    ma_hd: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DEBTOR]))
):
    """
    Get payment history for a specific contract of the debtor
    Verifies that the contract belongs to the debtor
    """
    user_id = current_user.id
    
    # Check if contract belongs to user (TinChap or TraGop)
    # Check TinChap
    tc = db.query(TinChap).filter(TinChap.MaHD == ma_hd, TinChap.user_id == user_id).first()
    if not tc:
        # Check TraGop
        tg = db.query(TraGop).filter(TraGop.MaHD == ma_hd, TraGop.user_id == user_id).first()
        if not tg:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập hợp đồng này")

    # Get history
    history = db.query(LichSuTraLai).filter(
        LichSuTraLai.MaHD == ma_hd
    ).order_by(LichSuTraLai.Ngay.asc()).all()

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
            "NoiDung": p.NoiDung, 
            "LoaiHopDong": "Tín chấp" if p.MaHD.startswith("TC") else "Trả góp"
        }
        for p in history
    ]

    return ApiResponse.success_response(
        data=result,
        message="Lấy lịch sử thanh toán hợp đồng thành công"
    )
