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


def format_principal_payment_notification(ma_hd: str, amount: int, payer_name: str = "Khách hàng", remaining_principal: int = 0) -> str:
    """
    Format principal payment notification message for Telegram
    
    Args:
        ma_hd: Contract ID
        amount: Payment amount
        payer_name: Name of payer
        remaining_principal: Remaining principal after payment
    
    Returns:
        Formatted HTML message for Telegram
    """
    amount_formatted = f"{amount:,.0f}".replace(",", ".")
    remaining_formatted = f"{remaining_principal:,.0f}".replace(",", ".")
    
    payment_type_text = "Thanh toán toàn bộ gốc" if remaining_principal <= 0 else "Thanh toán một phần gốc"
    
    message = f"""
💰 <b>THÔNG BÁO THANH TOÁN GỐC</b>

📋 <b>Hợp đồng:</b> {ma_hd}
👤 <b>Khách hàng:</b> {payer_name}
💵 <b>Số tiền trả gốc:</b> {amount_formatted} VNĐ
📊 <b>Gốc còn lại:</b> {remaining_formatted} VNĐ
💳 <b>Loại:</b> {payment_type_text}
✅ <b>Trạng thái:</b> Đã xác nhận thanh toán

⏰ Thời gian: <i>Vừa xong</i>
"""
    return message.strip()


async def send_debtor_notification(
    db: Session,
    user_id: int,
    message: str
) -> dict:
    """
    Send notification to individual debtor via their personal Telegram chat
    
    Args:
        db: Database session
        user_id: User ID (debtor)
        message: Message to send
    
    Returns:
        dict with success status
    """
    from app.models.user import User
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}
    
    if not user.telegram_chat_id:
        return {"success": False, "error": "User not linked to Telegram"}
    
    # Get bot token from settings
    settings = db.query(SystemSettings).first()
    if not settings or not settings.telegram_bot_token:
        return {"success": False, "error": "Bot not configured"}
    
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": user.telegram_chat_id,
        "text": message,
        "parse_mode": "HTML"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            if response.status_code == 200:
                return {"success": True, "user_id": user_id, "email": user.email}
            return {"success": False, "error": f"Telegram API error: {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def format_debtor_payment_reminder(payments: list, debtor_name: str) -> str:
    """
    Format personal payment reminder for individual debtor
    
    Args:
        payments: List of payments for this debtor
        debtor_name: Debtor's name
    
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
        f"📅 <b>NHẮC THANH TOÁN</b>",
        "",
        f"Xin chào <b>{debtor_name}</b>,",
        "",
        f"Bạn có <b>{len(payments)}</b> khoản cần thanh toán ngày <b>{today}</b>:",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
    ]
    
    for idx, p in enumerate(payments, 1):
        amount_formatted = f"{p.get('so_tien', 0):,.0f}".replace(",", ".")
        message_lines.extend([
            f"",
            f"<b>{idx}. HĐ: {p.get('ma_hd', 'N/A')}</b>",
            f"   💵 Số tiền: <b>{amount_formatted} VNĐ</b>",
        ])
    
    message_lines.extend([
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"💰 <b>Tổng: {total_formatted} VNĐ</b>",
        "",
        "💳 Sử dụng /menu để thanh toán nhanh qua QR",
        "",
        "⏰ <i>Tin nhắn tự động từ CreditApp</i>"
    ])
    
    return "\n".join(message_lines)


async def notify_all_debtors_due_today(db: Session) -> dict:
    """
    Send payment reminders to ALL debtors who have payments due today
    Each debtor receives a personal notification about their own debts
    
    Args:
        db: Database session
        
    Returns:
        dict with success count and details
    """
    from datetime import date
    from app.models.user import User
    from app.models.lich_su_tra_lai import LichSuTraLai
    from app.models.tin_chap import TinChap
    from app.models.tra_gop import TraGop
    
    today = date.today()
    results = {"sent": 0, "failed": 0, "skipped": 0, "details": []}
    
    # Get all users with telegram linked
    debtors = db.query(User).filter(
        User.role == "debtor",
        User.is_active == True,
        User.telegram_chat_id.isnot(None)
    ).all()
    
    for debtor in debtors:
        # Get contract IDs for this debtor
        tc_ids = [tc.MaHD for tc in db.query(TinChap.MaHD).filter(TinChap.user_id == debtor.id).all()]
        tg_ids = [tg.MaHD for tg in db.query(TraGop.MaHD).filter(TraGop.user_id == debtor.id).all()]
        all_ids = tc_ids + tg_ids
        
        if not all_ids:
            results["skipped"] += 1
            continue
        
        # Get payments due today for this debtor
        due_payments = db.query(LichSuTraLai).filter(
            LichSuTraLai.MaHD.in_(all_ids),
            LichSuTraLai.Ngay == today,
            LichSuTraLai.ThanhToan == False
        ).all()
        
        if not due_payments:
            results["skipped"] += 1
            continue
        
        # Format payments
        payments_data = [
            {"ma_hd": p.MaHD, "so_tien": p.SoTien}
            for p in due_payments
        ]
        
        message = format_debtor_payment_reminder(payments_data, debtor.ho_ten)
        
        # Send notification
        result = await send_debtor_notification(db, debtor.id, message)
        
        if result.get("success"):
            results["sent"] += 1
            results["details"].append({"user_id": debtor.id, "email": debtor.email, "status": "sent"})
        else:
            results["failed"] += 1
            results["details"].append({"user_id": debtor.id, "email": debtor.email, "status": "failed", "error": result.get("error")})
    
    return results

