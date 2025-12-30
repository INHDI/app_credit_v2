"""
Settings and Bank configuration models
"""
from sqlalchemy import Column, Integer, String, Boolean, Text
from app.core.database import Base

class Bank(Base):
    """List of supported banks"""
    __tablename__ = "banks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False) # Full Name
    short_name = Column(String, nullable=True) # Short Name
    code = Column(String, nullable=False, unique=True) # Bank Code (e.g. VCB)
    bin = Column(String, nullable=False) # BIN/NAPAS Code

class SystemSettings(Base):
    """System-wide settings (singleton usually)"""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Default Payment Info
    bank_id = Column(Integer, nullable=True) # Linked to Bank table logic in App, but simple ID here
    bank_account_no = Column(String, nullable=True) # STK
    bank_account_name = Column(String, nullable=True) # Ten Chu TK
    
    # Notification Configs
    zalo_enabled = Column(Boolean, default=False)
    zalo_webhook_url = Column(String, nullable=True)
    
    telegram_enabled = Column(Boolean, default=False)
    telegram_bot_token = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    
    email_enabled = Column(Boolean, default=False)
    email_host = Column(String, nullable=True)
    email_port = Column(Integer, nullable=True)
    email_user = Column(String, nullable=True)
    email_password = Column(String, nullable=True)
    
    # Other potential configs
    site_name = Column(String, default="Credit App")
