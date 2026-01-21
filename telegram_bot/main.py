"""
CreditApp Telegram Bot Service
Main entry point for the bot

Features:
- /start - Welcome and verification guide
- /verify <phone> - Link Telegram to debtor account
- /menu - Main menu with inline buttons
- /tonghop - Debt summary
- /hopdong - Contract list
- /lichsu - Payment history
- /help - Usage guide
- Inline menus for navigation
- QR code payment generation
"""
import asyncio
import logging
import sys
from telegram import BotCommand
from telegram.ext import Application, CommandHandler, CallbackQueryHandler

from config import BOT_TOKEN, LOG_LEVEL
from handlers import start_command, verify_command, help_command, menu_command, handle_callback
from handlers.messages import handle_user_message
from telegram.ext import MessageHandler, filters

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    stream=sys.stdout
)
logger = logging.getLogger(__name__)


async def post_init(application: Application) -> None:
    """Set bot commands on startup"""
    commands = [
        BotCommand("start", "Bắt đầu và hướng dẫn"),
        BotCommand("menu", "Mở menu chính"),
        BotCommand("verify", "Xác thực tài khoản (verify <SĐT>)"),
        BotCommand("tonghop", "Xem tổng hợp nợ"),
        BotCommand("hopdong", "Danh sách hợp đồng"),
        BotCommand("lichsu", "Lịch sử thanh toán"),
        BotCommand("help", "Xem hướng dẫn sử dụng"),
    ]
    await application.bot.set_my_commands(commands)
    logger.info("Bot commands set successfully")


def create_application() -> Application:
    """Create and configure bot application"""
    
    # Try to get token from env or DB
    token = BOT_TOKEN
    
    if not token:
        logger.info("Token not in env, checking database...")
        from services.database import get_telegram_config
        token = get_telegram_config()
        
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN not found in env or database!")
        raise ValueError("TELEGRAM_BOT_TOKEN is required in env or system_settings table")
    
    # Create application
    application = Application.builder().token(token).post_init(post_init).build()
    
    # Add command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("verify", verify_command))
    application.add_handler(CommandHandler("menu", menu_command))
    application.add_handler(CommandHandler("help", help_command))
    
    # Alternative command names
    application.add_handler(CommandHandler("tonghop", lambda u, c: handle_summary_command(u, c)))
    application.add_handler(CommandHandler("hopdong", lambda u, c: handle_contracts_command(u, c)))
    application.add_handler(CommandHandler("lichsu", lambda u, c: handle_history_command(u, c)))
    
    # Add callback query handler for inline buttons
    application.add_handler(CallbackQueryHandler(handle_callback))
    
    # Add text message handler
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_user_message))
    
    logger.info("Bot handlers registered successfully")
    return application


# Shortcut command handlers (send menu button clicks programmatically)
async def handle_summary_command(update, context):
    """Handle /tonghop command"""
    from services.database import get_user_by_telegram, get_user_summary
    from keyboards.menus import back_to_main
    
    chat_id = str(update.effective_chat.id)
    user = get_user_by_telegram(chat_id)
    
    if not user:
        await update.message.reply_text(
            "❌ Vui lòng xác thực trước: /verify <SĐT>",
            parse_mode="HTML"
        )
        return
    
    summary = get_user_summary(user.id)
    
    def fmt(n): return f"{n:,.0f}".replace(",", ".")
    
    text = f"""
📊 <b>TỔNG HỢP NỢ</b>

💰 Tổng vay: {fmt(summary['tong_vay'])} VNĐ
📊 Gốc còn lại: {fmt(summary['goc_con_lai'])} VNĐ
📋 Tổng HĐ: {summary['tong_hop_dong']}
"""
    await update.message.reply_text(text, reply_markup=back_to_main(), parse_mode="HTML")


async def handle_contracts_command(update, context):
    """Handle /hopdong command"""
    from services.database import get_user_by_telegram, get_user_contracts
    from keyboards.menus import create_contracts_keyboard, back_to_main
    
    chat_id = str(update.effective_chat.id)
    user = get_user_by_telegram(chat_id)
    
    if not user:
        await update.message.reply_text("❌ Vui lòng xác thực trước: /verify <SĐT>")
        return
    
    contracts = get_user_contracts(user.id)
    
    if not contracts:
        await update.message.reply_text("📋 Không có hợp đồng nào.", reply_markup=back_to_main())
        return
    
    await update.message.reply_text(
        f"📋 <b>Danh sách hợp đồng ({len(contracts)})</b>",
        reply_markup=create_contracts_keyboard(contracts),
        parse_mode="HTML"
    )


async def handle_history_command(update, context):
    """Handle /lichsu command"""
    from services.database import get_user_by_telegram, get_payment_history
    from keyboards.menus import back_to_main
    
    chat_id = str(update.effective_chat.id)
    user = get_user_by_telegram(chat_id)
    
    if not user:
        await update.message.reply_text("❌ Vui lòng xác thực trước: /verify <SĐT>")
        return
    
    history = get_payment_history(user.id, limit=10)
    
    if not history:
        await update.message.reply_text("📜 Chưa có lịch sử thanh toán.", reply_markup=back_to_main())
        return
    
    def fmt(n): return f"{n:,.0f}".replace(",", ".")
    
    text = "📜 <b>Lịch sử thanh toán</b>\n\n"
    for h in history:
        text += f"• <code>{h['MaHD']}</code> - {h['Ngay']}: {fmt(h['TienDaTra'])} VNĐ\n"
    
    await update.message.reply_text(text, reply_markup=back_to_main(), parse_mode="HTML")


def main():
    """Run the bot with long polling"""
    logger.info("=" * 50)
    logger.info("🤖 Starting CreditApp Telegram Bot...")
    logger.info("=" * 50)
    
    try:
        app = create_application()
        
        # Run with polling
        app.run_polling(
            poll_interval=1.0,
            timeout=30,
            drop_pending_updates=True,
            allowed_updates=["message", "callback_query"]
        )
    except Exception as e:
        logger.error(f"❌ Bot startup failed: {e}")
        raise


if __name__ == "__main__":
    main()
