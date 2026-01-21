from telegram import Update
from telegram.ext import ContextTypes
from services.database import get_user_by_telegram
from handlers.menu import send_qr_code

async def handle_user_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle text messages from user"""
    if not update.message or not update.message.text:
        return

    user_data = context.user_data
    state = user_data.get('payment_state')
    
    if state == 'WAITING_PARTIAL_AMOUNT':
        ma_hd = user_data.get('payment_ma_hd')
        text = update.message.text.replace('.', '').replace(',', '').strip()
        
        try:
            amount = int(text)
            if amount < 10000:
                await update.message.reply_text("⚠️ Số tiền quá nhỏ. Vui lòng nhập tối thiểu 10.000 VNĐ.")
                return
                
            # Clear state
            user_data['payment_state'] = None
            user_data['payment_ma_hd'] = None
            
            # Send QR
            content = f"THANH TOAN MOT PHAN GOC HD {ma_hd}"
            await send_qr_code(update.message, ma_hd, amount, content, "partial")
            
        except ValueError:
            await update.message.reply_text("❌ Số tiền không hợp lệ. Vui lòng nhập số (ví dụ 500000)")
