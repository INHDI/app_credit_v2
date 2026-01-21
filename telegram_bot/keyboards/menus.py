"""
Inline Keyboard Menu Definitions
Modern, user-friendly menu design for Telegram bot
"""
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from typing import List, Dict, Any


# ============== Main Menu ==============

MAIN_MENU = [
    [InlineKeyboardButton("📊 Tổng hợp nợ", callback_data="summary")],
    [InlineKeyboardButton("📋 Danh sách hợp đồng", callback_data="contracts")],
    [InlineKeyboardButton("📅 Lịch thanh toán", callback_data="schedule")],
    [InlineKeyboardButton("📜 Lịch sử thanh toán", callback_data="history")],
    [InlineKeyboardButton("💳 Thanh toán", callback_data="payment")],
    [InlineKeyboardButton("❓ Trợ giúp", callback_data="help")],
]

MAIN_MENU_KEYBOARD = InlineKeyboardMarkup(MAIN_MENU)


# ============== Navigation Buttons ==============

def back_button(callback_data: str = "main_menu") -> List[List[InlineKeyboardButton]]:
    """Create back button"""
    return [[InlineKeyboardButton("⬅️ Quay lại", callback_data=callback_data)]]


def back_to_main() -> InlineKeyboardMarkup:
    """Back to main menu keyboard"""
    return InlineKeyboardMarkup(back_button("main_menu"))


# ============== Contract Keyboards ==============

def create_contracts_keyboard(contracts: List[Dict[str, Any]]) -> InlineKeyboardMarkup:
    """Create keyboard with contract list for viewing, grouped by type"""
    buttons = []
    
    # Split by type
    tin_chap = [c for c in contracts if c.get("LoaiHD") == "Tín chấp"]
    tra_gop = [c for c in contracts if c.get("LoaiHD") == "Trả góp"]
    
    if tin_chap:
        buttons.append([InlineKeyboardButton("🔹 TÍN CHẤP 🔹", callback_data="noop")])
        for c in tin_chap:
            amount = f"{c.get('SoTienVay', 0):,.0f}".replace(",", ".")
            buttons.append([
                InlineKeyboardButton(
                    f"📄 {c['MaHD']}  •  {amount} ₫",
                    callback_data=f"view_{c['MaHD']}"
                )
            ])
            
    if tra_gop:
        buttons.append([InlineKeyboardButton("🔹 TRẢ GÓP 🔹", callback_data="noop")])
        for c in tra_gop:
            amount = f"{c.get('SoTienVay', 0):,.0f}".replace(",", ".")
            buttons.append([
                InlineKeyboardButton(
                    f"📝 {c['MaHD']}  •  {amount} ₫",
                    callback_data=f"view_{c['MaHD']}"
                )
            ])
    
    buttons.extend(back_button())
    return InlineKeyboardMarkup(buttons)


def create_payment_contracts_keyboard(contracts: List[Dict[str, Any]]) -> InlineKeyboardMarkup:
    """Create keyboard with contract list for payment selection, grouped by type"""
    buttons = []
    
    # Split by type and filter paid ones
    tin_chap = [c for c in contracts if c.get("LoaiHD") == "Tín chấp" and c.get("GocConLai", 0) > 0]
    tra_gop = [c for c in contracts if c.get("LoaiHD") == "Trả góp" and c.get("GocConLai", 0) > 0]
    
    if tin_chap:
        buttons.append([InlineKeyboardButton("🔹 TÍN CHẤP 🔹", callback_data="noop")])
        for c in tin_chap:
            amount = f"{c.get('GocConLai', 0):,.0f}".replace(",", ".")
            buttons.append([
                InlineKeyboardButton(
                    f"💵 {c['MaHD']}  •  Còn {amount} ₫",
                    callback_data=f"pay_{c['MaHD']}"
                )
            ])
            
    if tra_gop:
        buttons.append([InlineKeyboardButton("🔹 TRẢ GÓP 🔹", callback_data="noop")])
        for c in tra_gop:
            amount = f"{c.get('GocConLai', 0):,.0f}".replace(",", ".")
            buttons.append([
                InlineKeyboardButton(
                    f"💵 {c['MaHD']}  •  Còn {amount} ₫",
                    callback_data=f"pay_{c['MaHD']}"
                )
            ])
    
    if not buttons:
        buttons.append([
            InlineKeyboardButton("✅ Không có khoản nợ nào", callback_data="main_menu")
        ])
    
    buttons.extend(back_button())
    return InlineKeyboardMarkup(buttons)


# ============== Payment Type Keyboards ==============

def create_tinchap_payment_keyboard(ma_hd: str, goc_con_lai: int = 0, lai_suat: int = 0) -> InlineKeyboardMarkup:
    """Create payment type selection keyboard for Tin Chap"""
    lai_formatted = f"{lai_suat:,.0f}".replace(",", ".")
    goc_formatted = f"{goc_con_lai:,.0f}".replace(",", ".")
    
    buttons = [
        [InlineKeyboardButton(f"💵 Thanh toán lãi ({lai_formatted} VNĐ)", callback_data=f"paytype_interest_{ma_hd}")],
        [InlineKeyboardButton("💰 Trả gốc một phần", callback_data=f"paytype_partial_{ma_hd}")],
        [InlineKeyboardButton(f"✅ Trả gốc toàn bộ ({goc_formatted} VNĐ)", callback_data=f"paytype_full_{ma_hd}")],
    ]
    
    buttons.extend(back_button("payment"))
    return InlineKeyboardMarkup(buttons)


def create_tragop_payment_keyboard(ma_hd: str, so_tien_ky: int = 0) -> InlineKeyboardMarkup:
    """Create payment type selection keyboard for Tra Gop"""
    tien_ky_formatted = f"{so_tien_ky:,.0f}".replace(",", ".")
    
    buttons = [
        [InlineKeyboardButton(f"💵 Thanh toán kỳ này ({tien_ky_formatted} VNĐ)", callback_data=f"paytype_installment_{ma_hd}")],
    ]
    
    buttons.extend(back_button("payment"))
    return InlineKeyboardMarkup(buttons)


# Removed create_partial_amount_keyboard as we now use text input


# ============== Schedule Keyboards ==============

def create_schedule_keyboard(payments: List[Dict[str, Any]]) -> InlineKeyboardMarkup:
    """Create keyboard with upcoming payments"""
    buttons = []
    for p in payments[:5]:  # Max 5 items
        amount = f"{p.get('SoTien', 0):,.0f}".replace(",", ".")
        status_icon = "🔴" if "Quá hạn" in p.get("TrangThai", "") else "🟡" if "Đến hạn" in p.get("TrangThai", "") else "🟢"
        buttons.append([
            InlineKeyboardButton(
                f"{status_icon} {p['MaHD']} - {p['Ngay']} - {amount} VNĐ",
                callback_data=f"schedpay_{p['MaHD']}_{p['SoTien']}"
            )
        ])
    
    buttons.extend(back_button())
    return InlineKeyboardMarkup(buttons)


# ============== Confirmation Keyboards ==============

def create_confirm_keyboard(action: str, data: str) -> InlineKeyboardMarkup:
    """Create confirmation keyboard"""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Xác nhận", callback_data=f"confirm_{action}_{data}"),
            InlineKeyboardButton("❌ Hủy", callback_data="main_menu")
        ]
    ])
