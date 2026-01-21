---
description: Hướng dẫn thêm trang mới vào Frontend
---

# Add Page - Hướng dẫn thêm trang Frontend

## 📋 Tổng quan

Frontend sử dụng **Next.js App Router**. Để thêm trang mới:

1. Tạo thư mục trong `src/app/`
2. Tạo file `page.tsx`
3. Tạo API service (nếu cần)
4. Thêm vào navigation menu

---

## 📂 Bước 1: Tạo Page

**Cấu trúc file**: `frontend/src/app/<tên-route>/page.tsx`

### Trang đơn giản

```tsx
// frontend/src/app/example/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';

export default function ExamplePage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [data, setData] = useState([]);

    useEffect(() => {
        // Redirect nếu chưa đăng nhập
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Example Page</h1>
            <div className="bg-white rounded-lg shadow p-6">
                {/* Nội dung trang */}
            </div>
        </div>
    );
}
```

### Trang với Layout

```tsx
// frontend/src/app/example/layout.tsx
import MainLayout from '@/components/layout/MainLayout';

export default function ExampleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
```

---

## 🔧 Bước 2: Tạo API Service (nếu cần)

**File**: `frontend/src/services/exampleApi.ts`

```typescript
import { API_CONFIG, API_HEADERS, createApiUrl } from '@/config/config';
import { getAuthHeaders } from './authApi';

export interface ExampleItem {
    id: number;
    name: string;
    amount: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
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

        if (response.status === 401) {
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    static async getAll(): Promise<ExampleItem[]> {
        const response = await this.request<ApiResponse<ExampleItem[]>>('/example');
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed');
    }

    static async create(data: Partial<ExampleItem>): Promise<ExampleItem> {
        const response = await this.request<ApiResponse<ExampleItem>>('/example', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (response.success) return response.data;
        throw new Error(response.message || 'Failed');
    }
}
```

---

## 📦 Bước 3: Tạo Components (nếu cần)

### Component Card

```tsx
// frontend/src/components/ui/ExampleCard.tsx
'use client';

interface ExampleCardProps {
    title: string;
    value: number;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function ExampleCard({ title, value, onEdit, onDelete }: ExampleCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
                {value.toLocaleString()} VNĐ
            </p>
            <div className="flex gap-2 mt-4">
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Sửa
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                        Xóa
                    </button>
                )}
            </div>
        </div>
    );
}
```

### Component Table

```tsx
// frontend/src/components/ui/ExampleTable.tsx
'use client';

interface Column<T> {
    key: keyof T;
    label: string;
    render?: (value: T[keyof T], item: T) => React.ReactNode;
}

interface ExampleTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
}

export function ExampleTable<T>({ data, columns, onRowClick }: ExampleTableProps<T>) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                    <tr>
                        {columns.map((col) => (
                            <th key={String(col.key)} className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr
                            key={index}
                            onClick={() => onRowClick?.(item)}
                            className="border-t hover:bg-gray-50 cursor-pointer"
                        >
                            {columns.map((col) => (
                                <td key={String(col.key)} className="px-6 py-4 text-sm text-gray-600">
                                    {col.render ? col.render(item[col.key], item) : String(item[col.key])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

---

## 🧭 Bước 4: Thêm vào Navigation

**File**: `frontend/src/components/layout/Sidebar.tsx` (hoặc navigation tương ứng)

```tsx
const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { label: 'Tín chấp', href: '/tinchap', icon: FileIcon },
    { label: 'Trả góp', href: '/tragop', icon: FileIcon },
    // Thêm menu mới
    { label: 'Example', href: '/example', icon: ExampleIcon },
];
```

---

## 🎨 Pattern phổ biến

### Loading State

```tsx
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
    const fetchData = async () => {
        try {
            setIsLoading(true);
            const data = await ExampleApi.getAll();
            setData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
}, []);

if (isLoading) {
    return <LoadingSpinner />;
}
```

### Error Handling

```tsx
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
    try {
        setError(null);
        await ExampleApi.create(formData);
        // Success
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
};

{error && (
    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
        {error}
    </div>
)}
```

### Form với Validation

```tsx
const [formData, setFormData] = useState({ name: '', amount: 0 });
const [errors, setErrors] = useState<Record<string, string>>({});

const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Tên không được để trống';
    if (formData.amount <= 0) newErrors.amount = 'Số tiền phải > 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
};

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // Submit
};
```

---

## ✅ Checklist hoàn thành

- [ ] Tạo folder và file `page.tsx`
- [ ] Thêm layout (nếu cần)
- [ ] Tạo API service
- [ ] Tạo components
- [ ] Thêm vào navigation menu
- [ ] Test responsive
- [ ] Test authentication
- [ ] Handle loading/error states

---

## 📚 Xem thêm

- [add-api.md](add-api.md) - Thêm API backend
- [coding-guidelines.md](coding-guidelines.md) - Quy chuẩn code
