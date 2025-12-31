"""
System Settings API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.models.settings import Bank, SystemSettings
from app.schemas.settings import BankResponse, SystemSettingsResponse, SystemSettingsUpdate
from app.schemas.response import ApiResponse

router = APIRouter(
    prefix="/settings",
    tags=["Cấu hình hệ thống"]
)

@router.get("/banks", response_model=ApiResponse[List[BankResponse]])
async def get_banks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get list of supported banks (Admin only)"""
    banks = db.query(Bank).order_by(Bank.id).all()
    return ApiResponse.success_response(data=banks, message="Lấy danh sách ngân hàng thành công")

@router.get("", response_model=ApiResponse[SystemSettingsResponse])
async def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get system settings (Admin only)"""
    settings = db.query(SystemSettings).first()
    if not settings:
        # Should be created by init_db, but fallback
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
    return ApiResponse.success_response(data=settings, message="Lấy cấu hình hệ thống thành công")

@router.put("", response_model=ApiResponse[SystemSettingsResponse])
async def update_settings(
    settings_update: SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update system settings (Admin only)"""
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings()
        db.add(settings)
    
    # Update fields
    # Special handling for Telegram Chat ID
    update_data = settings_update.model_dump(exclude_unset=True)
    
    if "telegram_chat_id" in update_data and update_data["telegram_chat_id"]:
        chat_id = update_data["telegram_chat_id"].strip()
        # Auto format for Channel ID (usually starts with -100)
        # If user enters -XZY, convert to -100XYZ
        if chat_id.startswith("-") and not chat_id.startswith("-100"):
            # Insert 100 after the minus sign
            chat_id = "-100" + chat_id[1:]
        elif not chat_id.startswith("-"):
            # If no minus sign at all, assume it needs -100 prefix
            chat_id = "-100" + chat_id
            
        update_data["telegram_chat_id"] = chat_id

    for field, value in update_data.items():
        setattr(settings, field, value)
        
    db.commit()
    db.refresh(settings)
    
    return ApiResponse.success_response(data=settings, message="Cập nhật cấu hình hệ thống thành công")
