'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';
import { AuthApi, LoginStep1Response, OTPSetupResponse } from '@/services/authApi';
import { Button } from '@/components/ui/button';
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle, Shield, QrCode, KeyRound, ArrowLeft, Check } from 'lucide-react';

type LoginStep = 'credentials' | 'otp_setup' | 'otp_verify' | 'password_change';

export default function LoginPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();

    // Step tracking
    const [currentStep, setCurrentStep] = useState<LoginStep>('credentials');

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // OTP flow states
    const [tempToken, setTempToken] = useState('');
    const [otpSetup, setOtpSetup] = useState<OTPSetupResponse | null>(null);
    const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

    // UI states
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // OTP input refs
    const otpRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    // Handle Step 1: Credentials
    const handleCredentialsSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Vui lòng nhập email và mật khẩu');
            return;
        }

        setIsLoading(true);
        try {
            const response: LoginStep1Response = await AuthApi.loginStep1({ email, password });
            setTempToken(response.temp_token);
            setRequiresPasswordChange(response.requires_password_change);

            if (response.requires_setup) {
                // First time - need to setup OTP
                const setupData = await AuthApi.getOTPSetup(response.temp_token);
                setOtpSetup(setupData);
                setCurrentStep('otp_setup');
            } else if (!response.requires_otp) {
                // OTP disabled - check if password change needed FIRST
                if (response.requires_password_change) {
                    // Don't refresh user yet - stay on login page for password change
                    setCurrentStep('password_change');
                } else {
                    // No password change needed - complete login
                    await refreshUser();
                    router.push('/');
                }
            } else {
                // Just verify OTP
                setCurrentStep('otp_verify');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP input
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits

        const newOtp = [...otpCode];
        newOtp[index] = value.slice(-1); // Only last digit
        setOtpCode(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs[index + 1].current?.focus();
        }
    };

    // Handle OTP paste
    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otpCode];
        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i];
        }
        setOtpCode(newOtp);
        if (pastedData.length === 6) {
            otpRefs[5].current?.focus();
        }
    };

    // Handle OTP keydown (backspace)
    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            otpRefs[index - 1].current?.focus();
        }
    };

    // Unified submit handler
    const submitOtpVerification = async (code: string) => {
        if (!code || code.length !== 6) return;

        setError('');
        setIsLoading(true);
        try {
            await AuthApi.verifyOTP(tempToken, code);

            if (requiresPasswordChange) {
                setCurrentStep('password_change');
            } else {
                await refreshUser();
                router.push('/');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Mã OTP không đúng');
            setOtpCode(['', '', '', '', '', '']);
            otpRefs[0].current?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP verification (Manual submit)
    const handleOtpSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const code = otpCode.join('');
        if (code.length !== 6) {
            setError('Vui lòng nhập đủ 6 số');
            return;
        }
        await submitOtpVerification(code);
    };

    // Handle password change
    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        setIsLoading(true);
        try {
            await AuthApi.changePassword(password, newPassword);
            await refreshUser();
            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-focus first OTP input when entering OTP step
    useEffect(() => {
        if (currentStep === 'otp_verify' || currentStep === 'otp_setup') {
            setTimeout(() => otpRefs[0].current?.focus(), 100);
        }
    }, [currentStep]);

    // Auto-submit when OTP is filled
    useEffect(() => {
        const code = otpCode.join('');
        if (code.length === 6 && currentStep === 'otp_verify') {
            submitOtpVerification(code);
        }
    }, [otpCode, currentStep]);

    // Render step header
    const renderStepHeader = () => {
        const headers: Record<LoginStep, { icon: React.ReactNode; title: string; subtitle: string }> = {
            credentials: {
                icon: <LogIn className="w-10 h-10 text-white" />,
                title: 'Đăng nhập',
                subtitle: 'Hệ thống quản lý tín dụng'
            },
            otp_setup: {
                icon: <QrCode className="w-10 h-10 text-white" />,
                title: 'Thiết lập xác thực 2 lớp',
                subtitle: 'Quét mã QR bằng ứng dụng Authenticator'
            },
            otp_verify: {
                icon: <Shield className="w-10 h-10 text-white" />,
                title: 'Xác thực OTP',
                subtitle: 'Nhập mã 6 số từ ứng dụng'
            },
            password_change: {
                icon: <KeyRound className="w-10 h-10 text-white" />,
                title: 'Đổi mật khẩu',
                subtitle: 'Vui lòng đặt mật khẩu mới'
            }
        };

        const header = headers[currentStep];

        return (
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-8 py-10 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-2xl mb-4 shadow-lg">
                    {header.icon}
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">{header.title}</h1>
                <p className="text-teal-100 text-sm">{header.subtitle}</p>
            </div>
        );
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
                    {renderStepHeader()}

                    {/* Step Indicator */}
                    {currentStep !== 'credentials' && (
                        <div className="flex justify-center gap-2 py-4 bg-slate-50 border-b border-slate-100">
                            {['credentials', 'otp_setup', 'otp_verify', 'password_change'].map((step, idx) => (
                                <div
                                    key={step}
                                    className={`w-2 h-2 rounded-full transition-all ${currentStep === step ? 'w-6 bg-teal-500' :
                                        ['otp_setup', 'otp_verify', 'password_change'].indexOf(currentStep) >= idx
                                            ? 'bg-teal-400' : 'bg-slate-300'
                                        }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="mx-8 mt-6 flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Step: Credentials */}
                    {currentStep === 'credentials' && (
                        <form onSubmit={handleCredentialsSubmit} className="p-8 space-y-6">
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
                                        Đang xử lý...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <LogIn className="w-5 h-5" />
                                        Tiếp tục
                                    </span>
                                )}
                            </Button>
                        </form>
                    )}

                    {/* Step: OTP Setup (QR Code) */}
                    {currentStep === 'otp_setup' && otpSetup && (
                        <div className="p-8 space-y-6">
                            {/* QR Code */}
                            <div className="flex justify-center">
                                <div className="p-4 bg-white rounded-2xl shadow-lg border border-slate-100">
                                    <img
                                        src={`data:image/png;base64,${otpSetup.qr_code_base64}`}
                                        alt="QR Code"
                                        className="w-48 h-48"
                                    />
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="text-center space-y-2">
                                <p className="text-slate-600 text-sm">
                                    Quét mã QR bằng ứng dụng xác thực như:
                                </p>
                                <p className="text-slate-500 text-xs">
                                    Google Authenticator, Authy, Microsoft Authenticator
                                </p>
                            </div>

                            {/* Manual entry code */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <p className="text-xs text-slate-500 mb-2">Hoặc nhập mã thủ công:</p>
                                <code className="text-sm font-mono text-slate-700 break-all select-all">
                                    {otpSetup.secret}
                                </code>
                            </div>

                            {/* Continue button */}
                            <Button
                                onClick={() => {
                                    setCurrentStep('otp_verify');
                                    setOtpCode(['', '', '', '', '', '']);
                                }}
                                className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 transition-all duration-300"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Check className="w-5 h-5" />
                                    Đã quét xong, tiếp tục
                                </span>
                            </Button>
                        </div>
                    )}

                    {/* Step: OTP Verify */}
                    {currentStep === 'otp_verify' && (
                        <form onSubmit={handleOtpSubmit} className="p-8 space-y-6">
                            {/* OTP Input */}
                            <div className="flex justify-center gap-2">
                                {otpCode.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={otpRefs[index]}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        onPaste={index === 0 ? handleOtpPaste : undefined}
                                        className="w-12 h-14 text-center text-2xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                                        disabled={isLoading}
                                    />
                                ))}
                            </div>

                            <p className="text-center text-sm text-slate-500">
                                Nhập mã 6 số từ ứng dụng xác thực
                            </p>

                            {/* Submit button */}
                            <Button
                                type="submit"
                                disabled={isLoading || otpCode.join('').length !== 6}
                                className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 transition-all duration-300 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Đang xác thực...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Shield className="w-5 h-5" />
                                        Xác thực
                                    </span>
                                )}
                            </Button>

                            {/* Back button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setCurrentStep('credentials');
                                    setError('');
                                }}
                                className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Quay lại đăng nhập
                            </button>
                        </form>
                    )}

                    {/* Step: Password Change */}
                    {currentStep === 'password_change' && (
                        <form onSubmit={handlePasswordChange} className="p-8 space-y-6">
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                                <p>Đây là lần đăng nhập đầu tiên. Vui lòng đặt mật khẩu mới.</p>
                            </div>

                            {/* New password */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Mật khẩu mới
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Nhập mật khẩu mới"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Confirm password */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Xác nhận mật khẩu
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Nhập lại mật khẩu mới"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Submit button */}
                            <Button
                                type="submit"
                                disabled={isLoading || !newPassword || !confirmPassword}
                                className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 transition-all duration-300 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Đang xử lý...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Check className="w-5 h-5" />
                                        Đổi mật khẩu và hoàn tất
                                    </span>
                                )}
                            </Button>
                        </form>
                    )}

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
