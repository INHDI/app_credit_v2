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
    for field, value in settings_update.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
        
    db.commit()
    db.refresh(settings)
    
    return ApiResponse.success_response(data=settings, message="Cập nhật cấu hình hệ thống thành công")
