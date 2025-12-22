'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Vui lòng nhập email và mật khẩu');
            return;
        }

        try {
            await login({ email, password });
            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-teal-200/30 to-emerald-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-3xl" />
            </div>

            {/* Login Card */}
            <div className="relative w-full max-w-md mx-4">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-8 py-10 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-2xl mb-4 shadow-lg">
                            <LogIn className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Đăng nhập</h1>
                        <p className="text-teal-100 text-sm">Hệ thống quản lý tín dụng</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {/* Error message */}
                        {error && (
                            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Email field */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Password field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Đang đăng nhập...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <LogIn className="w-5 h-5" />
                                    Đăng nhập
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="px-8 pb-8 text-center">
                        <p className="text-xs text-slate-400">
                            © 2024 Credit Management System
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
