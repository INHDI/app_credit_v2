// Auth API Service
import { API_CONFIG, API_HEADERS, createApiUrl } from '@/config/config';

// Types
export interface User {
    id: number;
    email: string;
    ho_ten: string;
    so_dien_thoai: string;
    role: 'admin' | 'collector' | 'debtor';
    is_active: boolean;
    created_at: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    ho_ten: string;
    so_dien_thoai: string;
    role?: 'admin' | 'collector' | 'debtor';
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

export interface UserWithToken {
    user: User;
    token: TokenResponse;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T;
    message?: string | null;
    error?: string | null;
}

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Helper functions for cookie management
const setCookie = (name: string, value: string, days: number) => {
    if (typeof document === 'undefined') return;
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
};

const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

const removeCookie = (name: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = name + '=; Max-Age=-99999999; path=/;';
};

// Helper functions for token management
export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    // Try localStorage first, then cookie
    return localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);
};

export const setToken = (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    setCookie(TOKEN_KEY, token, 7); // Save cookie for 7 days
};

export const removeToken = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    removeCookie(TOKEN_KEY);
};

export const getStoredUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
};

export const setStoredUser = (user: User): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Get authorization headers
export const getAuthHeaders = (): Record<string, string> => {
    // Always conform to what's in local storage to avoid race conditions
    let token = getToken();

    // Fallback: try to get from cookie if localStorage fails (not implemented yet but good for future)
    // if (!token) ...

    if (!token) {
        console.warn('No auth token found in storage');
        return {};
    }
    return { Authorization: `Bearer ${token}` };
};

// Auth API Service
export class AuthApi {
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
            throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    // Login
    static async login(credentials: LoginRequest): Promise<UserWithToken> {
        const response = await this.request<ApiResponse<UserWithToken>>(
            API_CONFIG.ENDPOINTS.AUTH_LOGIN,
            {
                method: 'POST',
                body: JSON.stringify(credentials),
            }
        );

        if (response.success && response.data) {
            // Backend returns {user, token: {access_token, token_type}}
            const { user, token } = response.data;
            setToken(token.access_token);
            setStoredUser(user);
            return response.data;
        }

        throw new Error(response.message || 'Login failed');
    }

    // Register
    static async register(data: RegisterRequest): Promise<User> {
        const response = await this.request<ApiResponse<User>>(
            API_CONFIG.ENDPOINTS.AUTH_REGISTER,
            {
                method: 'POST',
                body: JSON.stringify(data),
            }
        );

        if (response.success && response.data) {
            return response.data;
        }

        throw new Error(response.message || 'Registration failed');
    }

    // Logout
    static async logout(): Promise<void> {
        try {
            await this.request<ApiResponse<unknown>>(
                API_CONFIG.ENDPOINTS.AUTH_LOGOUT,
                { method: 'POST' }
            );
        } finally {
            removeToken();
        }
    }

    // Get current user
    static async getCurrentUser(): Promise<User> {
        const response = await this.request<ApiResponse<User>>(
            API_CONFIG.ENDPOINTS.AUTH_ME
        );

        if (response.success && response.data) {
            setStoredUser(response.data);
            return response.data;
        }

        throw new Error(response.message || 'Failed to get user info');
    }

    // Get all users (Admin only)
    static async getUsers(role?: string, skip?: number, limit?: number): Promise<User[]> {
        const params: Record<string, string> = {};
        if (role) params.role = role;
        if (skip !== undefined) params.skip = String(skip);
        if (limit !== undefined) params.limit = String(limit);

        const response = await this.request<ApiResponse<User[]>>(
            API_CONFIG.ENDPOINTS.AUTH_USERS,
            {},
            params
        );

        if (response.success && response.data) {
            return response.data;
        }

        throw new Error(response.message || 'Failed to get users');
    }

    // Get debtors (for contract creation)
    static async getDebtors(): Promise<User[]> {
        const response = await this.request<ApiResponse<User[]>>(
            API_CONFIG.ENDPOINTS.AUTH_DEBTORS
        );

        if (response.success && response.data) {
            return response.data;
        }

        throw new Error(response.message || 'Failed to get debtors');
    }

    // Update user (Admin only)
    static async updateUser(id: number, data: Partial<User>): Promise<User> {
        const response = await this.request<ApiResponse<User>>(
            `${API_CONFIG.ENDPOINTS.AUTH_USERS}/${id}`,
            {
                method: 'PUT',
                body: JSON.stringify(data),
            }
        );

        if (response.success && response.data) {
            return response.data;
        }

        throw new Error(response.message || 'Failed to update user');
    }

    // Delete user (Admin only)
    static async deleteUser(id: number): Promise<void> {
        await this.request<ApiResponse<unknown>>(
            `${API_CONFIG.ENDPOINTS.AUTH_USERS}/${id}`,
            {
                method: 'DELETE',
            }
        );
    }

    // Check if user is authenticated
    static isAuthenticated(): boolean {
        return !!getToken();
    }
}

export default AuthApi;
