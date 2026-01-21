"""
Start and verification command handlers
Handles /start, /verify, /help commands
"""
from telegram import Update
from telegram.ext import ContextTypes
import logging

from services.database import get_user_by_telegram, get_debtor_by_phone, link_telegram_to_user
from keyboards.menus import MAIN_MENU_KEYBOARD, back_to_main

logger = logging.getLogger(__name__)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle /start command
    Shows welcome message with menu if verified, otherwise shows verification guide
    """
    chat_id = str(update.effective_chat.id)
    user = get_user_by_telegram(chat_id)
    
    if not user:
        welcome_text = """
👋 <b>Chào mừng đến với CreditApp Bot!</b>

Bot này giúp bạn:
• 📊 Xem thông tin nợ
• 📋 Quản lý hợp đồng
• 💳 Thanh toán nhanh qua QR
• 📅 Theo dõi lịch trả

━━━━━━━━━━━━━━━━━━━━━━━

🔐 <b>Để bắt đầu sử dụng, vui lòng xác thực tài khoản:</b>

Gửi lệnh: <code>/verify SốĐiệnThoại</code>

<b>Ví dụ:</b> <code>/verify 0901234567</code>

⚠️ <i>Số điện thoại phải trùng với số đã đăng ký trong hệ thống</i>
"""
        await update.message.reply_text(welcome_text, parse_mode="HTML")
        logger.info(f"New user started bot: {chat_id}")
    else:
        welcome_text = f"""
👋 <b>Xin chào {user.ho_ten}!</b>

Chọn một tùy chọn bên dưới để tiếp tục:
"""
        await update.message.reply_text(
            welcome_text,
            reply_markup=MAIN_MENU_KEYBOARD,
            parse_mode="HTML"
        )
        logger.info(f"Verified user accessed bot: {user.email}")


async def verify_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle /verify <phone> command
    Links telegram to user account after phone verification
    """
    chat_id = str(update.effective_chat.id)
    
    # Check if already verified
    existing_user = get_user_by_telegram(chat_id)
    if existing_user:
        await update.message.reply_text(
            f"✅ Bạn đã xác thực tài khoản <b>{existing_user.ho_ten}</b>.\n\n"
            "Sử dụng /menu để xem menu chính.",
            parse_mode="HTML"
        )
        return
    
    # Check arguments
    if not context.args:
        await update.message.reply_text(
            "❌ <b>Thiếu số điện thoại!</b>\n\n"
            "Cách dùng: <code>/verify SốĐiệnThoại</code>\n\n"
            "Ví dụ: <code>/verify 0901234567</code>",
            parse_mode="HTML"
        )
        return
    
    phone = context.args[0].strip()
    
    # Validate phone format
    if not phone.isdigit() or len(phone) < 10 or len(phone) > 11:
        await update.message.reply_text(
            "❌ <b>Số điện thoại không hợp lệ!</b>\n\n"
            "Số điện thoại phải có 10-11 chữ số.\n\n"
            "Ví dụ: <code>/verify 0901234567</code>",
            parse_mode="HTML"
        )
        return
    
    # Find debtor by phone
    user = get_debtor_by_phone(phone)
    if not user:
        await update.message.reply_text(
            "❌ <b>Không tìm thấy tài khoản!</b>\n\n"
            "Số điện thoại này chưa được đăng ký trong hệ thống.\n\n"
            "Vui lòng kiểm tra lại hoặc liên hệ quản trị viên.",
            parse_mode="HTML"
        )
        logger.warning(f"Failed verification attempt with phone: {phone}")
        return
    
    # Check if user already linked to another telegram
    if user.telegram_chat_id and user.telegram_chat_id != chat_id:
        await update.message.reply_text(
            "❌ <b>Tài khoản đã được liên kết!</b>\n\n"
            "Số điện thoại này đã được liên kết với một tài khoản Telegram khác.\n\n"
            "Vui lòng liên hệ quản trị viên nếu bạn cần hỗ trợ.",
            parse_mode="HTML"
        )
        return
    
    # Link telegram to user
    success = link_telegram_to_user(user.id, chat_id)
    
    if not success:
        await update.message.reply_text(
            "❌ <b>Có lỗi xảy ra!</b>\n\n"
            "Không thể liên kết tài khoản. Vui lòng thử lại sau.",
            parse_mode="HTML"
        )
        return
    
    # Delete verification message for security (contains phone number)
    try:
        await update.message.delete()
        logger.info(f"Deleted verification message for security")
    except Exception as e:
        logger.warning(f"Could not delete verification message: {e}")
    
    # Send success message with menu
    success_text = f"""
✅ <b>Xác thực thành công!</b>

Chào mừng <b>{user.ho_ten}</b>!

Bạn có thể sử dụng các tính năng sau:
"""
    await context.bot.send_message(
        chat_id=chat_id,
        text=success_text,
        reply_markup=MAIN_MENU_KEYBOARD,
        parse_mode="HTML"
    )
    
    logger.info(f"User verified: {user.email} linked to chat_id: {chat_id}")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle /help command
    Shows usage instructions
    """
    help_text = """
📚 <b>HƯỚNG DẪN SỬ DỤNG</b>

<b>━━━━ Các lệnh có sẵn ━━━━</b>

/start - Bắt đầu sử dụng bot
/menu - Hiển thị menu chính
/tonghop - Xem tổng hợp nợ
/hopdong - Danh sách hợp đồng
/lichsu - Lịch sử thanh toán
/help - Hướng dẫn này

<b>━━━━ Cách thanh toán ━━━━</b>

1️⃣ Nhấn nút "💳 Thanh toán" trong menu
2️⃣ Chọn hợp đồng cần thanh toán
3️⃣ Chọn loại thanh toán (Lãi/Gốc)
4️⃣ Nhận mã QR và chuyển khoản

<b>━━━━ Lưu ý ━━━━</b>

• Mã QR có nội dung thanh toán tự động
• Sau khi chuyển khoản, hệ thống sẽ cập nhật tự động
• Liên hệ quản trị viên nếu cần hỗ trợ

⏰ Bot hoạt động 24/7
"""
    await update.message.reply_text(
        help_text,
        reply_markup=back_to_main(),
        parse_mode="HTML"
    )


async def menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle /menu command
    Shows main menu
    """
    chat_id = str(update.effective_chat.id)
    user = get_user_by_telegram(chat_id)
    
    if not user:
        await update.message.reply_text(
            "❌ Vui lòng xác thực tài khoản trước.\n\n"
            "Gửi: <code>/verify SốĐiệnThoại</code>",
            parse_mode="HTML"
        )
        return
    
    await update.message.reply_text(
        f"📱 <b>Menu chính</b>\n\nXin chào {user.ho_ten}!",
        reply_markup=MAIN_MENU_KEYBOARD,
        parse_mode="HTML"
    )
