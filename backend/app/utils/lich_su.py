from sqlalchemy.orm import Session
from datetime import date
from app.models.lich_su import LichSu

def create_lich_su(
    db: Session, 
    ma_hd: str, 
    ho_ten: str, 
    ngay: date, 
    so_tien: int, 
    hanh_dong: str, 
    loai_hop_dong: str
) -> dict:
    """
    Tạo bản ghi lịch sử
    """
    lich_su = LichSu(
        ma_hd=ma_hd,
        ho_ten=ho_ten,
        ngay=ngay,
        so_tien=so_tien,
        hanh_dong=hanh_dong,
        loai_hop_dong=loai_hop_dong)
    db.add(lich_su)
    db.commit()
    db.refresh(lich_su)
    return lich_su

def delete_lich_su(
    db: Session, 
    ma_hd: str
) -> bool:
    """
    Xóa bản ghi lịch sử
    """
    lich_su = db.query(LichSu).filter(LichSu.ma_hd == ma_hd).all()
    for l in lich_su:
        db.delete(l)
    db.commit()
    return True