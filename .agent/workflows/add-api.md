---
description: Hướng dẫn thêm API mới vào hệ thống
---

# Add API - Hướng dẫn thêm API mới

## 📋 Tổng quan

Để thêm một API mới vào hệ thống, cần thực hiện 4 bước:

1. **Model** - Định nghĩa database table (nếu cần)
2. **Schema** - Định nghĩa request/response validation
3. **CRUD** - Viết database operations
4. **Router** - Tạo API endpoints

---

## 🗂️ Bước 1: Tạo Model (nếu cần database table mới)

**File**: `backend/app/models/<tên_model>.py`

```python
"""
<TênModel> model - Mô tả
"""
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey
from app.core.database import Base
import datetime


class TenModel(Base):
    """
    Mô tả model
    """
    __tablename__ = "ten_table"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(Date, default=datetime.date.today)
    # Foreign key nếu cần
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
```

**Đăng ký model** trong `backend/app/models/__init__.py`:

```python
from app.models.ten_model import TenModel
```

---

## 📝 Bước 2: Tạo Schema

**File**: `backend/app/schemas/<tên_schema>.py`

```python
"""
<TênSchema> schemas for API request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date


class TenModelCreate(BaseModel):
    """Schema cho request tạo mới"""
    name: str = Field(..., min_length=1, description="Tên")
    amount: int = Field(..., gt=0, description="Số tiền (phải > 0)")
    user_id: Optional[int] = Field(None, description="ID người dùng (optional)")


class TenModelUpdate(BaseModel):
    """Schema cho request cập nhật"""
    name: Optional[str] = None
    amount: Optional[int] = None
    is_active: Optional[bool] = None


class TenModelResponse(BaseModel):
    """Schema cho response"""
    id: int
    name: str
    amount: int
    is_active: bool
    created_at: date
    user_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
```

**Đăng ký schema** trong `backend/app/schemas/__init__.py`:

```python
from app.schemas.ten_model import TenModelCreate, TenModelUpdate, TenModelResponse
```

---

## 💾 Bước 3: Tạo CRUD

**File**: `backend/app/crud/<tên_crud>.py`

```python
"""
CRUD operations for TenModel
"""
from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.ten_model import TenModel
from app.schemas.ten_model import TenModelCreate, TenModelUpdate


def create(db: Session, data: TenModelCreate) -> TenModel:
    """Tạo mới"""
    db_item = TenModel(**data.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def get_by_id(db: Session, id: int) -> Optional[TenModel]:
    """Lấy theo ID"""
    return db.query(TenModel).filter(TenModel.id == id).first()


def get_all(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    is_active: Optional[bool] = None
) -> List[TenModel]:
    """Lấy danh sách với filter"""
    query = db.query(TenModel)
    if is_active is not None:
        query = query.filter(TenModel.is_active == is_active)
    return query.offset(skip).limit(limit).all()


def update(db: Session, id: int, data: TenModelUpdate) -> Optional[TenModel]:
    """Cập nhật"""
    db_item = get_by_id(db, id)
    if not db_item:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item


def delete(db: Session, id: int) -> bool:
    """Xóa"""
    db_item = get_by_id(db, id)
    if not db_item:
        return False
    
    db.delete(db_item)
    db.commit()
    return True
```

**Đăng ký CRUD** trong `backend/app/crud/__init__.py`:

```python
from app.crud import ten_model
```

---

## 🌐 Bước 4: Tạo Router

**File**: `backend/app/routers/<tên_router>.py`

```python
"""
<TênRouter> API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.database import get_db
from app.core.deps import require_admin, require_admin_or_collector, get_current_user
from app.models.user import User
from app.schemas.ten_model import TenModelCreate, TenModelUpdate, TenModelResponse
from app.schemas.response import ApiResponse
from app.crud import ten_model as crud

router = APIRouter(
    prefix="/ten-model",
    tags=["Tên Model"]
)


@router.post("", response_model=ApiResponse[TenModelResponse], status_code=201)
async def create_item(
    data: TenModelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Tạo mới (Admin và Collector)"""
    result = crud.create(db=db, data=data)
    return ApiResponse.success_response(
        data=TenModelResponse.model_validate(result),
        message="Tạo thành công"
    )


@router.get("", response_model=ApiResponse[List[TenModelResponse]])
async def get_all(
    skip: int = 0,
    limit: int = 100,
    is_active: bool = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Lấy danh sách (Admin và Collector)"""
    items = crud.get_all(db=db, skip=skip, limit=limit, is_active=is_active)
    return ApiResponse.success_response(
        data=[TenModelResponse.model_validate(item) for item in items],
        message="Lấy danh sách thành công"
    )


@router.get("/{id}", response_model=ApiResponse[TenModelResponse])
async def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Lấy theo ID"""
    item = crud.get_by_id(db=db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return ApiResponse.success_response(
        data=TenModelResponse.model_validate(item),
        message="Lấy thông tin thành công"
    )


@router.put("/{id}", response_model=ApiResponse[TenModelResponse])
async def update_item(
    id: int,
    data: TenModelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Cập nhật (Admin only)"""
    result = crud.update(db=db, id=id, data=data)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return ApiResponse.success_response(
        data=TenModelResponse.model_validate(result),
        message="Cập nhật thành công"
    )


@router.delete("/{id}", response_model=ApiResponse[Any])
async def delete_item(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Xóa (Admin only)"""
    success = crud.delete(db=db, id=id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return ApiResponse.success_response(
        data={"id": id},
        message="Xóa thành công"
    )
```

---

## 🔗 Bước 5: Đăng ký Router trong Main

**File**: `backend/app/main.py`

```python
from app.routers import ten_model

# Thêm router
app.include_router(ten_model.router)
```

---

## 🎨 Bước 6: Tạo Frontend Service (optional)

**File**: `frontend/src/services/tenModelApi.ts`

```typescript
import { API_CONFIG, API_HEADERS, createApiUrl } from '@/config/config';
import { getAuthHeaders } from './authApi';

export interface TenModel {
    id: number;
    name: string;
    amount: number;
    is_active: boolean;
    created_at: string;
    user_id?: number;
}

export interface TenModelCreate {
    name: string;
    amount: number;
    user_id?: number;
}

export class TenModelApi {
    private static async request<T>(
        endpoint: string,
        options: RequestInit = {},
        params?: Record<string, string>
    ): Promise<T> {
        const url = createApiUrl(endpoint, params);
        
        const response = await fetch(url, {
            headers: {
                ...API_HEADERS.JSON,
                ...getAuthHeaders(),
                ...options.headers,
            },
            ...options,
        });

        if (response.status === 401) {
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    static async getAll(): Promise<TenModel[]> {
        const response = await this.request<ApiResponse<TenModel[]>>('/ten-model');
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to get items');
    }

    static async getById(id: number): Promise<TenModel> {
        const response = await this.request<ApiResponse<TenModel>>(`/ten-model/${id}`);
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to get item');
    }

    static async create(data: TenModelCreate): Promise<TenModel> {
        const response = await this.request<ApiResponse<TenModel>>('/ten-model', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to create');
    }

    static async update(id: number, data: Partial<TenModel>): Promise<TenModel> {
        const response = await this.request<ApiResponse<TenModel>>(`/ten-model/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed to update');
    }

    static async delete(id: number): Promise<void> {
        await this.request<ApiResponse<unknown>>(`/ten-model/${id}`, {
            method: 'DELETE',
        });
    }
}
```

---

## ✅ Checklist hoàn thành

- [ ] Tạo Model trong `backend/app/models/`
- [ ] Đăng ký Model trong `__init__.py`
- [ ] Tạo Schema trong `backend/app/schemas/`
- [ ] Đăng ký Schema trong `__init__.py`
- [ ] Tạo CRUD trong `backend/app/crud/`
- [ ] Đăng ký CRUD trong `__init__.py`
- [ ] Tạo Router trong `backend/app/routers/`
- [ ] Đăng ký Router trong `main.py`
- [ ] Test API qua Swagger UI (`/docs`)
- [ ] Tạo Frontend Service (nếu cần)

---

## 📚 Xem thêm

- [coding-guidelines.md](coding-guidelines.md) - Quy chuẩn code chi tiết
- [test-api.md](test-api.md) - Hướng dẫn test API
- [authentication.md](authentication.md) - Chi tiết luồng xác thực
