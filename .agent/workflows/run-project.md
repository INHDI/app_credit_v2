---
description: Hướng dẫn chạy và khởi động dự án
---

# Run Project - Hướng dẫn chạy dự án

## 📋 Yêu cầu hệ thống

- Docker & Docker Compose
- Node.js 18+ (nếu chạy frontend local)
- Python 3.12+ với uv (nếu chạy backend local)

---

## 🐳 Chạy với Docker (Recommended)

// turbo-all

### 1. Chạy Database

```bash
docker compose -f docker-compose-db.yml up -d
```

### 2. Chạy Backend

```bash
docker compose -f docker-compose-be.yml up -d
```

### 3. Chạy Frontend

```bash
docker compose -f docker-compose-fe.yml up -d
```

### 4. Chạy Scheduler (Optional)

```bash
docker compose -f docker-compose.scheduler.yml up -d
```

### 5. Chạy Telegram Bot (Optional)

```bash
# Set TELEGRAM_BOT_TOKEN trong .env trước
docker compose -f docker-compose.telegram.yml up -d --build
```

### 6. Kiểm tra status

```bash
docker ps
```

### 7. Xem logs

```bash
# Backend logs
docker logs -f app_credit_backend

# Frontend logs
docker logs -f app_credit_frontend

# Database logs
docker logs -f app_credit_db

# Telegram bot logs
docker logs -f app_credit_telegram_bot
```

---

## 💻 Chạy Local (Development)

### Backend

```bash
cd backend

# Cài dependencies với uv
uv sync

# Chạy server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8089
```

### Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

---

## 🔗 URLs

| Service | URL | Mô tả |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Web UI |
| Backend API | http://localhost:8089 | API Server |
| Swagger Docs | http://localhost:8089/docs | API Documentation |
| ReDoc | http://localhost:8089/redoc | API Documentation (alternative) |
| Database | localhost:5436 | PostgreSQL |

---

## 🔑 Default Login

```
Email: admin@example.com
Password: admin123
```

> ⚠️ **Lần đầu đăng nhập cần:**
> 1. Quét QR code bằng Google Authenticator
> 2. Nhập mã OTP 6 số
> 3. Đổi mật khẩu mới

---

## 🛑 Dừng services

```bash
# Dừng tất cả
docker compose -f docker-compose-db.yml down
docker compose -f docker-compose-be.yml down
docker compose -f docker-compose-fe.yml down

# Hoặc dừng từng service
docker stop app_credit_backend
docker stop app_credit_frontend
docker stop app_credit_db
```

---

## 🔄 Rebuild

```bash
# Rebuild backend
docker compose -f docker-compose-be.yml up --build -d

# Rebuild frontend
docker compose -f docker-compose-fe.yml up --build -d
```

---

## 🐛 Troubleshooting

### Port đã được sử dụng

```bash
# Kiểm tra port
lsof -i :8089
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database connection error

```bash
# Kiểm tra database đang chạy
docker ps | grep app_credit_db

# Restart database
docker restart app_credit_db
```

### Reset database

```bash
# Xóa volume
docker compose -f docker-compose-db.yml down -v

# Khởi động lại
docker compose -f docker-compose-db.yml up -d
```
