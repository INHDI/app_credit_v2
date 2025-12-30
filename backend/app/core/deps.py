"""
Authentication dependencies for FastAPI
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.enums import UserRole
from app.crud.user import get_user_by_id
from app.models.user import User

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token
    
    Args:
        token: JWT token from Authorization header
        db: Database session
        
    Returns:
        Current User object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
    
    # Decode token
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    # Get user ID from token
    user_id: int = payload.get("user_id")
    if user_id is None:
        raise credentials_exception
    
    # Get user from database
    user = get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản đã bị vô hiệu hóa"
        )
    
    return user


async def get_current_user_optional(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User | None:
    """
    Dependency to get the current user if authenticated, None otherwise
    Used for endpoints that work with or without authentication
    """
    if not token:
        return None
    
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None


def require_role(allowed_roles: List[UserRole]):
    """
    Dependency factory to check if user has required role
    
    Args:
        allowed_roles: List of roles that are allowed to access the endpoint
        
    Returns:
        Dependency function that checks user role
    """
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        """Check if current user has one of the allowed roles"""
        if current_user.role not in [role.value for role in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập chức năng này"
            )
        return current_user
    
    return role_checker


# Pre-defined role dependencies for convenience
require_admin = require_role([UserRole.ADMIN])
require_collector = require_role([UserRole.COLLECTOR])
require_debtor = require_role([UserRole.DEBTOR])
require_admin_or_collector = require_role([UserRole.ADMIN, UserRole.COLLECTOR])
