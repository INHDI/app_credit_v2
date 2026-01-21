---
description: Quy chuẩn viết code cho dự án API App Credit
---

# Coding Guidelines - Quy chuẩn viết code

## 📦 Backend (Python/FastAPI)

### 1. Cấu trúc file

```
backend/app/
├── core/           # Configuration, database, security
├── models/         # SQLAlchemy models (database tables)
├── schemas/        # Pydantic schemas (request/response validation)
├── crud/           # Database CRUD operations
├── routers/        # API endpoint handlers
├── services/       # Business logic
├── utils/          # Helper functions
└── websocket/      # WebSocket management
```

### 2. Naming conventions

| Thành phần | Convention | Ví dụ |
|------------|-----------|-------|
| Files | snake_case | `tin_chap.py`, `lich_su_tra_lai.py` |
| Classes | PascalCase | `TinChap`, `UserResponse` |
| Functions | snake_case | `get_tin_chap()`, `create_user()` |
| Variables | snake_case | `so_tien_vay`, `ma_hd` |
| Constants | UPPER_SNAKE_CASE | `ACCESS_TOKEN_EXPIRE_MINUTES` |

### 3. Model (SQLAlchemy)

```python
# backend/app/models/example.py
"""
Example model - Mô tả model
"""
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from app.core.database import Base
import datetime


class Example(Base):
    """
    Example model - Mô tả chi tiết
    """
    __tablename__ = "example_table"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    created_at = Column(Date, default=datetime.date.today)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
```

### 4. Schema (Pydantic)

```python
# backend/app/schemas/example.py
"""
Example schemas for API request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date


class ExampleCreate(BaseModel):
    """Schema for creating"""
    name: str = Field(..., min_length=1, description="Tên")
    amount: int = Field(..., gt=0, description="Số tiền")


class ExampleResponse(BaseModel):
    """Schema for response"""
    id: int
    name: str
    amount: int
    created_at: date

    model_config = ConfigDict(from_attributes=True)
```

### 5. CRUD Operations

```python
# backend/app/crud/example.py
"""
CRUD operations for Example model
"""
from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.example import Example
from app.schemas.example import ExampleCreate


def create_example(db: Session, data: ExampleCreate) -> Example:
    """Create a new example"""
    db_item = Example(**data.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def get_example(db: Session, id: int) -> Optional[Example]:
    """Get example by ID"""
    return db.query(Example).filter(Example.id == id).first()


def get_examples(db: Session, skip: int = 0, limit: int = 100) -> List[Example]:
    """Get list of examples"""
    return db.query(Example).offset(skip).limit(limit).all()
```

### 6. Router (API Endpoints)

```python
# backend/app/routers/example.py
"""
Example API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin, require_admin_or_collector
from app.models.user import User
from app.schemas.example import ExampleCreate, ExampleResponse
from app.schemas.response import ApiResponse
from app.crud import example as crud_example

router = APIRouter(
    prefix="/example",
    tags=["Example"]
)


@router.post("", response_model=ApiResponse[ExampleResponse], status_code=201)
async def create(
    data: ExampleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Create a new example (Admin and Collector)"""
    result = crud_example.create_example(db=db, data=data)
    return ApiResponse.success_response(
        data=ExampleResponse.model_validate(result),
        message="Tạo thành công"
    )


@router.get("/{id}", response_model=ApiResponse[ExampleResponse])
async def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_collector)
):
    """Get example by ID"""
    item = crud_example.get_example(db=db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return ApiResponse.success_response(data=ExampleResponse.model_validate(item))
```

### 7. Response Format

Tất cả API responses sử dụng format chuẩn:

```python
# Thành công
{
    "success": true,
    "data": { ... },
    "message": "Thông báo thành công",
    "error": null
}

# Lỗi
{
    "success": false,
    "data": null,
    "message": null,
    "error": "Mô tả lỗi"
}
```

---

## 🎨 Frontend (Next.js/TypeScript)

### 1. Cấu trúc file

```
frontend/src/
├── app/              # Pages (Next.js App Router)
├── components/       # Reusable components
│   ├── ui/          # Base UI components
│   └── layout/      # Layout components
├── services/         # API service clients
├── hooks/            # Custom React hooks
├── providers/        # Context providers
├── types/            # TypeScript types
├── config/           # Configuration
└── utils/            # Helper functions
```

### 2. API Service Pattern

```typescript
// frontend/src/services/exampleApi.ts
import { API_CONFIG, API_HEADERS, createApiUrl } from '@/config/config';
import { getAuthHeaders } from './authApi';

export interface ExampleData {
    id: number;
    name: string;
    amount: number;
}

export class ExampleApi {
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

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    static async getAll(): Promise<ExampleData[]> {
        const response = await this.request<ApiResponse<ExampleData[]>>('/example');
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed');
    }

    static async create(data: Partial<ExampleData>): Promise<ExampleData> {
        const response = await this.request<ApiResponse<ExampleData>>('/example', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed');
    }
}
```

### 3. Component Pattern

```tsx
// frontend/src/components/ui/ExampleCard.tsx
'use client';

import { useState } from 'react';

interface ExampleCardProps {
    title: string;
    amount: number;
    onAction?: () => void;
}

export function ExampleCard({ title, amount, onAction }: ExampleCardProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        setIsLoading(true);
        try {
            onAction?.();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-2xl font-bold text-emerald-600">
                {amount.toLocaleString()} VNĐ
            </p>
            <button
                onClick={handleClick}
                disabled={isLoading}
                className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg"
            >
                {isLoading ? 'Đang xử lý...' : 'Thực hiện'}
            </button>
        </div>
    );
}
```

---

## 🔐 Authentication Dependencies

Sử dụng các dependency sau để phân quyền API:

```python
from app.core.deps import (
    get_current_user,           # Lấy user đang đăng nhập
    require_admin,              # Chỉ admin
    require_collector,          # Chỉ collector
    require_debtor,             # Chỉ debtor
    require_admin_or_collector, # Admin hoặc collector
    require_admin_collector_or_debtor,  # Tất cả roles
)
```

---

## 📝 Docstring Convention

```python
def function_name(param1: str, param2: int) -> ReturnType:
    """
    Mô tả ngắn gọn function làm gì
    
    Args:
        param1: Mô tả param1
        param2: Mô tả param2
        
    Returns:
        Mô tả return value
        
    Raises:
        HTTPException: Khi nào raise exception
    """
    pass
```
