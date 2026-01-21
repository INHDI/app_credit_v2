"""
OTP/TOTP Service for 2FA authentication
Uses pyotp - RFC 6238 compliant
Time step: 30 seconds (standard)
"""
import pyotp
import qrcode
import io
import base64
from typing import Tuple


def generate_otp_secret() -> str:
    """
    Generate a new TOTP secret (32 characters base32)
    
    Returns:
        Base32 encoded secret string
    """
    return pyotp.random_base32()


def get_totp(secret: str) -> pyotp.TOTP:
    """
    Get TOTP object for a secret
    
    Args:
        secret: Base32 encoded secret
        
    Returns:
        pyotp.TOTP object
    """
    return pyotp.TOTP(secret)


def verify_otp(secret: str, code: str) -> bool:
    """
    Verify a TOTP code
    
    Args:
        secret: User's TOTP secret
        code: 6-digit OTP code from authenticator app
        
    Returns:
        True if code is valid, False otherwise
        
    Note:
        Time window: 30 seconds (standard)
        Tolerance: 1 period (handles clock skew of ±30s)
    """
    if not secret or not code:
        return False
    
    try:
        totp = get_totp(secret)
        return totp.verify(code, valid_window=2)
    except Exception:
        return False


def get_current_otp(secret: str) -> str:
    """
    Get current OTP code for a secret (for testing purposes)
    
    Args:
        secret: User's TOTP secret
        
    Returns:
        Current 6-digit OTP code
    """
    totp = get_totp(secret)
    return totp.now()


def generate_qr_code(secret: str, email: str, issuer: str = "CreditApp") -> Tuple[str, str]:
    """
    Generate QR code for authenticator app setup
    
    Args:
        secret: User's TOTP secret
        email: User's email (displayed in authenticator app)
        issuer: App name (displayed in authenticator app)
        
    Returns:
        Tuple of (base64_encoded_png_image, otpauth_url)
        
    Compatible with:
        - Google Authenticator
        - Authy
        - Microsoft Authenticator
        - 1Password
        - And other TOTP-compatible apps
    """
    totp = get_totp(secret)
    otpauth_url = totp.provisioning_uri(name=email, issuer_name=issuer)
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=5
    )
    qr.add_data(otpauth_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 PNG
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    base64_img = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return base64_img, otpauth_url


def generate_otp_setup_data(email: str, issuer: str = "CreditApp") -> dict:
    """
    Generate complete OTP setup data for a new user
    
    Args:
        email: User's email
        issuer: App name
        
    Returns:
        dict with secret, qr_code_base64, and otpauth_url
    """
    secret = generate_otp_secret()
    qr_base64, otpauth_url = generate_qr_code(secret, email, issuer)
    
    return {
        "secret": secret,
        "qr_code_base64": qr_base64,
        "otpauth_url": otpauth_url
    }
