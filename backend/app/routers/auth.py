"""
Authentication API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.deps import get_current_user, require_admin
from app.core.enums import UserRole
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, UserWithToken, UserUpdate
from app.schemas.response import ApiResponse
from app.crud import user as crud_user
from app.models.user import User

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register", response_model=ApiResponse[UserResponse], status_code=201)
async def register(
    user_create: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user
    
    - **ho_ten**: Họ tên người dùng
    - **so_dien_thoai**: Số điện thoại (10-11 số)
    - **email**: Email
    - **password**: Mật khẩu (tối thiểu 6 ký tự)
    - **role**: Vai trò (admin/collector/debtor), mặc định là debtor
    """
    # Check if user already exists
    error = crud_user.check_user_exists(db, user_create.email, user_create.so_dien_thoai)
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Validate role
    if user_create.role and user_create.role not in UserRole.list_values():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role không hợp lệ. Chọn một trong: {UserRole.list_values()}"
        )
    
    # Create user
    user = crud_user.create_user(db, user_create)
    
    return ApiResponse.success_response(
        data=UserResponse.model_validate(user),
        message="Đăng ký tài khoản thành công"
    )


@router.post("/login", response_model=ApiResponse[UserWithToken])
async def login(
    user_login: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login and get JWT access token
    
    - **email**: Email
    - **password**: Mật khẩu
    """
    # Authenticate user
    user = crud_user.authenticate_user(db, user_login.email, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "user_id": user.id,
            "email": user.email,
            "role": user.role
        },
        expires_delta=access_token_expires
    )
    
    return ApiResponse.success_response(
        data=UserWithToken(
            user=UserResponse.model_validate(user),
            token=Token(access_token=access_token)
        ),
        message="Đăng nhập thành công"
    )


@router.post("/login/form", response_model=Token)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login using OAuth2 form (for Swagger docs)
    """
    user = crud_user.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={
            "user_id": user.id,
            "email": user.email,
            "role": user.role
        }
    )
    
    return Token(access_token=access_token)


@router.post("/logout", response_model=ApiResponse)
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Logout current user
    
    Note: JWT tokens are stateless, so this endpoint just confirms logout.
    Client should delete the token from storage.
    """
    return ApiResponse.success_response(
        data={"message": "Đã đăng xuất"},
        message="Đăng xuất thành công"
    )


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user info
    """
    return ApiResponse.success_response(
        data=UserResponse.model_validate(current_user),
        message="Lấy thông tin người dùng thành công"
    )


@router.get("/users", response_model=ApiResponse[list])
async def get_users(
    role: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get list of users (Admin only)
    
    - **role**: Optional filter by role
    """
    if role:
        users = crud_user.get_users_by_role(db, role)
    else:
        users = crud_user.get_users(db)
    
    return ApiResponse.success_response(
        data=[UserResponse.model_validate(u) for u in users],
        message="Lấy danh sách người dùng thành công"
    )


@router.get("/users/debtors", response_model=ApiResponse[list])
async def get_debtors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of users with debtor role (for contract creation form)
    
    Available for admin and collector roles
    """
    if current_user.role not in [UserRole.ADMIN.value, UserRole.COLLECTOR.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập"
        )
    
    users = crud_user.get_users_by_role(db, UserRole.DEBTOR.value)
    
    return ApiResponse.success_response(
        data=[{"id": u.id, "ho_ten": u.ho_ten, "so_dien_thoai": u.so_dien_thoai} for u in users],
        message="Lấy danh sách người nợ thành công"
    )


@router.put("/users/{user_id}", response_model=ApiResponse[UserResponse])
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update user info (Admin only)
    """
    # Check if user exists
    user = crud_user.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    
    # Check email/phone uniqueness if changed
    if user_update.email and user_update.email != user.email:
        if crud_user.get_user_by_email(db, user_update.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã được sử dụng"
            )
            
    if user_update.so_dien_thoai and user_update.so_dien_thoai != user.so_dien_thoai:
        if crud_user.get_user_by_phone(db, user_update.so_dien_thoai):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số điện thoại đã được sử dụng"
            )

    updated_user = crud_user.update_user(db, user_id, user_update)
    
    return ApiResponse.success_response(
        data=UserResponse.model_validate(updated_user),
        message="Cập nhật thông tin thành công"
    )


@router.delete("/users/{user_id}", response_model=ApiResponse)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete user (Admin only)
    """
    # Prevent deleting self
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa tài khoản đang đăng nhập"
        )

    success = crud_user.delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
        
    return ApiResponse.success_response(
        data={"user_id": user_id},
        message="Xóa người dùng thành công"
    )
