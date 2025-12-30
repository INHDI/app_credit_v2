'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthApi, User, LoginRequest, RegisterRequest, getToken, getStoredUser, removeToken } from '@/services/authApi';

// Auth context state
interface AuthContextState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (credentials: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<User>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

// Default context value
const AuthContext = createContext<AuthContextState | undefined>(undefined);

// Auth Provider props
interface AuthProviderProps {
    children: ReactNode;
}

// Auth Provider component
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is authenticated
    const isAuthenticated = !!user;

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = async () => {
            try {
                const token = getToken();
                if (token) {
                    // Try to get stored user first for faster initial render
                    const storedUser = getStoredUser();
                    if (storedUser) {
                        setUser(storedUser);
                    }

                    // Then validate token by fetching current user
                    try {
                        const currentUser = await AuthApi.getCurrentUser();
                        setUser(currentUser);
                    } catch {
                        // Token is invalid, clear auth state
                        removeToken();
                        setUser(null);
                    }
                }
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    // Login
    const login = useCallback(async (credentials: LoginRequest) => {
        setIsLoading(true);
        try {
            const response = await AuthApi.login(credentials);
            setUser(response.user);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Register
    const register = useCallback(async (data: RegisterRequest) => {
        setIsLoading(true);
        try {
            const newUser = await AuthApi.register(data);
            return newUser;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Logout
    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await AuthApi.logout();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Refresh user data
    const refreshUser = useCallback(async () => {
        if (!getToken()) return;

        try {
            const currentUser = await AuthApi.getCurrentUser();
            setUser(currentUser);
        } catch {
            removeToken();
            setUser(null);
        }
    }, []);

    const value: AuthContextState = {
        user,
        isLoading,
        isAuthenticated,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook to use auth context
export function useAuth(): AuthContextState {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Helper to check if user has required role
export function hasRole(user: User | null, roles: string | string[]): boolean {
    if (!user) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
}

// Helper to get role display name
export function getRoleDisplayName(role: string): string {
    switch (role) {
        case 'admin':
            return 'Quản trị viên';
        case 'collector':
            return 'Nhân viên thu';
        case 'debtor':
            return 'Người nợ';
        default:
            return role;
    }
}

export default AuthContext;
