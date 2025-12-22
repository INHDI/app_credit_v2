'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';
import Navigation, { MobileBottomNav } from '@/components/layout/Navigation';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register'];

// Role-based route access
const ROUTE_PERMISSIONS: Record<string, string[]> = {
    '/': ['admin'],
    '/nophaithu': ['admin', 'collector'],
    '/tinchap': ['admin'],
    '/tragop': ['admin'],
    '/lichsu': ['admin'],
    '/thongke': ['admin'],
    '/users': ['admin'],
    '/debtor': ['debtor'],
};

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

    useEffect(() => {
        if (isLoading) return;

        // If not authenticated and trying to access protected route
        if (!isAuthenticated && !isPublicRoute) {
            router.push('/login');
            return;
        }

        // If authenticated and on login page, redirect based on role
        if (isAuthenticated && isPublicRoute) {
            if (user?.role === 'debtor') {
                router.push('/debtor');
            } else {
                router.push('/');
            }
            return;
        }

        // Check role permissions for current route
        if (isAuthenticated && user) {
            // Find matching route permission
            const matchingRoute = Object.keys(ROUTE_PERMISSIONS).find(route => {
                if (route === '/') return pathname === '/';
                return pathname.startsWith(route);
            });

            if (matchingRoute) {
                const allowedRoles = ROUTE_PERMISSIONS[matchingRoute];
                if (!allowedRoles.includes(user.role)) {
                    // Redirect to appropriate page based on role
                    if (user.role === 'debtor') {
                        router.push('/debtor');
                    } else if (user.role === 'collector') {
                        router.push('/nophaithu');
                    } else {
                        router.push('/');
                    }
                }
            }
        }
    }, [isLoading, isAuthenticated, isPublicRoute, pathname, router, user]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Đang tải...</p>
                </div>
            </div>
        );
    }

    // For public routes (login), render without navigation
    if (isPublicRoute) {
        return <>{children}</>;
    }

    // For protected routes, render with navigation
    if (!isAuthenticated) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 p-4 pb-20 lg:pb-4">
            <div className="hidden lg:block">
                <Navigation />
            </div>
            <div>
                {children}
            </div>
            <MobileBottomNav />
        </div>
    );
}
