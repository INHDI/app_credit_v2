"""
CRUD operations for User model
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password, verify_password


def create_user(db: Session, user_create: UserCreate) -> User:
    """
    Create a new user
    
    Args:
        db: Database session
        user_create: User creation schema
        
    Returns:
        Created User object
    """
    from app.services import otp_service
    
    # Hash the password
    hashed_password = hash_password(user_create.password)
    
    # Generate OTP secret for 2FA (ready for first login)
    otp_secret = otp_service.generate_otp_secret()
    
    # Create user object
    db_user = User(
        ho_ten=user_create.ho_ten,
        so_dien_thoai=user_create.so_dien_thoai,
        email=user_create.email,
        password_hash=hashed_password,
        role=user_create.role or "debtor",
        otp_secret=otp_secret,  # Pre-generate OTP secret
        otp_enabled=False,       # Will be enabled after first OTP verify
        otp_verified=False,
        must_change_password=True  # Require password change on first login
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Get a user by email
    
    Args:
        db: Database session
        email: User email
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.email == email).first()


def get_user_by_phone(db: Session, phone: str) -> Optional[User]:
    """
    Get a user by phone number
    
    Args:
        db: Database session
        phone: Phone number
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.so_dien_thoai == phone).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """
    Get a user by ID
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.id == user_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """
    Get list of users with pagination
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        
    Returns:
        List of User objects
    """
    return db.query(User).offset(skip).limit(limit).all()


def get_users_by_role(db: Session, role: str) -> List[User]:
    """
    Get list of users by role
    
    Args:
        db: Database session
        role: User role (admin/collector/debtor)
        
    Returns:
        List of User objects with specified role
    """
    return db.query(User).filter(User.role == role, User.is_active == True).all()


def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
    """
    Update a user
    
    Args:
        db: Database session
        user_id: User ID
        user_update: User update schema
        
    Returns:
        Updated User object if found, None otherwise
    """
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    # Update only provided fields
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int) -> bool:
    """
    Delete a user
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        True if deleted, False if not found
    """
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
    
    db.delete(db_user)
    db.commit()
    return True


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user by email and password
    
    Args:
        db: Database session
        email: User email
        password: Plain text password
        
    Returns:
        User object if authenticated, None otherwise
    """
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user


def check_user_exists(db: Session, email: str, phone: str) -> Optional[str]:
    """
    Check if a user with given email or phone already exists
    
    Args:
        db: Database session
        email: Email to check
        phone: Phone to check
        
    Returns:
        Error message if exists, None otherwise
    """
    if get_user_by_email(db, email):
        return "Email đã được sử dụng"
    if get_user_by_phone(db, phone):
        return "Số điện thoại đã được sử dụng"
    return None
