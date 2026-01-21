---
description: Hướng dẫn test API trong hệ thống
---

# Test API - Hướng dẫn test API

## 🛠️ Các công cụ test

### 1. Swagger UI (Ưu tiên)

- **URL**: `http://localhost:8089/docs` hoặc `http://10.15.242.51:8089/docs`
- **Ưu điểm**: 
  - Tự động sinh form từ schema
  - Hiển thị response schema
  - Hỗ trợ authentication

### 2. ReDoc

- **URL**: `http://localhost:8089/redoc`
- **Ưu điểm**: Documentation đẹp, dễ đọc

### 3. cURL (Command line)

```bash
# GET request
curl -X GET "http://localhost:8089/tin-chap" \
  -H "accept: application/json" \
  -H "Authorization: Bearer <token>"

# POST request  
curl -X POST "http://localhost:8089/tin-chap" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"HoTen": "Nguyen Van A", "SoTienVay": 1000000}'
```

### 4. HTTPie (Thay thế cURL)

```bash
# GET request
http GET localhost:8089/tin-chap "Authorization:Bearer <token>"

# POST request
http POST localhost:8089/tin-chap \
  "Authorization:Bearer <token>" \
  HoTen="Nguyen Van A" SoTienVay:=1000000
```

---

## 🔐 Bước 1: Đăng nhập lấy Token

### Sử dụng Swagger UI

1. Mở `http://localhost:8089/docs`
2. Tìm endpoint `POST /auth/login`
3. Click "Try it out"
4. Nhập body:
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```
5. Click "Execute"
6. Copy `access_token` từ response

### Sử dụng cURL

```bash
# Login và lấy token
curl -X POST "http://localhost:8089/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "ho_ten": "Administrator",
      "role": "admin"
    },
    "token": {
      "access_token": "eyJhbGciOiJIUzI1NiIs...",
      "token_type": "bearer"
    }
  },
  "message": "Đăng nhập thành công"
}
```

### Authorize trong Swagger

1. Click nút "Authorize" 🔒 ở góc trên phải
2. Nhập token: `eyJhbGciOiJIUzI1NiIs...`
3. Click "Authorize"
4. Giờ có thể test tất cả API cần authentication

---

## 📝 Bước 2: Test các endpoint

### Test GET (Lấy danh sách)

```bash
# Lấy danh sách tín chấp
curl -X GET "http://localhost:8089/tin-chap?page=1&page_size=10" \
  -H "Authorization: Bearer <token>"

# Lấy danh sách với filter
curl -X GET "http://localhost:8089/tin-chap?status=Chưa%20thanh%20toán&today_only=true" \
  -H "Authorization: Bearer <token>"
```

### Test POST (Tạo mới)

```bash
# Tạo hợp đồng tín chấp mới
curl -X POST "http://localhost:8089/tin-chap" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "HoTen": "Nguyen Van A",
    "NgayVay": "2025-01-01",
    "SoTienVay": 10000000,
    "KyDong": 7,
    "LaiSuat": 100000
  }'
```

### Test PUT (Cập nhật)

```bash
# Cập nhật hợp đồng
curl -X PUT "http://localhost:8089/tin-chap/TC001" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "HoTen": "Nguyen Van B",
    "LaiSuat": 150000
  }'
```

### Test DELETE (Xóa)

```bash
# Xóa hợp đồng
curl -X DELETE "http://localhost:8089/tin-chap/TC001" \
  -H "Authorization: Bearer <token>"
```

---

## 🧪 Test cases mẫu

### Authentication Tests

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Login thành công | email + password đúng | Status 200, có token |
| Login sai password | email đúng, password sai | Status 401, "Email hoặc mật khẩu không đúng" |
| Login không có token | Không gửi Authorization header | Status 401 |
| Login với token hết hạn | Token expired | Status 401 |

### CRUD Tests

| Test Case | Endpoint | Expected Result |
|-----------|----------|-----------------|
| Tạo hợp đồng valid | POST /tin-chap | Status 201, data hợp đồng |
| Tạo thiếu field required | POST /tin-chap (thiếu HoTen) | Status 422, validation error |
| Lấy hợp đồng tồn tại | GET /tin-chap/TC001 | Status 200, data hợp đồng |
| Lấy hợp đồng không tồn tại | GET /tin-chap/TC999 | Status 404 |
| Cập nhật thành công | PUT /tin-chap/TC001 | Status 200, data đã update |
| Xóa thành công | DELETE /tin-chap/TC001 | Status 200 |

### Authorization Tests

| Test Case | User Role | Endpoint | Expected |
|-----------|-----------|----------|----------|
| Admin xem tất cả | admin | GET /tin-chap | ✅ 200 |
| Collector xem | collector | GET /tin-chap | ✅ 200 |
| Debtor xem tin-chap | debtor | GET /tin-chap | ❌ 403 |
| Debtor xem portal | debtor | GET /debtor/contracts | ✅ 200 |
| Collector tạo | collector | POST /tin-chap | ✅ 201 |
| Collector xóa | collector | DELETE /tin-chap/TC001 | ❌ 403 (admin only) |

---

## 📊 Response Status Codes

| Status Code | Ý nghĩa | Xử lý |
|-------------|---------|-------|
| 200 | Thành công | Hiển thị data |
| 201 | Tạo thành công | Hiển thị item mới |
| 400 | Bad Request | Hiển thị lỗi validation |
| 401 | Unauthorized | Redirect đến login |
| 403 | Forbidden | Hiển thị "Không có quyền" |
| 404 | Not Found | Hiển thị "Không tìm thấy" |
| 422 | Validation Error | Hiển thị chi tiết lỗi |
| 500 | Server Error | Hiển thị lỗi chung |

---

## 🔄 Test WebSocket

```javascript
// Browser console
const ws = new WebSocket('ws://localhost:8089/ws/test-client');

ws.onopen = () => {
  console.log('Connected!');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

ws.onerror = (error) => {
  console.error('Error:', error);
};

// Gửi message
ws.send(JSON.stringify({ type: 'ping' }));
```

---

## 🐛 Debug Tips

### 1. Xem logs backend

```bash
# Docker logs
docker logs -f app_credit_backend

# Hoặc chạy trực tiếp
cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8089
```

### 2. Check database

```bash
# Connect PostgreSQL
docker exec -it app_credit_db psql -U postgres -d app

# Xem tables
\dt

# Query data
SELECT * FROM tin_chap LIMIT 5;
```

### 3. Test với Python

```python
import requests

BASE_URL = "http://localhost:8089"

# Login
response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@example.com",
    "password": "admin123"
})
token = response.json()["data"]["token"]["access_token"]

# Test API
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(f"{BASE_URL}/tin-chap", headers=headers)
print(response.json())
```

---

## ✅ Checklist test API mới

- [ ] Test login và lấy token
- [ ] Test GET list (pagination, filter, search)
- [ ] Test GET by ID (tồn tại và không tồn tại)
- [ ] Test POST (valid data và invalid data)
- [ ] Test PUT (update thành công và không tìm thấy)
- [ ] Test DELETE (xóa thành công và không tìm thấy)
- [ ] Test authorization với từng role
- [ ] Test validation errors (thiếu field, sai format)
- [ ] Test với token hết hạn
- [ ] Test không có token

---

## 📚 Xem thêm

- [add-api.md](add-api.md) - Hướng dẫn thêm API mới
- [authentication.md](authentication.md) - Chi tiết luồng xác thực
