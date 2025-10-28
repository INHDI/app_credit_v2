"""
CRUD operations for Lich Su (History)
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Literal
from collections import defaultdict

from app.models.lich_su_tra_lai import LichSuTraLai
from app.models.lich_su import LichSu
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
    # 1. Get payment statistics from LichSuTraLai (existing logic)
    payment_query = db.query(LichSuTraLai)
    if tu_ngay:
        payment_query = payment_query.filter(LichSuTraLai.Ngay >= tu_ngay)
    if den_ngay:
        payment_query = payment_query.filter(LichSuTraLai.Ngay <= den_ngay)
    
    all_payment_records = payment_query.all()
    
    # Calculate payment statistics by date
    payment_stats_by_date = defaultdict(lambda: {"da_tra": 0, "chua_tra": 0})
    for ls in all_payment_records:
        date_key = ls.Ngay
        if ls.TrangThaiThanhToan == TrangThaiThanhToan.DONG_DU.value or \
           ls.TrangThaiThanhToan == TrangThaiThanhToan.DA_TAT_TOAN.value:
            payment_stats_by_date[date_key]["da_tra"] += 1
        else:
            payment_stats_by_date[date_key]["chua_tra"] += 1
    
    # 2. Get action statistics from LichSu (new table)
    action_query = db.query(LichSu)
    if tu_ngay:
        action_query = action_query.filter(LichSu.ngay >= tu_ngay)
    if den_ngay:
        action_query = action_query.filter(LichSu.ngay <= den_ngay)
    
    all_action_records = action_query.all()
    
    # Calculate action statistics by date
    action_stats_by_date = defaultdict(lambda: defaultdict(lambda: {"count": 0, "total_amount": 0}))
    for ls in all_action_records:
        date_key = ls.ngay
        action_stats_by_date[date_key][ls.hanh_dong]["count"] += 1
        action_stats_by_date[date_key][ls.hanh_dong]["total_amount"] += ls.so_tien
    
    # 3. Combine statistics
    all_dates = set(payment_stats_by_date.keys()) | set(action_stats_by_date.keys())
    statistics = []
    
    for ngay in sorted(all_dates):
        payment_stats = payment_stats_by_date.get(ngay, {"da_tra": 0, "chua_tra": 0})
        action_stats = action_stats_by_date.get(ngay, {})
        
        # Convert action stats to dict format
        hanh_dong_stats = {}
        for hanh_dong, stats in action_stats.items():
            hanh_dong_stats[hanh_dong] = {
                "so_lan": stats["count"],
                "tong_tien": stats["total_amount"]
            }
        
        statistics.append(
            LichSuStatisticsByDate(
                ngay=ngay,
                so_nguoi_da_tra=payment_stats["da_tra"],
                so_nguoi_chua_tra=payment_stats["chua_tra"],
                hanh_dong_stats=hanh_dong_stats
            )
        )
    
    # 4. Get detailed records from LichSu (new table)
    detail_query = db.query(LichSu)
    if tu_ngay:
        detail_query = detail_query.filter(LichSu.ngay >= tu_ngay)
    if den_ngay:
        detail_query = detail_query.filter(LichSu.ngay <= den_ngay)
    
    # Order by date desc, then by id desc
    lich_su_list = detail_query.order_by(
        LichSu.ngay.desc(),
        LichSu.id.desc()
    ).all()
    
    # Get total count
    total_records = len(lich_su_list)
    
    # Build detailed records
    details = []
    for ls in lich_su_list:
        details.append(
            LichSuDetail(
                stt=ls.id,  # Use id as stt
                ngay=ls.ngay,
                ma_hd=ls.ma_hd,
                ho_ten=ls.ho_ten,
                so_tien_thanh_toan=ls.so_tien,
                loai_hop_dong=ls.loai_hop_dong,
                trang_thai=ls.hanh_dong  # Use hanh_dong as trang_thai
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
                "so_tien_tra_goc": contract.SoTienTraGoc,
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
    })
    summary_expected = 0.0
    
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
        if tc.SoTienTraGoc > 0:
            trend_buckets[bucket_key]["tong_tien_thu"] += float(tc.SoTienTraGoc)
        summary_expected += float(tc.SoTienVay)
    
    for tg in tra_gops:
        bucket_key = _get_bucket_key(tg.NgayVay, granularity)
        trend_buckets[bucket_key]["bucket"] = bucket_key
        trend_buckets[bucket_key]["tong_tien_chi"] += float(tg.SoTienVay)
        summary_expected += float(tg.SoTienVay) + float(tg.LaiSuat)

    
    # Calculate collected amount and interest from payment history
    paid_records = db.query(LichSuTraLai).filter(
        LichSuTraLai.Ngay >= start_date,
        LichSuTraLai.Ngay <= end_date,
        or_(
            LichSuTraLai.TrangThaiThanhToan == TrangThaiThanhToan.DONG_DU.value,
            LichSuTraLai.TrangThaiThanhToan == TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
        )
    ).all()
    
    breakdown = {
        "tin_chap": {"disbursed": 0.0, "collected": 0.0},
        "tra_gop": {"disbursed": 0.0, "collected": 0.0}
    }
    
    for record in paid_records:
        if not record.MaHD:
            continue
        
        contract = _load_contract(db, record.MaHD)
        if not contract:
            continue
        
        bucket_key = _get_bucket_key(record.Ngay, granularity)
        paid_amount = float(record.TienDaTra)
        ctype = contract["contract_type"]
        
        trend_buckets[bucket_key]["bucket"] = bucket_key
        
        breakdown[ctype]["collected"] += paid_amount
        if ctype == "tin_chap":
            trend_buckets[bucket_key]["tong_tien_thu"] += float(record.TienDaTra)
        else:
            trend_buckets[bucket_key]["tong_tien_thu"] += float(record.TienDaTra)
    for tc in tin_chaps:
        breakdown["tin_chap"]["disbursed"] += float(tc.SoTienVay)
    for tg in tra_gops:
        breakdown["tra_gop"]["disbursed"] += float(tg.SoTienVay)
    
    # Calculate outstanding contracts and overdue

    tong_lai_tc = db.query(func.sum(LichSuTraLai.SoTien)).filter(
        LichSuTraLai.Ngay >= start_date,
        LichSuTraLai.Ngay <= end_date,
        LichSuTraLai.MaHD.like("%TC%")
    ).scalar()

    summary_expected += tong_lai_tc

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
    
    summary = {
        "total_disbursed": float(summary_disbursed),
        "total_collected": float(summary_collected),
        "total_expected": float(summary_expected),
        "net_cash_flow": float(summary_collected - summary_disbursed),
        "active_contracts": len(active_contracts),
        "overdue_contracts": len(overdue_contracts),
        "overdue_amount": float(overdue_amount),
    }
    
    return {
        "meta": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "bucket_count": len(trend),
        },
        "summary": summary,
        "breakdown": breakdown,
        "trend": trend,
        "top_outstanding": top_outstanding,
    }
