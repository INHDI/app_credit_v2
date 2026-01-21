"""
Authentication API routes with OTP/2FA support
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES, OTP_ENABLED
from app.core.deps import get_current_user, require_admin, require_admin_or_collector
from app.core.enums import UserRole
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, UserWithToken, UserUpdate
from app.schemas.otp import (
    LoginStep1Response, OTPSetupResponse, OTPVerifyRequest, 
    OTPLoginRequest, OTPSetupRequest, PasswordChangeRequest
)
from app.schemas.response import ApiResponse
from app.crud import user as crud_user
from app.models.user import User
from app.services import otp_service

# Temp token expiry for OTP flow (5 minutes)
TEMP_TOKEN_EXPIRE_MINUTES = 5

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


@router.post("/login", response_model=ApiResponse[LoginStep1Response])
async def login_step1(
    user_login: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login Step 1: Verify email + password
    
    Returns temporary token and flags for:
    - **requires_otp**: Always true (2FA required for all users) unless OTP_ENABLED is False
    - **requires_setup**: True if first time - need to scan QR code
    - **requires_password_change**: True if must change password
    - **temp_token**: Temporary token for OTP step (expires in 5 minutes)
    """
    # Authenticate user (email + password only)
    user = crud_user.authenticate_user(db, user_login.email, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # If OTP is disabled, return access token immediately
    if not OTP_ENABLED:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "user_id": user.id, 
                "email": user.email,
                "role": user.role,
                "sub": str(user.id)
            },
            expires_delta=access_token_expires
        )
        
        return ApiResponse.success_response(
            data=LoginStep1Response(
                requires_otp=False,
                requires_setup=False,
                requires_password_change=bool(user.must_change_password),
                temp_token=access_token, # Reuse field as it is required
                user_email=user.email,
                token=Token(access_token=access_token, token_type="bearer"),
                user=UserResponse.model_validate(user)
            ),
            message="Đăng nhập thành công"
        )
    
    # Check if user needs OTP setup (show QR if not verified yet)
    requires_setup = not user.otp_verified
    
    # If first time and no secret, generate OTP secret and save it
    if requires_setup and not user.otp_secret:
        otp_secret = otp_service.generate_otp_secret()
        user.otp_secret = otp_secret
        db.commit()
    
    # Create temporary token for OTP verification step
    temp_token = create_access_token(
        data={
            "user_id": user.id,
            "email": user.email,
            "purpose": "otp_verification"  # Special purpose to distinguish from regular tokens
        },
        expires_delta=timedelta(minutes=TEMP_TOKEN_EXPIRE_MINUTES)
    )
    
    return ApiResponse.success_response(
        data=LoginStep1Response(
            requires_otp=True,  # Always require OTP
            requires_setup=requires_setup,
            requires_password_change=bool(user.must_change_password),
            temp_token=temp_token,
            user_email=user.email
        ),
        message="Vui lòng xác thực OTP" if not requires_setup else "Vui lòng cài đặt xác thực 2 lớp"
    )


@router.post("/otp/setup", response_model=ApiResponse[OTPSetupResponse])
async def get_otp_setup(
    request: OTPSetupRequest,
    db: Session = Depends(get_db)
):
    """
    Get QR code for OTP setup (first-time login)
    
    User should scan this QR code with Google Authenticator or similar app.
    """
    # Decode temp token
    payload = decode_access_token(request.temp_token)
    if not payload or payload.get("purpose") != "otp_verification":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn"
        )
    
    user_id = payload.get("user_id")
    user = crud_user.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )
    
    if not user.otp_secret:
        # Generate new secret if not exists
        user.otp_secret = otp_service.generate_otp_secret()
        db.commit()
    
    # Generate QR code
    qr_base64, otpauth_url = otp_service.generate_qr_code(
        secret=user.otp_secret,
        email=user.email,
        issuer="CreditApp"
    )
    
    return ApiResponse.success_response(
        data=OTPSetupResponse(
            qr_code_base64=qr_base64,
            secret=user.otp_secret,
            otpauth_url=otpauth_url
        ),
        message="Quét mã QR bằng ứng dụng xác thực (Google Authenticator, Authy, ...)"
    )


@router.post("/otp/verify", response_model=ApiResponse[UserWithToken])
async def verify_otp_and_login(
    request: OTPLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login Step 2: Verify OTP code and complete login
    
    Returns full access token on success.
    """
    # Decode temp token
    payload = decode_access_token(request.temp_token)
    if not payload or payload.get("purpose") != "otp_verification":
        print(f"DEBUG: Invalid temp_token or wrong purpose: {payload}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại."
        )
    
    user_id = payload.get("user_id")
    user = crud_user.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )
    
    if not user.otp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chưa cài đặt xác thực 2 lớp"
        )
    
    # Verify OTP code
    is_valid = otp_service.verify_otp(user.otp_secret, request.code)
    if not is_valid:
        current_otp = otp_service.get_current_otp(user.otp_secret)
        print(f"DEBUG: OTP verification failed for user {user.email}")
        print(f"DEBUG: Secret: {user.otp_secret[:4]}... | Input Code: {request.code} | Server expects: {current_otp}")
        print(f"DEBUG: Please check server time vs device time.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mã OTP không đúng hoặc đã hết hạn"
        )
    
    # Mark OTP as enabled and verified
    if not user.otp_enabled:
        user.otp_enabled = True
    if not user.otp_verified:
        user.otp_verified = True
    db.commit()
    
    # Create full access token
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


@router.post("/password/change", response_model=ApiResponse)
async def change_password(
    request: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change password (required on first login)
    
    After successful change, must_change_password is set to False.
    """
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng"
        )
    
    # Check new password is different
    if request.current_password == request.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải khác mật khẩu hiện tại"
        )
    
    # Update password
    current_user.password_hash = hash_password(request.new_password)
    current_user.must_change_password = False
    db.commit()
    
    return ApiResponse.success_response(
        data={"message": "Đổi mật khẩu thành công"},
        message="Đổi mật khẩu thành công"
    )


# ============== Legacy endpoints (for backward compatibility) ==============

@router.post("/login/form", response_model=Token)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login using OAuth2 form (for Swagger docs)
    Note: This skips OTP for Swagger testing convenience
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
    current_user: User = Depends(require_admin_or_collector)
):
    """
    Get list of users (Admin and Collector)
    
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


@router.post("/otp/reset/{user_id}", response_model=ApiResponse)
async def reset_user_otp(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Reset OTP for a user (Admin only)
    
    This will force the user to setup OTP again on next login.
    """
    user = crud_user.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    
    # Reset OTP fields
    user.otp_secret = None
    user.otp_enabled = False
    user.otp_verified = False
    db.commit()
    
    return ApiResponse.success_response(
        data={"user_id": user_id},
        message=f"Đã reset OTP cho người dùng {user.email}"
    )


@router.post("/password/reset/{user_id}", response_model=ApiResponse)
async def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Reset password for a user (Admin only)
    
    Sets password to default '123456' and requires user to change on next login.
    """
    user = crud_user.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    
    # Prevent resetting own password
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể reset mật khẩu của chính mình"
        )
    
    # Reset password to default and force password change
    default_password = "123456"
    user.password_hash = hash_password(default_password)
    user.must_change_password = True
    db.commit()
    
    return ApiResponse.success_response(
        data={"user_id": user_id, "new_password": default_password},
        message=f"Đã reset mật khẩu cho {user.email}. Mật khẩu mới: {default_password}"
    )


@router.post("/reset-all/{user_id}", response_model=ApiResponse)
async def reset_user_otp_and_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Reset both OTP and password for a user (Admin only)
    
    - Resets OTP (user needs to scan QR again)
    - Sets password to default '123456'
    - Forces password change on next login
    """
    user = crud_user.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể reset tài khoản của chính mình"
        )
    
    # Reset OTP
    user.otp_secret = None
    user.otp_enabled = False
    user.otp_verified = False
    
    # Reset password
    default_password = "123456"
    user.password_hash = hash_password(default_password)
    user.must_change_password = True
    
    db.commit()
    
    return ApiResponse.success_response(
        data={"user_id": user_id, "new_password": default_password},
        message=f"Đã reset OTP và mật khẩu cho {user.email}. Mật khẩu mới: {default_password}"
    )

