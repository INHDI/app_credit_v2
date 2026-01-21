"""
Menu and callback query handlers
Handles all inline button callbacks
"""
from telegram import Update
from telegram.ext import ContextTypes
import logging
import urllib.parse
from datetime import date

from services.database import (
    get_user_by_telegram, get_user_contracts, get_user_summary,
    get_payment_schedule, get_payment_history, get_contract_detail
)
from keyboards.menus import (
    MAIN_MENU_KEYBOARD, back_to_main,
    create_contracts_keyboard, create_payment_contracts_keyboard,
    create_tinchap_payment_keyboard, create_tragop_payment_keyboard,
    create_schedule_keyboard
)

logger = logging.getLogger(__name__)


def format_money(amount: int) -> str:
    """Format amount with thousand separator"""
    return f"{amount:,.0f}".replace(",", ".")


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Main callback handler - routes to specific handlers based on callback_data
    """
    query = update.callback_query
    await query.answer()  # Acknowledge the callback
    
    chat_id = str(query.from_user.id)
    data = query.data
    
    # Check if user is verified
    user = get_user_by_telegram(chat_id)
    if not user:
        await query.edit_message_text(
            "❌ Vui lòng xác thực tài khoản trước.\n\n"
            "Gửi: <code>/verify SốĐiệnThoại</code>",
            parse_mode="HTML"
        )
        return
    
    # Route to handlers
    if data == "main_menu":
        await show_main_menu(query, user)
    elif data == "summary":
        await show_summary(query, user)
    elif data == "contracts":
        await show_contracts(query, user)
    elif data == "schedule":
        await show_schedule(query, user)
    elif data == "history":
        await show_history(query, user)
    elif data == "payment":
        await show_payment_contracts(query, user)
    elif data == "help":
        await show_help(query)
    elif data.startswith("view_"):
        ma_hd = data.replace("view_", "")
        await show_contract_detail(query, user, ma_hd)
    elif data.startswith("pay_"):
        ma_hd = data.replace("pay_", "")
        await show_payment_options(query, user, ma_hd)
    elif data.startswith("paytype_"):
        await handle_payment_type(query, user, data, context)
    elif data.startswith("confirm_pay_"):
        await handle_payment_confirmation(query, user, data)
    elif data.startswith("payamt_"):
        # Deprecated but kept for safety
        pass
    elif data.startswith("schedpay_"):
        # Deprecated schedule payment button
        pass
    else:
        logger.warning(f"Unknown callback data: {data}")
        await show_main_menu(query, user)


async def show_main_menu(query, user):
    """Show main menu"""
    await query.edit_message_text(
        f"📱 <b>Menu chính</b>\n\nXin chào <b>{user.ho_ten}</b>!",
        reply_markup=MAIN_MENU_KEYBOARD,
        parse_mode="HTML"
    )


async def show_summary(query, user):
    """Show debt summary"""
    summary = get_user_summary(user.id)
    
    text = f"""
📊 <b>TỔNG HỢP NỢ</b>

━━━━━━━━━━━━━━━━━━━━━━━

💰 <b>Tổng tiền vay:</b> {format_money(summary['tong_vay'])} VNĐ
💵 <b>Lãi suất/kỳ:</b> {format_money(summary['tong_lai'])} VNĐ
📊 <b>Gốc còn lại:</b> {format_money(summary['goc_con_lai'])} VNĐ

━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>Số hợp đồng:</b>
   • Tín chấp: {summary['so_hd_tin_chap']}
   • Trả góp: {summary['so_hd_tra_gop']}
   • <b>Tổng: {summary['tong_hop_dong']}</b>
"""
    await query.edit_message_text(
        text,
        reply_markup=back_to_main(),
        parse_mode="HTML"
    )


async def show_contracts(query, user):
    """Show contract list"""
    contracts = get_user_contracts(user.id)
    
    if not contracts:
        await query.edit_message_text(
            "📋 <b>Danh sách hợp đồng</b>\n\n"
            "Bạn chưa có hợp đồng nào.",
            reply_markup=back_to_main(),
            parse_mode="HTML"
        )
        return
    
    text = f"📋 <b>Danh sách hợp đồng</b>\n\nBạn có {len(contracts)} hợp đồng. Chọn để xem chi tiết:"
    
    await query.edit_message_text(
        text,
        reply_markup=create_contracts_keyboard(contracts),
        parse_mode="HTML"
    )


async def show_contract_detail(query, user, ma_hd: str):
    """Show contract detail"""
    contract = get_contract_detail(ma_hd)
    
    if not contract or contract.get("user_id") != user.id:
        await query.edit_message_text(
            "❌ Không tìm thấy hợp đồng hoặc bạn không có quyền xem.",
            reply_markup=back_to_main(),
            parse_mode="HTML"
        )
        return
    
    text = f"""
📋 <b>CHI TIẾT HỢP ĐỒNG</b>

━━━━━━━━━━━━━━━━━━━━━━━

📝 <b>Mã HĐ:</b> <code>{contract['MaHD']}</code>
📂 <b>Loại:</b> {contract['LoaiHD']}
👤 <b>Họ tên:</b> {contract['HoTen']}
📅 <b>Ngày vay:</b> {contract['NgayVay']}

━━━━━━━━━━━━━━━━━━━━━━━

💰 <b>Số tiền vay:</b> {format_money(contract['SoTienVay'])} VNĐ
💵 <b>Lãi suất/kỳ:</b> {format_money(contract['LaiSuat'])} VNĐ
⏱️ <b>Kỳ đóng:</b> {contract['KyDong']} ngày
📊 <b>Gốc còn lại:</b> {format_money(contract['GocConLai'])} VNĐ

━━━━━━━━━━━━━━━━━━━━━━━

📌 <b>Trạng thái:</b> {contract['TrangThai']}
"""
    
    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("💳 Thanh toán", callback_data=f"pay_{ma_hd}")],
        [InlineKeyboardButton("⬅️ Quay lại", callback_data="contracts")]
    ])
    
    await query.edit_message_text(
        text,
        reply_markup=keyboard,
        parse_mode="HTML"
    )


async def show_schedule(query, user):
    """Show payment schedule"""
    payments = get_payment_schedule(user.id, limit=10)
    
    if not payments:
        await query.edit_message_text(
            "📅 <b>Lịch thanh toán</b>\n\n"
            "Không có khoản thanh toán nào sắp tới.",
            reply_markup=back_to_main(),
            parse_mode="HTML"
        )
        return
    
    today = date.today()
    text = f"📅 <b>LỊCH THANH TOÁN SẮP TỚI</b>\n<i>Cập nhật: {today.strftime('%d/%m/%Y')}</i>\n\n"
    
    # Split by type
    tin_chap = [p for p in payments if p['MaHD'].startswith("TC")]
    tra_gop = [p for p in payments if p['MaHD'].startswith("TG") or not p['MaHD'].startswith("TC")]
    
    if tin_chap:
        text += "<b>🔹 TÍN CHẤP</b>\n"
        for p in tin_chap:
            amount = format_money(p['SoTien'])
            date_str = p['Ngay']
            try:
                d = date.fromisoformat(str(p['Ngay']))
                date_str = d.strftime("%d/%m")
            except:
                pass
            text += f"• <code>{p['MaHD']}</code> ({date_str}): <b>{amount} ₫</b>\n"
        text += "\n"
        
    if tra_gop:
        text += "<b>🔹 TRẢ GÓP</b>\n"
        for p in tra_gop:
            amount = format_money(p['SoTien'])
            date_str = p['Ngay']
            try:
                d = date.fromisoformat(str(p['Ngay']))
                date_str = d.strftime("%d/%m")
            except:
                pass
            text += f"• <code>{p['MaHD']}</code> ({date_str}): <b>{amount} ₫</b>\n"
    
    text += "\n<i>* Danh sách chỉ mang tính chất tham khảo.</i>"
    
    await query.edit_message_text(
        text,
        reply_markup=back_to_main(),
        parse_mode="HTML"
    )


async def show_history(query, user):
    """Show payment history"""
    history = get_payment_history(user.id, limit=10)
    
    if not history:
        await query.edit_message_text(
            "📜 <b>Lịch sử thanh toán</b>\n\n"
            "Chưa có lịch sử thanh toán.",
            reply_markup=back_to_main(),
            parse_mode="HTML"
        )
        return
    
    text = "📜 <b>Lịch sử thanh toán</b>\n\n"
    for h in history:
        text += f"• <code>{h['MaHD']}</code> - {h['Ngay']}: {format_money(h['TienDaTra'])} VNĐ\n"
    
    await query.edit_message_text(
        text,
        reply_markup=back_to_main(),
        parse_mode="HTML"
    )


async def show_payment_contracts(query, user):
    """Show contracts available for payment"""
    contracts = get_user_contracts(user.id)
    
    if not contracts:
        await query.edit_message_text(
            "💳 <b>Thanh toán</b>\n\n"
            "Không có hợp đồng nào để thanh toán.",
            reply_markup=back_to_main(),
            parse_mode="HTML"
        )
        return
    
    text = "💳 <b>Chọn hợp đồng để thanh toán:</b>\n"
    
    await query.edit_message_text(
        text,
        reply_markup=create_payment_contracts_keyboard(contracts),
        parse_mode="HTML"
    )


async def show_payment_options(query, user, ma_hd: str):
    """Show payment type options for a contract"""
    contract = get_contract_detail(ma_hd)
    
    if not contract or contract.get("user_id") != user.id:
        await query.edit_message_text(
            "❌ Không tìm thấy hợp đồng.",
            reply_markup=back_to_main(),
            parse_mode="HTML"
        )
        return
    
    # Differentiate between Tin Chap and Tra Gop
    if contract['LoaiHD'] == "Tín chấp":
        text = f"""
💳 <b>THANH TOÁN TÍN CHẤP</b>

📝 Hợp đồng: <code>{ma_hd}</code>
💰 Gốc còn lại: {format_money(contract['GocConLai'])} VNĐ
💵 Lãi: {format_money(contract['LaiSuat'])} VNĐ/kỳ

━━━━━━━━━━━━━━━━━━━━━━━

Chọn loại thanh toán:
"""
        keyboard = create_tinchap_payment_keyboard(
            ma_hd, 
            contract['GocConLai'], 
            contract['LaiSuat']
        )
    else: # Trả góp
        # Assume Tra Gop pays installment amount
        # For simplicity, we assume installment amount = LaiSuat (needs verification if database stores it differently)
        # Based on database.py: LaiSuat seems to be the fixed payment amount or actual interest? 
        # In TinChap: LaiSuat is interest only. 
        # In TraGop: usually fixed payment. Let's use LaiSuat field for now as per current DB mapping.
        amount = contract['LaiSuat'] 
        
        text = f"""
💳 <b>THANH TOÁN TRẢ GÓP</b>

📝 Hợp đồng: <code>{ma_hd}</code>
💰 Gốc còn lại: {format_money(contract['GocConLai'])} VNĐ
💵 Số tiền đóng kỳ: {format_money(amount)} VNĐ

━━━━━━━━━━━━━━━━━━━━━━━

Chọn loại thanh toán:
"""
        keyboard = create_tragop_payment_keyboard(ma_hd, amount)
    
    await query.edit_message_text(
        text,
        reply_markup=keyboard,
        parse_mode="HTML"
    )

async def handle_payment_type(query, user, data: str, context: ContextTypes.DEFAULT_TYPE):
    """Handle payment type selection"""
    # data format: paytype_{type}_{ma_hd}
    parts = data.split("_")
    if len(parts) < 3:
        return
    
    payment_type = parts[1]
    ma_hd = "_".join(parts[2:])
    
    contract = get_contract_detail(ma_hd)
    if not contract or contract.get("user_id") != user.id:
        await query.edit_message_text(
            "❌ Không tìm thấy hợp đồng.",
            reply_markup=back_to_main(),
            parse_mode="HTML"
        )
        return
    
    if payment_type == "partial":
        # Only for Tin Chap
        if contract['LoaiHD'] != "Tín chấp":
             await query.answer("❌ Trả góp không hỗ trợ trả gốc một phần!", show_alert=True)
             return

        # Ask for input
        context.user_data['payment_state'] = 'WAITING_PARTIAL_AMOUNT'
        context.user_data['payment_ma_hd'] = ma_hd
        
        await query.edit_message_text(
            f"💰 <b>Trả gốc một phần - {ma_hd}</b>\n\n"
            f"Gốc còn lại: {format_money(contract['GocConLai'])} VNĐ\n\n"
            f"👇 <b>Vui lòng nhập số tiền muốn trả:</b>\n"
            f"(Ví dụ: 500000 hoặc 1.000.000)",
            reply_markup=back_to_main(),
            parse_mode="HTML"
        )
    elif payment_type == "installment":
        # Tra Gop installment
        amount = contract['LaiSuat'] # Using LaiSuat as installment amount as per previous logic
        content = f"THANH TOAN KY TRA GOP HD {ma_hd}"
        await send_qr_code(query, ma_hd, amount, content, "installment")
    else:
        # Generate QR directly
        if payment_type == "interest":
            amount = contract['LaiSuat']
            content = f"THANH TOAN LAI HD {ma_hd}"
        else:  # full
            amount = contract['GocConLai']
            content = f"THANH TOAN TOAN BO GOC HD {ma_hd}"
        
        await send_qr_code(query, ma_hd, amount, content, payment_type)


async def send_qr_code(query, ma_hd: str, amount: int, content: str, payment_type: str):
    """Generate and send VietQR payment QR code"""
    # VietQR settings
    bank_id = "970422"  # MBBank
    account_no = "0000000000"
    account_name = "CREDIT SYSTEM"
    template = "compact"
    
    encoded_content = urllib.parse.quote(content)
    encoded_name = urllib.parse.quote(account_name)
    
    qr_url = f"https://img.vietqr.io/image/{bank_id}-{account_no}-{template}.png?amount={int(amount)}&addInfo={encoded_content}&accountName={encoded_name}"
    
    type_text = {
        "interest": "Thanh toán lãi",
        "partial": "Trả gốc một phần",
        "full": "Trả gốc toàn bộ",
        "installment": "Thanh toán kỳ"
    }.get(payment_type, "Thanh toán")
    
    text = f"""
💳 <b>MÃ QR THANH TOÁN</b>

━━━━━━━━━━━━━━━━━━━━━━━

📝 <b>Hợp đồng:</b> <code>{ma_hd}</code>
💵 <b>Số tiền:</b> {format_money(amount)} VNĐ
📋 <b>Loại:</b> {type_text}

━━━━━━━━━━━━━━━━━━━━━━━

🔗 <a href="{qr_url}">Nhấn để xem mã QR</a>

👇 <b>SAU KHI CHUYỂN KHOẢN THÀNH CÔNG:</b>
Vui lòng nhấn nút <b>"✅ Đã thanh toán"</b> bên dưới để xác nhận.
"""
    
    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🔗 Mở App NH", url=qr_url)],
        [InlineKeyboardButton("✅ Đã thanh toán", callback_data=f"confirm_pay_{ma_hd}_{amount}_{payment_type}")],
        [InlineKeyboardButton("⬅️ Quay lại", callback_data="payment")]
    ])
    
    # If called from message handler (no query), use send_message
    if hasattr(query, 'edit_message_text'):
        await query.edit_message_text(
            text,
            reply_markup=keyboard,
            parse_mode="HTML",
            disable_web_page_preview=False
        )
    else:
        await query.reply_text(
            text,
            reply_markup=keyboard,
            parse_mode="HTML",
            disable_web_page_preview=False
        )


async def handle_payment_confirmation(query, user, data: str):
    """Handle manual payment confirmation"""
    # data: confirm_pay_{ma_hd}_{amount}_{type}
    parts = data.split("_")
    if len(parts) < 5:
        return
        
    ma_hd = parts[2]
    try:
        amount = int(parts[3])
    except:
        amount = 0
    payment_type = parts[4]
    
    # Use API for confirmation
    from services.api import APIClient
    success = await APIClient.confirm_payment(ma_hd, amount, payment_type)
    
    if success:
        await query.edit_message_text(
            f"✅ <b>THANH TOÁN THÀNH CÔNG!</b>\n\n"
            f"Hợp đồng: {ma_hd}\n"
            f"Số tiền: {format_money(amount)} VNĐ\n\n"
            f"Cảm ơn bạn đã thanh toán đúng hạn.",
            reply_markup=back_to_main(),
            parse_mode="HTML"
        )
    else:
        await query.answer("❌ Có lỗi xảy ra khi cập nhật dữ liệu. Vui lòng thử lại hoặc liên hệ Admin.", show_alert=True)


async def show_help(query):
    """Show help message"""
    help_text = """
📚 <b>HƯỚNG DẪN SỬ DỤNG</b>

<b>━━━━ Các chức năng ━━━━</b>

📊 <b>Tổng hợp nợ</b> - Xem tổng quan các khoản nợ
📋 <b>Danh sách HĐ</b> - Chi tiết từng hợp đồng
📅 <b>Lịch thanh toán</b> - Các khoản sắp đến hạn
📜 <b>Lịch sử</b> - Các lần thanh toán trước
💳 <b>Thanh toán</b> - Tạo mã QR thanh toán

<b>━━━━ Cách thanh toán ━━━━</b>

1️⃣ Chọn "💳 Thanh toán"
2️⃣ Chọn hợp đồng
3️⃣ Chọn loại thanh toán
4️⃣ Nhận mã QR và chuyển khoản

⏰ Bot hoạt động 24/7
"""
    await query.edit_message_text(
        help_text,
        reply_markup=back_to_main(),
        parse_mode="HTML"
    )
