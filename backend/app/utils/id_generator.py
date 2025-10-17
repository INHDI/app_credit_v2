"""
ID Generator utility functions
"""
from sqlalchemy.orm import Session
from app.models import TinChap, TraGop


def generate_tin_chap_id(db: Session) -> str:
    """
    Generate TinChap contract ID in format TCXXX
    XXX is an auto-incrementing integer
    """
    # Get the last TinChap record
    last_record = db.query(TinChap).order_by(TinChap.MaHD.desc()).first()
    
    if last_record:
        # Extract the number from the last MaHD (e.g., TC001 -> 001)
        last_number = int(last_record.MaHD[2:])
        new_number = last_number + 1
    else:
        new_number = 1
    
    # Format with leading zeros (e.g., TC001, TC002, ..., TC100)
    return f"TC{new_number:03d}"


def generate_tra_gop_id(db: Session) -> str:
    """
    Generate TraGop contract ID in format TGXXX
    XXX is an auto-incrementing integer
    """
    # Get the last TraGop record
    last_record = db.query(TraGop).order_by(TraGop.MaHD.desc()).first()
    
    if last_record:
        # Extract the number from the last MaHD (e.g., TG001 -> 001)
        last_number = int(last_record.MaHD[2:])
        new_number = last_number + 1
    else:
        new_number = 1
    
    # Format with leading zeros (e.g., TG001, TG002, ..., TG100)
    return f"TG{new_number:03d}"

