# Scheduler - Tạo Lịch Sử Trả Lãi Tự Động

Container `scheduler` chạy cron (múi giờ Asia/Ho_Chi_Minh) và gọi API mỗi ngày để tự động tạo lịch sử trả lãi:

- `POST /lich-su-tra-lai/auto-create-lich-su`

## 1. Biến môi trường (`scheduler/.env`)

```env
# Endpoint API để tạo lịch sử trả lãi tự động
URL_API_BACKEND=http://10.15.242.51:8000/lich-su-tra-lai/auto-create-lich-su

# "true" hoặc "false". Nếu true, container sẽ chạy job ngay khi khởi động
RUN_ON_STARTUP=true

# Timeout (giây) chờ backend sẵn sàng trước khi chạy job ban đầu
WAIT_FOR_BACKEND_TIMEOUT=30
```

## 2. Cấu trúc Code Python

### `entrypoint.py`
- **Chức năng chính**: Điểm vào của container, quản lý vòng đời
- **Logic**:
  1. Khởi tạo log file (`/var/log/daily_payments.log`)
  2. Lưu environment variables vào `.container_env` cho cron sử dụng
  3. Nếu `RUN_ON_STARTUP=true`: chạy job ngay lập tức
  4. Chờ backend sẵn sàng (timeout 30s) trước khi chạy
  5. Khởi động cron daemon
  6. Tail log file hiển thị realtime

### `run_daily_payments.py`
- **Chức năng chính**: Gọi API và log kết quả
- **Logic**:
  1. Load environment variables từ `.container_env`
  2. Lấy URL API từ `URL_API_BACKEND`
  3. Gọi API POST với retry logic (5 lần, delay 2s)
  4. Log response status, body, kết quả (SUCCESS/ERROR)
  5. Return exit code 0 (success) hoặc 1 (error)

## 3. Cron Schedule

Chạy tự động lúc **05:00 AM mỗi ngày** (múi giờ Asia/Ho_Chi_Minh):

```
0 5 * * * /usr/local/bin/python3 /app/run_daily_payments.py
```

Chỉnh sửa trong `entrypoint.py` nếu muốn đổi lịch:

```python
crontab_entry = "0 5 * * * ... /app/run_daily_payments.py"
#                   ^ ^ ^ ^ ^
#                   | | | | +- Thứ (0-6, 0=Sunday)
#                   | | | +--- Tháng (1-12)
#                   | | +-----  Ngày (1-31)
#                   | +------- Giờ (0-23)
#                   +--------- Phút (0-59)
```

## 4. Khởi chạy

```bash
# Build và chạy scheduler
docker compose -f docker-compose.scheduler.yml up --build -d

# Xem log realtime
docker logs -f app_credit_scheduler

# Chạy job thủ công
docker exec -it app_credit_scheduler python3 /app/run_daily_payments.py
```

## 5. Log và Giám Sát

- **Log file**: `/var/log/daily_payments.log` trong container
- **Format log**: `2025-11-14 15:30:45 +07 - INFO - Message`
- **Khi chạy qua docker-compose**: Log tự động hiển thị trên stdout

Mỗi lần job chạy log sẽ ghi:
1. Thời gian hiện tại (Asia/Ho_Chi_Minh)
2. URL API được gọi
3. HTTP status code & response body
4. Kết quả cuối cùng: SUCCESS hay ERROR

## 6. Quản Lý Dependencies

Dependencies được định nghĩa trong `requirements.txt`:

```
requests==2.31.0    # Gọi HTTP API
pytz==2024.1        # Xử lý timezone
```

Nếu cần thêm library, chỉnh sửa `requirements.txt` và rebuild:

```bash
docker compose -f docker-compose.scheduler.yml up --build -d
```

## 7. Xử Lý Lỗi

- **Connection Error**: Tự động retry 5 lần với delay 2 giây
- **HTTP Error (4xx, 5xx)**: Log error và exit code 1
- **Backend không sẵn sàng**: Chờ timeout 30s, sau đó tiếp tục (log warning)
- **Cron job lỗi**: Vẫn được lưu vào log file, có thể review sau

## 8. So Sánh Shell vs Python

| Tính năng | Shell (.sh) | Python (.py) |
|-----------|-----------|-----------|
| Logging | `echo ... \| tee -a` | `logging` module |
| HTTP Request | `curl` + shell | `requests` library |
| Environment | `source .env` | `os.getenv()` |
| Retry Logic | `curl --retry` | Manual loop + exception handling |
| Timezone | `TZ=Asia/Ho_Chi_Minh date` | `pytz` library |
| Error Handling | `set -e` | Try-except blocks |



