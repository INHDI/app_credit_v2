from pydantic import BaseModel
from typing import Optional, List

class BankBase(BaseModel):
    name: str
    short_name: Optional[str] = None
    code: str
    bin: str

class BankCreate(BankBase):
    pass

class BankResponse(BankBase):
    id: int
    
    class Config:
        from_attributes = True

class SystemSettingsBase(BaseModel):
    bank_id: Optional[int] = None
    bank_account_no: Optional[str] = None
    bank_account_name: Optional[str] = None
    
    zalo_enabled: bool = False
    zalo_webhook_url: Optional[str] = None
    
    telegram_enabled: bool = False
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    
    email_enabled: bool = False
    email_host: Optional[str] = None
    email_port: Optional[int] = None
    email_user: Optional[str] = None
    email_password: Optional[str] = None
    
    site_name: str = "Credit App"

class SystemSettingsUpdate(SystemSettingsBase):
    pass

class SystemSettingsResponse(SystemSettingsBase):
    id: int

    class Config:
        from_attributes = True
