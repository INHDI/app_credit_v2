"""
CRUD operations for TinChap
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date

from app.models.tin_chap import TinChap
from app.models.lich_su_tra_lai import LichSuTraLai
from app.schemas.tin_chap import TinChapCreate, TinChapUpdate, TinChapResponse
from app.schemas.lich_su_tra_lai import LichSuTraLai as LichSuTraLaiSchema
from app.core.enums import TrangThaiThanhToan


def _calculate_payment_info(db: Session, ma_hd: str) -> dict:
    """
    Calculate payment information for a TinChap contract
    
    Args:
        db: Database session
        ma_hd: Contract ID
        
    Returns:
        dict: Payment information including LaiDaTra, GocConLai, LaiConLai
    """
    # Get all payment history for this contract
    lich_sus = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).all()
    
    # Calculate total interest paid
    lai_da_tra = sum(ls.TienDaTra for ls in lich_sus)
    
    # For TinChap, the remaining principal is the original loan amount
    # since TinChap only pays interest, not principal
    tin_chap = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
    if tin_chap:
        goc_con_lai = tin_chap.SoTienVay  # For TinChap, principal is never paid
    else:
        goc_con_lai = 0
    
    # Calculate remaining interest
    # Total interest should be calculated based on the contract terms
    # For now, we'll use a simple calculation
    total_interest_due = sum(ls.SoTien for ls in lich_sus)
    lai_con_lai = max(0, total_interest_due - lai_da_tra)
    
    return {
        "lai_da_tra": lai_da_tra,
        "goc_con_lai": goc_con_lai,
        "lai_con_lai": lai_con_lai
    }


def get_tin_chap(db: Session, ma_hd: str) -> Optional[TinChap]:
    """
    Get a TinChap contract by MaHD
    
    Args:
        db: Database session
        ma_hd: Contract ID
        
    Returns:    
        TinChap object or None if not found
    """
    try:
        result = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
        return result
    except Exception as e:
        raise


def get_tin_chap_with_history(db: Session, ma_hd: str) -> Optional[TinChapResponse]:
    """
    Get a TinChap contract by MaHD with payment history information
    
    Args:
        db: Database session
        ma_hd: Contract ID
        
    Returns:    
        TinChapResponse object or None if not found
    """
    try:
        tin_chap = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
        if not tin_chap:
            return None
        
        # Get payment history for this contract
        lich_sus = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == tin_chap.MaHD).all()
        lich_su_schemas = [LichSuTraLaiSchema.model_validate(ls).model_dump() for ls in lich_sus]
        
        # Calculate payment information
        payment_info = _calculate_payment_info(db, tin_chap.MaHD)
        
        # Create TinChapResponse
        tin_chap_response = TinChapResponse(
            MaHD=tin_chap.MaHD,
            HoTen=tin_chap.HoTen,
            NgayVay=tin_chap.NgayVay,
            SoTienVay=tin_chap.SoTienVay,
            KyDong=tin_chap.KyDong,
            LaiSuat=tin_chap.LaiSuat,
            SoTienTraGoc=tin_chap.SoTienTraGoc,
            TrangThai=tin_chap.TrangThai,
            LichSuTraLai=lich_su_schemas,
            LaiDaTra=payment_info["lai_da_tra"],
            GocConLai=payment_info["goc_con_lai"],
            LaiConLai=payment_info["lai_con_lai"]
        )
        
        return tin_chap_response
    except Exception as e:
        raise


def get_tin_chaps(
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
    Get TinChap contracts with filter/search/sort/pagination and payment history
    """
    try:
        query = db.query(TinChap)

        if status:
            query = query.filter(TinChap.TrangThai == status)

        if search:
            like = f"%{search}%"
            query = query.filter(or_(TinChap.HoTen.ilike(like), TinChap.MaHD.ilike(like)))

        if today_only:
            query = query.filter(TinChap.NgayVay == date.today())

        allowed_sort_fields = {
            "MaHD": TinChap.MaHD,
            "HoTen": TinChap.HoTen,
            "NgayVay": TinChap.NgayVay,
            "SoTienVay": TinChap.SoTienVay,
            "KyDong": TinChap.KyDong,
            "LaiSuat": TinChap.LaiSuat,
            "TrangThai": TinChap.TrangThai,
        }
        sort_column = allowed_sort_fields.get(sort_by, TinChap.NgayVay)
        if sort_dir.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        # Count BEFORE pagination
        total = query.count()

        page = max(1, page)
        page_size = max(1, page_size)
        offset = (page - 1) * page_size
        tin_chaps = query.offset(offset).limit(page_size).all()

        results = []
        for tin_chap in tin_chaps:
            lich_sus = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == tin_chap.MaHD).all()
            lich_su_schemas = [LichSuTraLaiSchema.model_validate(ls).model_dump() for ls in lich_sus]

            payment_info = _calculate_payment_info(db, tin_chap.MaHD)

            results.append(
                TinChapResponse(
                    MaHD=tin_chap.MaHD,
                    HoTen=tin_chap.HoTen,
                    NgayVay=tin_chap.NgayVay,
                    SoTienVay=tin_chap.SoTienVay,
                    KyDong=tin_chap.KyDong,
                    LaiSuat=tin_chap.LaiSuat,
                    SoTienTraGoc=tin_chap.SoTienTraGoc,
                    TrangThai=tin_chap.TrangThai,
                    LichSuTraLai=lich_su_schemas,
                    LaiDaTra=payment_info["lai_da_tra"],
                    GocConLai=payment_info["goc_con_lai"],
                    LaiConLai=payment_info["lai_con_lai"],
                )
            )

        # Build paginated payload
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        return {
            "items": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
    except Exception as e:
        raise


def create_tin_chap(db: Session, tin_chap: TinChapCreate, ma_hd: str) -> TinChap:
    """
    Create a new TinChap contract
    
    Args:
        db: Database session
        tin_chap: TinChap creation data
        ma_hd: Generated contract ID
        
    Returns:
        Created TinChap object
    """
    try:
        trang_thai = TrangThaiThanhToan.CHUA_THANH_TOAN.value
        
        db_tin_chap = TinChap(
            MaHD=ma_hd,
            HoTen=tin_chap.HoTen,
            NgayVay=tin_chap.NgayVay,
            SoTienVay=tin_chap.SoTienVay,
            KyDong=tin_chap.KyDong,
            LaiSuat=tin_chap.LaiSuat,
            TrangThai=trang_thai
        )
        
        db.add(db_tin_chap)
        db.commit()
        db.refresh(db_tin_chap)
        
        return db_tin_chap
        
    except Exception as e:
        db.rollback()
        raise


def update_tin_chap(db: Session, ma_hd: str, tin_chap_update: TinChapUpdate) -> Optional[TinChap]:
    """
    Update a TinChap contract
    
    Args:
        db: Database session
        ma_hd: Contract ID
        tin_chap_update: Update data
        
    Returns:
        Updated TinChap object or None if not found
    """
    try:
        db_tin_chap = get_tin_chap(db, ma_hd)
        
        if not db_tin_chap:
            return None
        
        update_data = tin_chap_update.model_dump(exclude_unset=True)
        
        if update_data:
            for key, value in update_data.items():
                setattr(db_tin_chap, key, value)
            
            db.commit()
            db.refresh(db_tin_chap)
        
        return db_tin_chap
        
    except Exception as e:
        db.rollback()
        raise


def delete_tin_chap(db: Session, ma_hd: str) -> bool:
    """
    Delete a TinChap contract
    
    Args:
        db: Database session
        ma_hd: Contract ID
        
    Returns:
        True if deleted, False if not found
    """
    try:
        db_tin_chap = get_tin_chap(db, ma_hd)
        
        if not db_tin_chap:
            return False
        
        db.delete(db_tin_chap)
        db.commit()
        
        return True
        
    except Exception as e:
        db.rollback()
        raise


def get_tin_chaps_by_status(db: Session, trang_thai: str) -> List[TinChap]:
    """
    Get TinChap contracts by status
    
    Args:
        db: Database session
        trang_thai: Status to filter by
        
    Returns:
        List of TinChap objects
    """
    try:
        results = db.query(TinChap).filter(TinChap.TrangThai == trang_thai).all()
        return results
    except Exception as e:
        raise


def count_tin_chaps(db: Session) -> int:
    """
    Count total TinChap contracts
    
    Args:
        db: Database session
        
    Returns:
        Total count
    """
    try:
        count = db.query(TinChap).count()
        return count
    except Exception as e:
        raise

def tra_goc_tin_chap(db: Session, ma_hd: str, so_tien_tra_goc: int) -> bool:
    """
    Trả gốc hợp đồng tín chấp
    
    Args:
        db: Database session
        ma_hd: Contract ID
        so_tien_tra_goc: Amount to pay off
        
    Returns:
        True if successful, False if not found or error
    """
    try:
        db_tin_chap = get_tin_chap(db, ma_hd)
        if not db_tin_chap:
            return False
        db_tin_chap.SoTienTraGoc += so_tien_tra_goc
        if db_tin_chap.SoTienTraGoc > db_tin_chap.SoTienVay:
            # db_tin_chap.TrangThai = TrangThaiThanhToan.DA_TAT_TOAN.value
            db_lich_su_tra_lai_tin_chap = db.query(LichSuTraLai).filter(LichSuTraLai.MaHD == ma_hd).all()
            # Nếu tổng TienDaTra > SoTien thì thay đổi trạng thái thành DA_TAT_TOAN
            if sum(ls.TienDaTra for ls in db_lich_su_tra_lai_tin_chap) > db_tin_chap.SoTienVay:
                db_tin_chap.TrangThai = TrangThaiThanhToan.DA_TAT_TOAN.value
            else:
                db_tin_chap.TrangThai = TrangThaiThanhToan.THANH_TOAN_MOT_PHAN.value
        db.commit()
        db.refresh(db_tin_chap)
        return True
    except Exception as e:
        db.rollback()
        return False