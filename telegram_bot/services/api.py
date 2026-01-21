"""
Backend API Client for Telegram Bot
"""
import httpx
import logging
from config import API_BASE_URL, BOT_ADMIN_EMAIL, BOT_ADMIN_PASSWORD

logger = logging.getLogger(__name__)

class APIClient:
    """Client for backend API interactions"""
    
    _token = None
    
    @classmethod
    async def get_token(cls):
        """Login and get access token"""
        if cls._token:
            return cls._token
            
        async with httpx.AsyncClient() as client:
            try:
                # Login step 1
                response = await client.post(
                    f"{API_BASE_URL}/auth/login",
                    json={
                        "email": BOT_ADMIN_EMAIL,
                        "password": BOT_ADMIN_PASSWORD
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Check if direct token (OTP disabled) or temp token
                    login_data = data.get("data", {})
                    token_obj = login_data.get("token")
                    
                    if token_obj and token_obj.get("access_token"):
                        cls._token = token_obj["access_token"]
                        logger.info("✅ Bot logged in to API successfully")
                        return cls._token
                    else:
                        logger.error(f"❌ Login failed: OTP might be enabled? Response: {data}")
                        return None
                else:
                    logger.error(f"❌ Login failed: {response.status_code} - {response.text}")
                    return None
            except Exception as e:
                logger.error(f"❌ API Login error: {e}")
                return None

    @classmethod
    async def confirm_payment(cls, ma_hd: str, amount: int, payment_type: str) -> bool:
        """
        Confirm payment via API
        payment_type: 'interest', 'partial', 'full', 'installment'
        """
        token = await cls.get_token()
        if not token:
            return False
            
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient() as client:
            try:
                # Determine endpoint based on type
                if payment_type in ["partial", "full"] and ma_hd.startswith("TC"):
                    # Tin Chap Principal Payment -> PUT /tin-chap/tra-goc/{ma_hd}
                    response = await client.put(
                        f"{API_BASE_URL}/tin-chap/tra-goc/{ma_hd}",
                        headers=headers,
                        params={"so_tien_tra_goc": amount}
                    )
                else:
                    # Others -> Pay History / Installment -> POST /lich-su-tra-lai/payHD/{ma_hd}
                    # Note: payHD pays against schedule. 
                    # If it's pure interest or installment, this matches logic.
                    response = await client.post(
                        f"{API_BASE_URL}/lich-su-tra-lai/payHD/{ma_hd}",
                        headers=headers,
                        params={"so_tien": amount}
                    )
                
                if response.status_code in [200, 201]:
                    logger.info(f"✅ Payment confirmed via API for {ma_hd}")
                    return True
                else:
                    logger.error(f"❌ Payment API failed: {response.status_code} - {response.text}")
                    # Retry once if 401
                    if response.status_code == 401:
                        cls._token = None # Clear token to re-login next time
                        # Recursive retry could be dangerous, so just fail safe for now or implement retry logic
                    return False
                    
            except Exception as e:
                logger.error(f"❌ API Request error: {e}")
                return False
