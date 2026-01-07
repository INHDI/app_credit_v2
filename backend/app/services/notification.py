"""
Notification service for Telegram, Zalo, Email
"""
import httpx
from typing import Optional
from sqlalchemy.orm import Session
from app.models.settings import SystemSettings

async def send_telegram_notification(
    db: Session,
    message: str
) -> dict:
    """
    Send notification to Telegram group using settings from DB
    
    Args:
        db: Database session
        message: Message to send
    
    Returns:
        dict with success status and details
    """
    # Get settings
    settings = db.query(SystemSettings).first()
    
    if not settings:
        return {"success": False, "error": "System settings not found"}
    
    if not settings.telegram_enabled:
        return {"success": False, "error": "Telegram notifications disabled"}
    
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return {"success": False, "error": "Telegram bot token or chat ID not configured"}
    
    bot_token = settings.telegram_bot_token
    chat_id = settings.telegram_chat_id
    
    # Telegram API URL
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            
            if response.status_code == 200:
                return {"success": True, "message": "Notification sent successfully"}
            else:
                return {
                    "success": False, 
                    "error": f"Telegram API error: {response.status_code}",
                    "details": response.text
                }
    except Exception as e:
        return {"success": False, "error": f"Failed to send message: {str(e)}"}


def format_daily_payment_reminder(payments: list) -> str:
    """
    Format daily payment reminder message for Telegram
    
    Args:
        payments: List of dicts with keys: ma_hd, ho_ten, ngay, so_tien
    
    Returns:
        Formatted HTML message for Telegram
    """
    from datetime import date
    
    if not payments:
        return ""
    
    today = date.today().strftime("%d/%m/%Y")
    total_amount = sum(p.get("so_tien", 0) for p in payments)
    total_formatted = f"{total_amount:,.0f}".replace(",", ".")
    
    message_lines = [
        f"📅 <b>NHẮC NỢ NGÀY {today}</b>",
        "",
        f"📊 Tổng số khoản: <b>{len(payments)}</b>",
        f"💰 Tổng số tiền: <b>{total_formatted} VNĐ</b>",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
    ]
    
    for idx, p in enumerate(payments, 1):
        amount_formatted = f"{p.get('so_tien', 0):,.0f}".replace(",", ".")
        message_lines.extend([
            f"",
            f"<b>{idx}. {p.get('ho_ten', 'N/A')}</b>",
            f"   📋 HĐ: <code>{p.get('ma_hd', 'N/A')}</code>",
            f"   💵 Số tiền: <b>{amount_formatted} VNĐ</b>",
        ])
    
    message_lines.extend([
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "⏰ <i>Tin nhắn tự động từ hệ thống</i>"
    ])
    
    return "\n".join(message_lines)


def format_payment_notification(ma_hd: str, amount: int, payer_name: str = "Khách hàng", payment_method: str = "Chuyển khoản") -> str:
    """
    Format payment notification message for Telegram
    
    Args:
        ma_hd: Contract ID
        amount: Payment amount
        payer_name: Name of payer (optional)
        payment_method: Payment method description
    
    Returns:
        Formatted HTML message for Telegram
    """
    amount_formatted = f"{amount:,.0f}".replace(",", ".")
    
    message = f"""
💰 <b>THÔNG BÁO THANH TOÁN</b>

📋 <b>Hợp đồng:</b> {ma_hd}
👤 <b>Khách hàng:</b> {payer_name}
💵 <b>Số tiền:</b> {amount_formatted} VNĐ
💳 <b>Hình thức:</b> {payment_method}
✅ <b>Trạng thái:</b> Đã xác nhận thanh toán

⏰ Thời gian: <i>Vừa xong</i>
"""
    return message.strip()
