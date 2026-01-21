---
description: Hướng dẫn sử dụng và phát triển Telegram Bot cho Debtor
---

# Telegram Bot - Debtor Portal

## 📋 Tổng quan

Bot Telegram cho phép người nợ (debtor) tương tác với hệ thống qua Telegram.

## 🚀 Khởi chạy

```bash
# 1. Cấu hình .env
# Copy nội dung dưới đây vào file .env ở root dự án (hoặc set biến môi trường)

# Token Bot (Lấy từ @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Database Config (Để bot kết nối DB lấy dữ liệu)
POSTGRES_SERVER=10.15.242.51
POSTGRES_PORT=5436
POSTGRES_DB=app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_db_password

# 2. Chạy với Docker
docker compose -f docker-compose.telegram.yml up -d --build

# 3. Xem logs
docker logs -f app_credit_telegram_bot
```

## ❓ Troubleshooting

### Bot không phản hồi
*   Kiểm tra logs: `docker logs app_credit_telegram_bot`
*   Đảm bảo `TELEGRAM_BOT_TOKEN` đúng.
*   Kiểm tra kết nối mạng (bot cần internet để gọi Telegram API).

### Lỗi kết nối Database
*   Đảm bảo các biến `POSTGRES_*` chính xác.
*   Nếu chạy Docker, biến `POSTGRES_SERVER` nên là IP LAN hoặc service name nếu trong cùng network (tuy nhiên bot đang chạy network riêng `bridge` và trỏ vào IP host/LAN nên cần IP cụ thể).
*   Kiểm tra port 5436 có mở không.

---

## 📁 Cấu trúc thư mục

```
telegram_bot/
├── Dockerfile
├── requirements.txt
├── config.py           # Environment config
├── main.py             # Entry point
├── handlers/           # Command handlers
│   ├── start.py        # /start, /verify, /help
│   └── menu.py         # Callback handlers
├── keyboards/          # Inline menus
│   └── menus.py
└── services/           # Database operations
    └── database.py
```

---

## 🤖 Commands

| Command | Mô tả |
|---------|-------|
| `/start` | Welcome message, menu (nếu đã verify) |
| `/verify <sđt>` | Xác thực bằng số điện thoại |
| `/menu` | Hiển thị menu chính |
| `/tonghop` | Tổng hợp nợ |
| `/hopdong` | Danh sách hợp đồng |
| `/lichsu` | Lịch sử thanh toán |
| `/help` | Hướng dẫn sử dụng |

---

## 🖼️ Inline Menu

Menu buttons hiển thị sau khi verify:

- 📊 Tổng hợp nợ
- 📋 Danh sách hợp đồng  
- 📅 Lịch thanh toán
- 📜 Lịch sử thanh toán
- 💳 Thanh toán (→ QR Code)
- ❓ Trợ giúp

---

## 🔐 Xác thực User

1. User gửi `/start`
2. Bot hiện hướng dẫn `/verify <sđt>`
3. User gửi `/verify 0901234567`
4. Bot tìm debtor theo SĐT trong database
5. Nếu tìm thấy → Lưu `telegram_chat_id` vào user
6. **Auto xóa message** chứa SĐT (bảo mật)
7. Hiển thị menu chính

```python
# handlers/start.py
async def verify_command(update, context):
    phone = context.args[0]
    user = get_debtor_by_phone(phone)
    if user:
        link_telegram_to_user(user.id, chat_id)
        await update.message.delete()  # Xóa message
        await send_menu(...)
```

---

## 💳 Thanh toán Flow

1. User nhấn "💳 Thanh toán"
2. Bot hiện danh sách hợp đồng có nợ
3. User chọn hợp đồng
4. Chọn loại thanh toán:
   - Thanh toán lãi
   - Trả gốc một phần
   - Trả gốc toàn bộ
5. Bot tạo VietQR URL và gửi link
6. Bot gọi Backend API để confirm payment

---

## 🔗 Bot API Integration

Bot sử dụng Backend API để xác nhận thanh toán thay vì query DB trực tiếp:

```python
# telegram_bot/services/api.py
class APIClient:
    @classmethod
    async def get_token(cls):
        # Login với bot user: bot@appcredit.com
        response = await client.post(f"{API_BASE_URL}/auth/login", json={...})
        return response.data.token.access_token
    
    @classmethod
    async def confirm_payment(cls, ma_hd, amount, payment_type):
        # Gọi API tương ứng với loại thanh toán
        if payment_type in ["partial", "full"] and ma_hd.startswith("TC"):
            # PUT /tin-chap/tra-goc/{ma_hd}
        else:
            # POST /lich-su-tra-lai/payHD/{ma_hd}
```

### Bot User Credentials

- **Email**: `bot@appcredit.com`
- **Password**: `bot_secure_pass_2024`
- **Role**: `admin` (cần để confirm payment)
- **must_change_password**: `false` (bot không cần đổi MK)

> Bot user được tự động tạo khi Backend startup (`main.py`)

---

## 📬 Thông báo tự động

Bot gửi nhắc nợ riêng cho từng debtor:

```python
# backend/app/services/notification.py
await send_debtor_notification(db, user_id, message)
await notify_all_debtors_due_today(db)
```

---

## 🔧 Thêm Command mới

1. Tạo handler trong `handlers/`:

```python
# handlers/new_handler.py
async def new_command(update, context):
    await update.message.reply_text("Hello!")
```

2. Đăng ký trong `main.py`:

```python
application.add_handler(CommandHandler("new", new_command))
```

3. Thêm callback (nếu có buttons):

```python
# handlers/menu.py
elif data == "new_action":
    await handle_new_action(query, user)
```

---

## 📚 Xem thêm

- [authentication.md](authentication.md) - Luồng xác thực
- [add-api.md](add-api.md) - Thêm API backend
