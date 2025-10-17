# Scheduler dịch vụ thanh toán tự động

Container `scheduler` chạy cron (múi giờ Asia/Ho_Chi_Minh) và gọi hai API mỗi ngày để tự động tạo/cộng dồn lịch thanh toán:

- `POST /api/v1/tra-gop/auto-create-daily-all`
- `POST /api/v1/tra-lai-tin-chap/auto-create-daily-all`

## 1. Biến môi trường (`scheduler/.env`)

```env
# Endpoint nội bộ tới backend
TRA_GOP_API_URL=http://10.15.7.22:8000/api/v1/tra-gop/auto-create-daily-all
TRA_LAI_TIN_CHAP_API_URL=http://10.15.7.22:8000/api/v1/tra-lai-tin-chap/auto-create-daily-all

# "true" hoặc "false". Nếu true, container sẽ chạy job ngay khi khởi động
RUN_ON_STARTUP=true
```

> Lưu ý: Cập nhật host/port tùy môi trường triển khai. Nếu backend và scheduler chạy cùng docker network thay vì host mode, hãy dùng tên service (ví dụ `http://backend:8000/...`).

## 2. Khởi chạy

```bash
# build và chạy scheduler riêng
docker compose -f docker-compose.scheduler.yml up --build -d
```

Cron được cấu hình chạy lúc 00:00 hằng ngày (theo giờ Việt Nam). Bạn có thể đổi lịch bằng cách chỉnh dòng cron trong `scheduler/Dockerfile`.

## 3. Log và giám sát

- File log trong container: `/var/log/daily_payments.log`
- Khi chạy qua docker-compose, log cũng hiển thị qua stdout: `docker logs -f app_credit_scheduler`

Mỗi lần job chạy sẽ log:

1. Thời gian hiện tại (Asia/Ho_Chi_Minh)
2. URL API được gọi
3. HTTP status & body trả về
4. Tổng kết `SUCCESS` hoặc `ERROR`

## 4. Chạy thủ công

Bên trong container, có thể chạy script trực tiếp:

```bash
docker exec -it app_credit_scheduler /app/run_daily_payments.sh
```
Điều này hữu ích khi muốn thử nghiệm sau khi chỉnh sửa logic.

## 5. Thay đổi logic

- Logic cộng dồn và tạo bản ghi nằm trong `backend/app/crud/tra_gop.py` và `backend/app/crud/tra_lai_tin_chap.py`.
- Scheduler chỉ gọi API, nên mọi thay đổi nghiệp vụ thực hiện ở backend, không cần rebuild scheduler trừ khi đổi script hoặc Dockerfile.

