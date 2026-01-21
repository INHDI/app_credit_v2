# API App Credit - Agent Documentation

## 📋 Tổng quan dự án

Đây là hệ thống **Quản lý Tín dụng** (Credit Management System) hỗ trợ quản lý các khoản vay **Tín chấp** và **Trả góp**. Hệ thống bao gồm:

- **Backend**: FastAPI (Python) với SQLAlchemy ORM
- **Frontend**: Next.js 14 với TypeScript và TailwindCSS
- **Database**: PostgreSQL
- **Scheduler**: Container Python để tự động tạo lịch sử trả lãi hàng ngày
- **Telegram Bot**: Bot riêng cho debtor với menu và thanh toán
- **WebSocket**: Real-time updates cho frontend

## 🏗️ Cấu trúc thư mục

```
app_credit_v3/
├── backend/                   # FastAPI Backend
│   ├── app/
│   │   ├── core/             # Config, database, security, dependencies
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── crud/             # Database operations
│   │   ├── routers/          # API endpoints
│   │   ├── services/         # Business logic (notification, OTP, gmail)
│   │   ├── utils/            # Helper functions
│   │   └── websocket/        # WebSocket management
│   └── scripts/              # Database scripts
├── frontend/                  # Next.js Frontend
│   └── src/
│       ├── app/              # Next.js App Router pages
│       ├── components/       # React components
│       ├── services/         # API service clients
│       ├── hooks/            # Custom React hooks
│       ├── providers/        # Context providers
│       └── types/            # TypeScript types
├── scheduler/                 # Cron job container
├── telegram_bot/              # Telegram Bot Service (NEW)
│   ├── handlers/             # Command & callback handlers
│   ├── keyboards/            # Inline menu definitions
│   └── services/             # Database operations
└── docker-compose-*.yml      # Docker configurations
```

## 👥 Các vai trò trong hệ thống

| Role | Mô tả | Quyền hạn |
|------|-------|-----------|
| **admin** | Quản trị viên | Toàn quyền: CRUD hợp đồng, quản lý users, settings |
| **collector** | Nhân viên thu nợ | Xem danh sách nợ, nộp lãi, tạo hợp đồng |
| **debtor** | Người nợ | Xem thông tin nợ cá nhân, lịch thanh toán, trả gốc, Telegram bot |

## 🔐 Xác thực 2 lớp (OTP/2FA)

Hệ thống sử dụng **TOTP (Time-based One-Time Password)** cho tất cả users:

1. **Đăng nhập bước 1**: Email + Password
2. **QR Code Setup** (lần đầu): Quét bằng Google Authenticator
3. **Đăng nhập bước 2**: Nhập mã OTP 6 số
4. **Đổi mật khẩu** (lần đầu): Bắt buộc đặt mật khẩu mới

> ⚙️ **Config**: Có thể bật/tắt OTP qua biến môi trường `OTP_ENABLED`
> 🛠️ **Admin**: Có quyền reset OTP và Password cho người dùng

## 🤖 Telegram Bot (Debtor Portal)

Bot Telegram cho phép người nợ:
- Xem tổng hợp nợ, danh sách hợp đồng
- Xem lịch thanh toán, lịch sử
- Thanh toán qua QR code
- Nhận thông báo nhắc nợ tự động

**Commands**: `/start`, `/verify`, `/menu`, `/tonghop`, `/hopdong`, `/lichsu`, `/help`

## 🔗 API Endpoints chính

| Endpoint | Mô tả |
|----------|-------|
| `/auth` | Đăng nhập OTP, đăng ký, quản lý users |
| `/auth/otp/*` | Setup và verify OTP |
| `/tin-chap` | CRUD hợp đồng tín chấp |
| `/tra-gop` | CRUD hợp đồng trả góp |
| `/lich-su-tra-lai` | Lịch sử trả lãi, nộp lãi |
| `/debtor` | Portal cho người nợ xem thông tin |
| `/dashboard` | Thống kê tổng quan |
| `/no-phai-thu` | Danh sách nợ phải thu |
| `/export` | Xuất Excel |
| `/settings` | Cài đặt hệ thống (VIETQR, Telegram) |
| `/ws/{client_id}` | WebSocket connection |

## 📚 Tài liệu workflows

- [add-api.md](workflows/add-api.md) - Hướng dẫn thêm API mới
- [add-page.md](workflows/add-page.md) - Hướng dẫn thêm trang Frontend
- [test-api.md](workflows/test-api.md) - Hướng dẫn test API
- [coding-guidelines.md](workflows/coding-guidelines.md) - Quy chuẩn code
- [authentication.md](workflows/authentication.md) - Chi tiết luồng đăng nhập (OTP)
- [database-structure.md](workflows/database-structure.md) - Cấu trúc database
- [run-project.md](workflows/run-project.md) - Hướng dẫn chạy dự án
- [telegram-bot.md](workflows/telegram-bot.md) - Telegram Bot và API integration

## 🚀 Quick Start

```bash
# Chạy database
docker compose -f docker-compose-db.yml up -d

# Chạy backend
docker compose -f docker-compose-be.yml up -d

# Chạy frontend
docker compose -f docker-compose-fe.yml up -d

# Chạy scheduler
docker compose -f docker-compose.scheduler.yml up -d

# Chạy Telegram Bot (cần set TELEGRAM_BOT_TOKEN)
docker compose -f docker-compose.telegram.yml up -d
```

## 🔑 Thông tin đăng nhập mặc định

- **Email**: admin@example.com
- **Password**: admin123

> ⚠️ Lần đầu đăng nhập cần:
> 1. Quét QR code bằng Google Authenticator
> 2. Nhập mã OTP
> 3. Đổi mật khẩu mới
