"""
Database service for Telegram bot
Provides database operations for user lookup and updates
"""
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Date
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Optional, List, Dict, Any
from datetime import date

from config import DATABASE_URL

# Create engine and session
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Simplified model classes for Telegram bot (read-only mostly)
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    ho_ten = Column(String)
    so_dien_thoai = Column(String)
    email = Column(String)
    role = Column(String)
    is_active = Column(Boolean)
    telegram_chat_id = Column(String)
    telegram_verified = Column(Boolean)


class TinChap(Base):
    __tablename__ = "tin_chap"
    
    MaHD = Column(String, primary_key=True)
    HoTen = Column(String)
    NgayVay = Column(Date)
    SoTienVay = Column(Integer)
    KyDong = Column(Integer)
    LaiSuat = Column(Integer)
    SoTienTraGoc = Column(Integer)
    TrangThai = Column(String)
    user_id = Column(Integer)


class TraGop(Base):
    __tablename__ = "tra_gop"
    
    MaHD = Column(String, primary_key=True)
    HoTen = Column(String)
    NgayVay = Column(Date)
    SoTienVay = Column(Integer)
    KyDong = Column(Integer)
    SoLanTra = Column(Integer)
    LaiSuat = Column(Integer)
    TrangThai = Column(String)
    user_id = Column(Integer)


class LichSuTraLai(Base):
    __tablename__ = "lich_su_tra_lai"
    
    Stt = Column(Integer, primary_key=True)
    MaHD = Column(String)
    Ngay = Column(Date)
    SoTien = Column(Integer)
    TienDaTra = Column(Integer)
    ThanhToan = Column("thanhtoan", Boolean)
    TrangThaiThanhToan = Column(String)
    TrangThaiNgayThanhToan = Column(String)


class SystemSettings(Base):
    """System-wide settings"""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    telegram_bot_token = Column(String, nullable=True)


def get_telegram_config() -> Optional[str]:
    """Get telegram bot token from database"""
    db = SessionLocal()
    try:
        settings = db.query(SystemSettings).first()
        if settings and settings.telegram_bot_token:
            return settings.telegram_bot_token
        return None
    except Exception as e:
        print(f"Error fetching telegram config: {e}")
        return None
    finally:
        db.close()


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass  # Don't close here, let caller manage


def get_user_by_telegram(telegram_chat_id: str) -> Optional[User]:
    """Get user by telegram chat ID"""
    db = SessionLocal()
    try:
        return db.query(User).filter(
            User.telegram_chat_id == telegram_chat_id,
            User.is_active == True
        ).first()
    finally:
        db.close()


def get_debtor_by_phone(phone: str) -> Optional[User]:
    """Get debtor user by phone number"""
    db = SessionLocal()
    try:
        return db.query(User).filter(
            User.so_dien_thoai == phone,
            User.role == "debtor",
            User.is_active == True
        ).first()
    finally:
        db.close()


def link_telegram_to_user(user_id: int, telegram_chat_id: str) -> bool:
    """Link telegram chat ID to user"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.telegram_chat_id = telegram_chat_id
            user.telegram_verified = True
            db.commit()
            return True
        return False
    finally:
        db.close()


def get_user_contracts(user_id: int) -> List[Dict[str, Any]]:
    """Get all contracts for a user"""
    db = SessionLocal()
    try:
        contracts = []
        
        # Get TinChap contracts
        tin_chaps = db.query(TinChap).filter(TinChap.user_id == user_id).all()
        for tc in tin_chaps:
            goc_con_lai = tc.SoTienVay - (tc.SoTienTraGoc or 0)
            contracts.append({
                "MaHD": tc.MaHD,
                "HoTen": tc.HoTen,
                "NgayVay": str(tc.NgayVay) if tc.NgayVay else "",
                "SoTienVay": tc.SoTienVay,
                "LaiSuat": tc.LaiSuat,
                "GocConLai": goc_con_lai,
                "TrangThai": tc.TrangThai,
                "LoaiHD": "Tín chấp"
            })
        
        # Get TraGop contracts
        tra_gops = db.query(TraGop).filter(TraGop.user_id == user_id).all()
        for tg in tra_gops:
            contracts.append({
                "MaHD": tg.MaHD,
                "HoTen": tg.HoTen,
                "NgayVay": str(tg.NgayVay) if tg.NgayVay else "",
                "SoTienVay": tg.SoTienVay,
                "LaiSuat": tg.LaiSuat,
                "GocConLai": tg.SoTienVay,  # Simplified
                "TrangThai": tg.TrangThai,
                "LoaiHD": "Trả góp"
            })
        
        return contracts
    finally:
        db.close()


def get_user_summary(user_id: int) -> Dict[str, Any]:
    """Get debt summary for a user"""
    db = SessionLocal()
    try:
        tin_chaps = db.query(TinChap).filter(TinChap.user_id == user_id).all()
        tra_gops = db.query(TraGop).filter(TraGop.user_id == user_id).all()
        
        tong_vay = sum(tc.SoTienVay for tc in tin_chaps) + sum(tg.SoTienVay for tg in tra_gops)
        tong_lai = sum(tc.LaiSuat for tc in tin_chaps) + sum(tg.LaiSuat for tg in tra_gops)
        
        # Calculate remaining principal
        goc_con_lai = sum(tc.SoTienVay - (tc.SoTienTraGoc or 0) for tc in tin_chaps)
        goc_con_lai += sum(tg.SoTienVay for tg in tra_gops)  # Simplified
        
        return {
            "tong_vay": tong_vay,
            "tong_lai": tong_lai,
            "goc_con_lai": goc_con_lai,
            "so_hd_tin_chap": len(tin_chaps),
            "so_hd_tra_gop": len(tra_gops),
            "tong_hop_dong": len(tin_chaps) + len(tra_gops)
        }
    finally:
        db.close()


def get_payment_schedule(user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    """Get upcoming payment schedule for a user"""
    db = SessionLocal()
    try:
        # Get contract IDs
        tin_chap_ids = [tc.MaHD for tc in db.query(TinChap.MaHD).filter(TinChap.user_id == user_id).all()]
        tra_gop_ids = [tg.MaHD for tg in db.query(TraGop.MaHD).filter(TraGop.user_id == user_id).all()]
        all_ids = tin_chap_ids + tra_gop_ids
        
        if not all_ids:
            return []
        
        today = date.today()
        payments = db.query(LichSuTraLai).filter(
            LichSuTraLai.MaHD.in_(all_ids),
            LichSuTraLai.Ngay >= today,
            LichSuTraLai.ThanhToan == False
        ).order_by(LichSuTraLai.Ngay.asc()).limit(limit).all()
        
        return [
            {
                "Stt": p.Stt,
                "MaHD": p.MaHD,
                "Ngay": str(p.Ngay),
                "SoTien": p.SoTien,
                "TrangThai": p.TrangThaiNgayThanhToan
            }
            for p in payments
        ]
    finally:
        db.close()


def get_payment_history(user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    """Get payment history for a user"""
    db = SessionLocal()
    try:
        # Get contract IDs
        tin_chap_ids = [tc.MaHD for tc in db.query(TinChap.MaHD).filter(TinChap.user_id == user_id).all()]
        tra_gop_ids = [tg.MaHD for tg in db.query(TraGop.MaHD).filter(TraGop.user_id == user_id).all()]
        all_ids = tin_chap_ids + tra_gop_ids
        
        if not all_ids:
            return []
        
        payments = db.query(LichSuTraLai).filter(
            LichSuTraLai.MaHD.in_(all_ids),
            LichSuTraLai.TienDaTra > 0
        ).order_by(LichSuTraLai.Ngay.desc()).limit(limit).all()
        
        return [
            {
                "Stt": p.Stt,
                "MaHD": p.MaHD,
                "Ngay": str(p.Ngay),
                "SoTien": p.SoTien,
                "TienDaTra": p.TienDaTra,
                "TrangThai": p.TrangThaiThanhToan
            }
            for p in payments
        ]
    finally:
        db.close()


def get_contract_detail(ma_hd: str) -> Optional[Dict[str, Any]]:
    """Get contract detail by MaHD"""
    db = SessionLocal()
    try:
        # Check TinChap first
        tc = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
        if tc:
            return {
                "MaHD": tc.MaHD,
                "HoTen": tc.HoTen,
                "NgayVay": str(tc.NgayVay) if tc.NgayVay else "",
                "SoTienVay": tc.SoTienVay,
                "LaiSuat": tc.LaiSuat,
                "KyDong": tc.KyDong,
                "GocConLai": tc.SoTienVay - (tc.SoTienTraGoc or 0),
                "TrangThai": tc.TrangThai,
                "LoaiHD": "Tín chấp",
                "user_id": tc.user_id
            }
        
        # Check TraGop
        tg = db.query(TraGop).filter(TraGop.MaHD == ma_hd).first()
        if tg:
            return {
                "MaHD": tg.MaHD,
                "HoTen": tg.HoTen,
                "NgayVay": str(tg.NgayVay) if tg.NgayVay else "",
                "SoTienVay": tg.SoTienVay,
                "LaiSuat": tg.LaiSuat,
                "KyDong": tg.KyDong,
                "SoLanTra": tg.SoLanTra,
                "GocConLai": tg.SoTienVay,
                "TrangThai": tg.TrangThai,
                "LoaiHD": "Trả góp",
                "user_id": tg.user_id
            }
        
        return None
        return None
    finally:
        db.close()


def confirm_payment(ma_hd: str, amount: int, payment_type: str, content: str = "") -> bool:
    """
    Confirm payment and update database
    payment_type: 'interest', 'partial', 'full', 'installment'
    """
    db = SessionLocal()
    try:
        today_date = date.today()
        
        # 1. Handle Tin Chap Principal (Partial/Full)
        if payment_type in ["partial", "full"] and ma_hd.startswith("TC"):
            tin_chap = db.query(TinChap).filter(TinChap.MaHD == ma_hd).first()
            if not tin_chap:
                return False
                
            # Update Principal Paid
            current_paid = tin_chap.SoTienTraGoc or 0
            tin_chap.SoTienTraGoc = current_paid + amount
            
            # Update Status if fully paid
            if tin_chap.SoTienTraGoc >= tin_chap.SoTienVay:
                tin_chap.TrangThai = "Đã tất toán"
            else:
                tin_chap.TrangThai = "Thanh toán một phần"
                
            # Record History
            new_history = LichSuTraLai(
                MaHD=ma_hd,
                Ngay=today_date,
                SoTien=amount,
                TienDaTra=amount,
                ThanhToan=True,
                TrangThaiThanhToan="Đúng hạn", # Simplified
                TrangThaiNgayThanhToan="Đúng hạn" # Simplified
            )
            # Add description if possible (need schema update or use existing mapping if flexible)
            # Creating naive record as per existing schema
            
            db.add(new_history)
            db.commit()
            return True
            
        # 2. Handle Interest / Installment (Schedule based)
        # Find unpaid schedule item for today or nearest
        # For simplicity in this manual confirm: Just mark the earliest unpaid item or create new if needed?
        # Backend logic for TG usually updates existing schedule items.
        
        schedule_item = db.query(LichSuTraLai).filter(
            LichSuTraLai.MaHD == ma_hd,
            LichSuTraLai.ThanhToan == False
        ).order_by(LichSuTraLai.Ngay.asc()).first()
        
        if schedule_item:
            schedule_item.ThanhToan = True
            schedule_item.TienDaTra = amount
            # If amount matches expected, fine. Rely on user confirmation.
            db.commit()
            return True
        else:
            # No schedule item found (maybe extra payment?), create record
            new_history = LichSuTraLai(
                MaHD=ma_hd,
                Ngay=today_date,
                SoTien=amount,
                TienDaTra=amount,
                ThanhToan=True,
                TrangThaiThanhToan="Đúng hạn",
                TrangThaiNgayThanhToan="Đúng hạn"
            )
            db.add(new_history)
            db.commit()
            return True
            
    except Exception as e:
        print(f"Error confirming payment: {e}")
        db.rollback()
        return False
    finally:
        db.close()
