"""
CRUD operations for Dashboard
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import date, datetime
from typing import Optional

from app.models.tin_chap import TinChap
from app.models.tra_gop import TraGop
from app.models.lich_su_tra_lai import LichSuTraLai
from app.schemas.dashboard import (
    DashboardResponse,
    LoaiHinhVay,
    LoaiHinhVayDetail,
    TiLeLaiThu,
    TiLeLoiNhuan
)
from app.core.enums import TimePeriod, TrangThaiNgayThanhToan, TrangThaiThanhToan


def _get_date_filter(time_period: str):
    """
    Get date filter based on time period
    
    Args:
        time_period: Time period (all, this_month, this_quarter, this_year)
        
    Returns:
        tuple: (start_date, end_date) or (None, None) for 'all'
    """
    today = date.today()
    
    if time_period == TimePeriod.THIS_MONTH.value:
        start_date = date(today.year, today.month, 1)
        # Last day of current month
        if today.month == 12:
            end_date = date(today.year, 12, 31)
        else:
            end_date = date(today.year, today.month + 1, 1)
        return start_date, end_date
    
    elif time_period == TimePeriod.THIS_QUARTER.value:
        quarter = (today.month - 1) // 3 + 1
        start_month = (quarter - 1) * 3 + 1
        start_date = date(today.year, start_month, 1)
        
        # Last day of current quarter
        end_month = quarter * 3
        if end_month == 12:
            end_date = date(today.year, 12, 31)
        else:
            end_date = date(today.year, end_month + 1, 1)
        return start_date, end_date
    
    elif time_period == TimePeriod.THIS_YEAR.value:
        start_date = date(today.year, 1, 1)
        end_date = date(today.year, 12, 31)
        return start_date, end_date
    
    # Default: all time
    return None, None


def get_dashboard(db: Session, time_period: str = "all") -> DashboardResponse:
    """
    Get dashboard data with time period filter
    
    Args:
        db: Database session
        time_period: Time period filter (all, this_month, this_quarter, this_year)
        
    Returns:
        DashboardResponse object with aggregated data
    """
    # Get date filter
    start_date, end_date = _get_date_filter(time_period)
    
    # Base queries for TinChap and TraGop
    tin_chap_query = db.query(TinChap)
    tra_gop_query = db.query(TraGop)
    
    # Apply date filter if needed
    if start_date and end_date:
        tin_chap_query = tin_chap_query.filter(
            TinChap.NgayVay >= start_date,
            TinChap.NgayVay < end_date
        )
        tra_gop_query = tra_gop_query.filter(
            TraGop.NgayVay >= start_date,
            TraGop.NgayVay < end_date
        )
    
    # Get all contracts
    tin_chaps = tin_chap_query.all()
    tra_gops = tra_gop_query.all()
    
    # Calculate Tín Chấp statistics
    tc_so_hop_dong = len(tin_chaps)
    tc_tien_cho_vay = sum(tc.SoTienVay for tc in tin_chaps)
    tc_tien_da_thu = 0
    tc_tien_no_can_tra = 0
    
    for tc in tin_chaps:
        lich_sus = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == tc.MaHD).all()
        tien_da_tra = sum(ls.TienDaTra for ls in lich_sus)
        tien_phai_tra = sum(ls.SoTien for ls in lich_sus)
        tc_tien_da_thu += tien_da_tra
        tc_tien_no_can_tra += max(0, tien_phai_tra - tien_da_tra)
    
    # Calculate Trả Góp statistics
    tg_so_hop_dong = len(tra_gops)
    tg_tien_cho_vay = sum(tg.SoTienVay for tg in tra_gops)
    tg_tien_da_thu = 0
    tg_tien_no_can_tra = 0
    
    for tg in tra_gops:
        lich_sus = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == tg.MaHD).all()
        tien_da_tra = sum(ls.TienDaTra for ls in lich_sus)
        tien_phai_tra = sum(ls.SoTien for ls in lich_sus)
        tg_tien_da_thu += tien_da_tra
        tg_tien_no_can_tra += max(0, tien_phai_tra - tien_da_tra)
    
    # Calculate totals
    tong_hop_dong = tc_so_hop_dong + tg_so_hop_dong
    tong_tien_da_thu = tc_tien_da_thu + tg_tien_da_thu
    tong_tien_can_thu = tc_tien_no_can_tra + tg_tien_no_can_tra
    
    # Count contracts with debt (no_phai_thu)
    # no_phai_thu_count = 0
    # for tc in tin_chaps:
    #     lich_sus = db.query(LichSuTraLai).filter(
    #         LichSuTraLai.MaHD == tc.MaHD).all()
    #     if any(ls.SoTien > ls.TienDaTra for ls in lich_sus):
    #         no_phai_thu_count += 1
    
    # for tg in tra_gops:
    #     lich_sus = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == tg.MaHD).all()
    #     if any(ls.SoTien > ls.TienDaTra for ls in lich_sus):
    #         no_phai_thu_count += 1
    no_phai_thu_count = db.query(LichSuTraLai).filter(
        or_(
            LichSuTraLai.TrangThaiThanhToan == TrangThaiThanhToan.CHUA_THANH_TOAN.value,
            LichSuTraLai.TrangThaiThanhToan == TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
        ),
        LichSuTraLai.TrangThaiNgayThanhToan == TrangThaiNgayThanhToan.DEN_HAN.value
    ).distinct().count()
    print(no_phai_thu_count)
    
    # Calculate ti_le_lai_thu (% đã thu / chưa thu)
    tong_phai_thu = tong_tien_da_thu + tong_tien_can_thu
    if tong_phai_thu > 0:
        da_thu_percent = round((tong_tien_da_thu / tong_phai_thu) * 100, 2)
        chua_thu_percent = round((tong_tien_can_thu / tong_phai_thu) * 100, 2)
    else:
        da_thu_percent = 0.0
        chua_thu_percent = 0.0
    
    # Calculate ti_le_loi_nhuan (% lợi nhuận)
    # Lợi nhuận = (Tổng lãi đã thu / Tổng tiền cho vay) × 100
    if tc_tien_cho_vay > 0:
        tc_loi_nhuan = round((tc_tien_da_thu / tc_tien_cho_vay) * 100, 2)
    else:
        tc_loi_nhuan = 0.0
    
    if tg_tien_cho_vay > 0:
        tg_loi_nhuan = round((tg_tien_da_thu / tg_tien_cho_vay) * 100, 2)
    else:
        tg_loi_nhuan = 0.0
    
    # Build response
    loai_hinh_vay = LoaiHinhVay(
        tin_chap=LoaiHinhVayDetail(
            so_hop_dong=tc_so_hop_dong,
            tien_cho_vay=tc_tien_cho_vay,
            tien_da_thu=tc_tien_da_thu,
            tien_no_can_tra=tc_tien_no_can_tra
        ),
        tra_gop=LoaiHinhVayDetail(
            so_hop_dong=tg_so_hop_dong,
            tien_cho_vay=tg_tien_cho_vay,
            tien_da_thu=tg_tien_da_thu,
            tien_no_can_tra=tg_tien_no_can_tra
        )
    )
    
    ti_le_lai_thu = TiLeLaiThu(
        da_thu=da_thu_percent,
        chua_thu=chua_thu_percent
    )
    
    ti_le_loi_nhuan = TiLeLoiNhuan(
        tin_chap=tc_loi_nhuan,
        tra_gop=tg_loi_nhuan
    )
    
    return DashboardResponse(
        tong_hop_dong=tong_hop_dong,
        tong_tien_da_thu=tong_tien_da_thu,
        tong_tien_can_thu=tong_tien_can_thu,
        no_phai_thu=no_phai_thu_count,
        loai_hinh_vay=loai_hinh_vay,
        ti_le_lai_thu=ti_le_lai_thu,
        ti_le_loi_nhuan=ti_le_loi_nhuan
    )