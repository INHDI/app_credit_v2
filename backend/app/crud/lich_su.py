"""
CRUD operations for Lich Su (History)
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Literal
from collections import defaultdict

from app.models.lich_su_tra_lai import LichSuTraLai
from app.models.tin_chap import TinChap
from app.models.tra_gop import TraGop
from app.schemas.lich_su import (
    LichSuResponse,
    LichSuStatisticsByDate,
    LichSuDetail
)
from app.core.enums import TrangThaiThanhToan


def get_lich_su(
    db: Session,
    tu_ngay: Optional[date] = None,
    den_ngay: Optional[date] = None
) -> LichSuResponse:
    """
    Get history data with statistics and details
    
    Args:
        db: Database session
        tu_ngay: Start date filter
        den_ngay: End date filter
        
    Returns:
        LichSuResponse with statistics by date and detailed records
    """
    # Base query for LichSuTraLai
    query = db.query(LichSuTraLai)
    
    # Apply date filters
    if tu_ngay:
        query = query.filter(LichSuTraLai.Ngay >= tu_ngay)
    if den_ngay:
        query = query.filter(LichSuTraLai.Ngay <= den_ngay)
    
    # Get all records for statistics (before pagination)
    all_lich_su = query.all()
    
    # Calculate statistics by date
    stats_by_date = defaultdict(lambda: {"da_tra": 0, "chua_tra": 0})
    
    for ls in all_lich_su:
        date_key = ls.Ngay
        if ls.TrangThaiThanhToan == TrangThaiThanhToan.DONG_DU.value or \
           ls.TrangThaiThanhToan == TrangThaiThanhToan.DA_TAT_TOAN.value:
            stats_by_date[date_key]["da_tra"] += 1
        else:
            stats_by_date[date_key]["chua_tra"] += 1
    
    # Convert statistics to list and sort by date
    statistics = []
    for ngay in sorted(stats_by_date.keys()):
        statistics.append(
            LichSuStatisticsByDate(
                ngay=ngay,
                so_nguoi_da_tra=stats_by_date[ngay]["da_tra"],
                so_nguoi_chua_tra=stats_by_date[ngay]["chua_tra"]
            )
        )
    
    # Apply date filter for details (no search, no pagination)
    detail_query = db.query(LichSuTraLai)
    if tu_ngay:
        detail_query = detail_query.filter(LichSuTraLai.Ngay >= tu_ngay)
    if den_ngay:
        detail_query = detail_query.filter(LichSuTraLai.Ngay <= den_ngay)
    
    # Order by date desc, then by Stt desc - get ALL records
    lich_su_list = detail_query.order_by(
        LichSuTraLai.Ngay.desc(),
        LichSuTraLai.Stt.desc()
    ).all()
    
    # Get total count
    total_records = len(lich_su_list)
    
    # Build detailed records with HoTen from TinChap/TraGop
    details = []
    for ls in lich_su_list:
        # Get contract info to find HoTen and LoaiHopDong
        ho_ten = ""
        loai_hop_dong = ""
        
        # Check if MaHD starts with TC (Tín Chấp)
        if ls.MaHD.startswith("TC"):
            tin_chap = db.query(TinChap).filter(TinChap.MaHD == ls.MaHD).first()
            if tin_chap:
                ho_ten = tin_chap.HoTen
                loai_hop_dong = "Tín chấp"
        # Check if MaHD starts with TG (Trả Góp)
        elif ls.MaHD.startswith("TG"):
            tra_gop = db.query(TraGop).filter(TraGop.MaHD == ls.MaHD).first()
            if tra_gop:
                ho_ten = tra_gop.HoTen
                loai_hop_dong = "Trả góp"
        
        details.append(
            LichSuDetail(
                stt=ls.Stt,
                ngay=ls.Ngay,
                ma_hd=ls.MaHD,
                ho_ten=ho_ten,
                so_tien_thanh_toan=ls.TienDaTra,
                loai_hop_dong=loai_hop_dong,
                trang_thai=ls.TrangThaiThanhToan
            )
        )
    
    return LichSuResponse(
        statistics=statistics,
        details=details,
        total_records=total_records
    )


def _load_contract(db: Session, ma_hd: str) -> Optional[Dict]:
    """
    Load contract information by MaHD
    
    Returns dict with contract_type and interest_per_period
    """
    if ma_hd.startswith("TC"):
        contract = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
        if contract:
            return {
                "contract_type": "tin_chap",
                "interest_per_period": contract.LaiSuat,
                "so_tien_vay": contract.SoTienVay,
                "ngay_vay": contract.NgayVay,
            }
    elif ma_hd.startswith("TG"):
        contract = db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()
        if contract:
            return {
                "contract_type": "tra_gop",
                "interest_per_period": contract.LaiSuat,
                "so_tien_vay": contract.SoTienVay,
                "ngay_vay": contract.NgayVay,
            }
    return None


def _get_week_start(d: date) -> date:
    """Get the Monday of the week containing date d"""
    return d - timedelta(days=d.weekday())


def _get_month_start(d: date) -> date:
    """Get the first day of the month containing date d"""
    return date(d.year, d.month, 1)


def _get_bucket_key(d: date, granularity: str) -> str:
    """Get the bucket key for grouping based on granularity"""
    if granularity == "daily":
        return d.isoformat()
    elif granularity == "weekly":
        week_start = _get_week_start(d)
        return week_start.isoformat()
    elif granularity == "monthly":
        month_start = _get_month_start(d)
        return month_start.isoformat()
    return d.isoformat()


def get_financial_statistics(
    db: Session,
    granularity: Literal["daily", "weekly", "monthly"],
    start_date: date,
    end_date: date,
) -> Dict:
    """
    Tổng hợp thống kê tài chính cho màn hình Thống kê
    
    Args:
        db: Database session
        granularity: Time granularity (daily, weekly, monthly)
        start_date: Start date
        end_date: End date
        
    Returns:
        Dict with meta, summary, breakdown, trend, top_outstanding
    """
    if end_date < start_date:
        raise ValueError("end_date must be greater than or equal to start_date")
    
    # Initialize trend buckets
    trend_buckets = defaultdict(lambda: {
        "bucket": "",
        "tong_tien_chi": 0.0,  # Disbursed (SoTienVay)
        "tong_tien_thu": 0.0,  # Collected (TienDaTra)
        "tong_tien_lai": 0.0,  # Interest
        "breakdown": {"tin_chap": 0.0, "tra_gop": 0.0}
    })
    
    # Get all contracts in date range
    tin_chaps = db.query(TinChap).filter(
        TinChap.NgayVay >= start_date,
        TinChap.NgayVay <= end_date
    ).all()
    
    tra_gops = db.query(TraGop).filter(
        TraGop.NgayVay >= start_date,
        TraGop.NgayVay <= end_date
    ).all()
    
    # Calculate disbursed amount by period
    for tc in tin_chaps:
        bucket_key = _get_bucket_key(tc.NgayVay, granularity)
        trend_buckets[bucket_key]["bucket"] = bucket_key
        trend_buckets[bucket_key]["tong_tien_chi"] += float(tc.SoTienVay)
        trend_buckets[bucket_key]["breakdown"]["tin_chap"] += float(tc.SoTienVay)
    
    for tg in tra_gops:
        bucket_key = _get_bucket_key(tg.NgayVay, granularity)
        trend_buckets[bucket_key]["bucket"] = bucket_key
        trend_buckets[bucket_key]["tong_tien_chi"] += float(tg.SoTienVay)
        trend_buckets[bucket_key]["breakdown"]["tra_gop"] += float(tg.SoTienVay)
    
    # Calculate collected amount and interest from payment history
    paid_records = db.query(LichSuTraLai).filter(
        LichSuTraLai.Ngay >= start_date,
        LichSuTraLai.Ngay <= end_date,
        or_(
            LichSuTraLai.TrangThaiThanhToan == TrangThaiThanhToan.DONG_DU.value,
            LichSuTraLai.TrangThaiThanhToan == TrangThaiThanhToan.DA_TAT_TOAN.value
        )
    ).all()
    
    breakdown = {
        "tin_chap": {"disbursed": 0.0, "collected": 0.0, "interest": 0.0},
        "tra_gop": {"disbursed": 0.0, "collected": 0.0, "interest": 0.0}
    }
    
    for record in paid_records:
        if not record.MaHD:
            continue
        
        contract = _load_contract(db, record.MaHD)
        if not contract:
            continue
        
        bucket_key = _get_bucket_key(record.Ngay, granularity)
        paid_amount = float(record.TienDaTra)
        interest_amount = float(contract["interest_per_period"])
        ctype = contract["contract_type"]
        
        # Add to trend
        trend_buckets[bucket_key]["bucket"] = bucket_key
        trend_buckets[bucket_key]["tong_tien_thu"] += paid_amount
        trend_buckets[bucket_key]["tong_tien_lai"] += interest_amount
        
        # Add to breakdown
        breakdown[ctype]["collected"] += paid_amount
        breakdown[ctype]["interest"] += interest_amount
    
    # Add disbursed to breakdown
    for tc in tin_chaps:
        breakdown["tin_chap"]["disbursed"] += float(tc.SoTienVay)
    for tg in tra_gops:
        breakdown["tra_gop"]["disbursed"] += float(tg.SoTienVay)
    
    # Calculate outstanding contracts and overdue
    outstanding_records = db.query(LichSuTraLai).filter(
        or_(
            LichSuTraLai.TrangThaiThanhToan == TrangThaiThanhToan.CHUA_THANH_TOAN.value,
            LichSuTraLai.TrangThaiThanhToan == TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
        )
    ).all()
    
    active_contracts = set()
    overdue_contracts = set()
    overdue_amount = 0.0
    outstanding_amounts = defaultdict(float)
    outstanding_contract_types = {}
    
    for record in outstanding_records:
        if not record.MaHD:
            continue
        
        amount_due = float(record.SoTien - record.TienDaTra)
        if amount_due <= 0:
            continue
        
        contract = _load_contract(db, record.MaHD)
        contract_type = contract["contract_type"] if contract else "unknown"
        
        active_contracts.add(record.MaHD)
        outstanding_amounts[record.MaHD] += amount_due
        outstanding_contract_types[record.MaHD] = contract_type
        
        # Check if overdue
        due_date = record.Ngay
        if due_date and due_date < end_date:
            overdue_contracts.add(record.MaHD)
            overdue_amount += amount_due
    
    # Top 5 outstanding contracts
    top_outstanding = sorted(
        [
            {
                "ma_hop_dong": ma_hd,
                "amount": amount,
                "contract_type": outstanding_contract_types.get(ma_hd),
                "is_overdue": ma_hd in overdue_contracts,
            }
            for ma_hd, amount in outstanding_amounts.items()
        ],
        key=lambda item: item["amount"],
        reverse=True,
    )[:5]
    
    # Convert trend buckets to sorted list
    trend = sorted(trend_buckets.values(), key=lambda x: x["bucket"])
    
    # Calculate summary
    summary_disbursed = sum(item["tong_tien_chi"] for item in trend)
    summary_collected = sum(item["tong_tien_thu"] for item in trend)
    summary_interest = sum(item["tong_tien_lai"] for item in trend)
    
    # Calculate expected total (principal + interest)
    summary_expected = summary_disbursed + summary_interest
    
    summary = {
        "total_disbursed": float(summary_disbursed),
        "total_collected": float(summary_collected),
        "total_interest": float(summary_interest),
        "total_expected": float(summary_expected),  # New field: principal + interest
        "net_cash_flow": float(summary_collected - summary_disbursed),  # Real money - disbursed
        "active_contracts": len(active_contracts),
        "overdue_contracts": len(overdue_contracts),
        "overdue_amount": float(overdue_amount),
    }
    
    return {
        "meta": {
            "granularity": granularity,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "bucket_count": len(trend),
        },
        "summary": summary,
        "breakdown": breakdown,
        "trend": trend,
        "top_outstanding": top_outstanding,
    }

