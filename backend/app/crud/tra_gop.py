"""
CRUD operations for TraGop
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date

from app.core.enums import TrangThaiThanhToan
from app.models.tra_gop import TraGop
from app.models.lich_su_tra_lai import LichSuTraLai
from app.schemas.tra_gop import TraGopCreate, TraGopUpdate, TraGopResponse
from app.schemas.lich_su_tra_lai import LichSuTraLai as LichSuTraLaiSchema
from app.utils.lich_su import create_lich_su, delete_lich_su


def get_tra_gop(db: Session, ma_hd: str) -> Optional[TraGop]:
    """
    Get a TraGop contract by MaHD
    
    Args:
        db: Database session
        ma_hd: Contract ID
        
    Returns:
        TraGop object or None if not found
    """
    return db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()


def _calculate_tg_payment_info(db: Session, ma_hd: str) -> dict:
    """Calculate total paid and remaining for TraGop from lịch sử."""
    histories = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).all()
    da_thanh_toan = sum(h.TienDaTra for h in histories)
    tong_phai_tra = sum(h.SoTien for h in histories)
    con_lai = max(0, tong_phai_tra - da_thanh_toan)
    return {"da_thanh_toan": da_thanh_toan, "con_lai": con_lai}


def get_tra_gops(
    db: Session,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    sort_by: str = "NgayVay",
    sort_dir: str = "desc",
    today_only: bool = False,
) -> dict:
    """
    Get TraGop contracts with filter/search/sort/pagination and enrich with lịch sử + totals.
    """
    query = db.query(TraGop)

    if status:
        query = query.filter(TraGop.TrangThai == status)

    if search:
        like = f"%{search}%"
        query = query.filter(or_(TraGop.HoTen.ilike(like), TraGop.MaHD.ilike(like)))

    if today_only:
        query = query.filter(TraGop.NgayVay == date.today())

    allowed_sort_fields = {
        "MaHD": TraGop.MaHD,
        "HoTen": TraGop.HoTen,
        "NgayVay": TraGop.NgayVay,
        "SoTienVay": TraGop.SoTienVay,
        "KyDong": TraGop.KyDong,
        "SoLanTra": TraGop.SoLanTra,
        "LaiSuat": TraGop.LaiSuat,
        "TrangThai": TraGop.TrangThai,
    }
    sort_column = allowed_sort_fields.get(sort_by, TraGop.NgayVay)
    if sort_dir.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Count BEFORE pagination
    total = query.count()

    page = max(1, page)
    page_size = max(1, page_size)
    offset = (page - 1) * page_size
    tra_gops = query.offset(offset).limit(page_size).all()

    results: List[TraGopResponse] = []
    for tg in tra_gops:
        histories = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == tg.MaHD).all()
        histories_schema = [LichSuTraLaiSchema.model_validate(h).model_dump() for h in histories]
        totals = _calculate_tg_payment_info(db, tg.MaHD)
        results.append(
            TraGopResponse(
                MaHD=tg.MaHD,
                HoTen=tg.HoTen,
                NgayVay=tg.NgayVay,
                SoTienVay=tg.SoTienVay,
                KyDong=tg.KyDong,
                SoLanTra=tg.SoLanTra,
                LaiSuat=tg.LaiSuat,
                TrangThai=tg.TrangThai,
                LichSuTraLai=histories_schema,
                DaThanhToan=totals["da_thanh_toan"],
                ConLai=totals["con_lai"],
            )
        )

    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


def get_tra_gop_with_history(db: Session, ma_hd: str) -> Optional[TraGopResponse]:
    """Get a single TraGop enriched with lịch sử + totals."""
    tg = db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()
    if not tg:
        return None
    histories = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == tg.MaHD).all()
    histories_schema = [LichSuTraLaiSchema.model_validate(h).model_dump() for h in histories]
    totals = _calculate_tg_payment_info(db, tg.MaHD)
    return TraGopResponse(
        MaHD=tg.MaHD,
        HoTen=tg.HoTen,
        NgayVay=tg.NgayVay,
        SoTienVay=tg.SoTienVay,
        KyDong=tg.KyDong,
        SoLanTra=tg.SoLanTra,
        LaiSuat=tg.LaiSuat,
        TrangThai=tg.TrangThai,
        LichSuTraLai=histories_schema,
        DaThanhToan=totals["da_thanh_toan"],
        ConLai=totals["con_lai"],
    )


def create_tra_gop(db: Session, tra_gop: TraGopCreate, ma_hd: str) -> TraGop:
    """
    Create a new TraGop contract
    
    Args:
        db: Database session
        tra_gop: TraGop creation data
        ma_hd: Generated contract ID
        
    Returns:
        Created TraGop object
    """
    trang_thai = TrangThaiThanhToan.CHUA_THANH_TOAN.value
    db_tra_gop = TraGop(
        MaHD=ma_hd,
        HoTen=tra_gop.HoTen,
        NgayVay=tra_gop.NgayVay,
        SoTienVay=tra_gop.SoTienVay,
        KyDong=tra_gop.KyDong,
        SoLanTra=tra_gop.SoLanTra,
        LaiSuat=tra_gop.LaiSuat,
        TrangThai=trang_thai
    )
    
    db.add(db_tra_gop)
    db.commit()
    db.refresh(db_tra_gop)
    
    create_lich_su(db, 
        ma_hd=ma_hd, 
        ho_ten=tra_gop.HoTen, 
        ngay=date.today(), 
        so_tien=tra_gop.SoTienVay, 
        hanh_dong="Tạo hợp đồng trả góp", 
        loai_hop_dong="TG")
    return db_tra_gop


def update_tra_gop(db: Session, ma_hd: str, tra_gop_update: TraGopUpdate) -> Optional[TraGop]:
    """
    Update a TraGop contract
    
    Args:
        db: Database session
        ma_hd: Contract ID
        tra_gop_update: Update data
        
    Returns:
        Updated TraGop object or None if not found
    """
    db_tra_gop = get_tra_gop(db, ma_hd)

    create_lich_su(db, 
        ma_hd=ma_hd, 
        ho_ten=db_tra_gop.HoTen, 
        ngay=date.today(), 
        so_tien=db_tra_gop.SoTienVay, 
        hanh_dong="Cập nhật hợp đồng trả góp", 
        loai_hop_dong="TG")
    if not db_tra_gop:
        return None
    
    update_data = tra_gop_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_tra_gop, key, value)
    
    db.commit()
    db.refresh(db_tra_gop)
    
    return db_tra_gop


def delete_tra_gop(db: Session, ma_hd: str) -> bool:
    """
    Delete a TraGop contract
    
    Args:
        db: Database session
        ma_hd: Contract ID
        
    Returns:
        True if deleted, False if not found
    """
    db_tra_gop = get_tra_gop(db, ma_hd)
    
    if not db_tra_gop:
        return False
    delete_lich_su(db, ma_hd=ma_hd)
    db.delete(db_tra_gop)
    db.commit()
    
    return True


def get_tra_gops_by_status(db: Session, trang_thai: str) -> List[TraGop]:
    """
    Get TraGop contracts by status
    
    Args:
        db: Database session
        trang_thai: Status to filter by
        
    Returns:
        List of TraGop objects
    """
    return db.query(TraGop).filter(TraGop.TrangThai == trang_thai).all()


def count_tra_gops(db: Session) -> int:
    """
    Count total TraGop contracts
    
    Args:
        db: Database session
        
    Returns:
        Total count
    """
    return db.query(TraGop).count()

