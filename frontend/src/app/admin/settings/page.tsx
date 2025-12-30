"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getBanks, getSettings, updateSettings, Bank, SystemSettings } from "@/services/settingsApi";
import {
    Settings,
    Save,
    CreditCard,
    Bell,
    MessageSquare,
    Building2,
    Hash,
    User,
    Globe,
    Key
} from "lucide-react";

export default function SettingsPage() {
    // Hooks
    const { user, isAdmin } = useAuth();
    const { toast } = useToast();

    // State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [banks, setBanks] = useState<Bank[]>([]);

    // Form Data
    const [formData, setFormData] = useState<SystemSettings>({
        id: 0, // Assuming a default ID or it will be set by the backend
        bank_id: null,
        bank_account_no: "",
        bank_account_name: "",

        zalo_enabled: false,
        zalo_webhook_url: "",

        telegram_enabled: false,
        telegram_bot_token: "",
        telegram_chat_id: "",

        email_enabled: false,
        email_host: "",
        email_port: 587,
        email_user: "",
        email_password: "",

        site_name: "Credit Management" // Default value, will be overwritten by actual settings
    });

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            if (!isAdmin) return;
            setIsLoading(true);
            try {
                const [banksRes, settingsRes] = await Promise.all([
                    getBanks(),
                    getSettings()
                ]);

                if (banksRes.success) setBanks(banksRes.data);
                if (settingsRes.success) {
                    setFormData(prev => ({
                        ...prev,
                        ...settingsRes.data
                    }));
                }
            } catch (error) {
                console.error(error);
                toast({
                    title: "Lỗi tải dữ liệu",
                    description: "Không thể lấy thông tin cấu hình",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [isAdmin, toast]);

    // Handlers
    const handleChange = (field: keyof SystemSettings, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await updateSettings(formData);
            if (res.success) {
                toast({
                    title: "Thành công",
                    description: "Cập nhật cấu hình hệ thống thành công",
                    className: "bg-emerald-50 border-emerald-200 text-emerald-800"
                });
                setFormData(prev => ({ ...prev, ...res.data }));
            } else {
                toast({
                    title: "Lỗi lưu cấu hình",
                    description: res.message || "Đã có lỗi xảy ra khi lưu thay đổi",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast({
                title: "Lỗi lưu cấu hình",
                description: "Đã có lỗi xảy ra khi lưu thay đổi",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-600">Truy cập bị từ chối</h2>
                <p className="text-slate-600">Bạn không có quyền truy cập trang này.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        Cấu hình hệ thống
                    </h1>
                    <p className="text-slate-500 mt-2 pl-14">
                        Quản lý thông tin thanh toán mặc định và các kênh thông báo
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20 rounded-2xl transition-all hover:scale-105 active:scale-95"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    ) : (
                        <Save className="w-5 h-5 mr-2" />
                    )}
                    Lưu thay đổi
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Payment Configuration Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Thanh toán mặc định</h2>
                            <p className="text-sm text-slate-500">Thông tin nhận tiền chuyển khoản QR Code</p>
                        </div>
                    </div>

                    <div className="p-8 space-y-6 flex-1">
                        <div className="space-y-2">
                            <label htmlFor="bank_id" className="text-sm font-semibold text-slate-700 ml-1">Ngân hàng thụ hưởng</label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                                <select
                                    id="bank_id"
                                    value={formData.bank_id?.toString() || ""}
                                    onChange={(e) => handleChange('bank_id', Number(e.target.value))}
                                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all font-medium appearance-none cursor-pointer"
                                >
                                    <option value="">-- Chọn ngân hàng --</option>
                                    {banks.map((bank) => (
                                        <option key={bank.id} value={bank.id}>
                                            {bank.code} - {bank.short_name || bank.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-3.5 pointer-events-none">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="account_no" className="text-sm font-semibold text-slate-700 ml-1">Số tài khoản (STK)</label>
                            <div className="relative group">
                                <Hash className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    id="account_no"
                                    type="text"
                                    value={formData.bank_account_no || ""}
                                    onChange={(e) => handleChange('bank_account_no', e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all font-medium placeholder:font-normal"
                                    placeholder="Nhập số tài khoản..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="account_name" className="text-sm font-semibold text-slate-700 ml-1">Tên chủ tài khoản</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    id="account_name"
                                    type="text"
                                    value={formData.bank_account_name || ""}
                                    onChange={(e) => handleChange('bank_account_name', e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all font-medium uppercase placeholder:normal-case placeholder:font-normal"
                                    placeholder="NGUYEN VAN A"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notification Channels Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Kênh thông báo</h2>
                            <p className="text-sm text-slate-500">Cấu hình gửi tin nhắn tự động</p>
                        </div>
                    </div>

                    <div className="p-8 space-y-8 flex-1">
                        {/* Zalo */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <label htmlFor="zalo_enabled" className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        id="zalo_enabled"
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.zalo_enabled}
                                        onChange={(e) => handleChange('zalo_enabled', e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                                <span className="text-base font-semibold text-slate-900">Zalo Webhook</span>
                            </div>

                            {formData.zalo_enabled && (
                                <div className="pl-14 space-y-2 animate-in slide-in-from-top-2 fade-in">
                                    <label htmlFor="zalo_url" className="text-sm font-medium text-slate-600">Webhook URL</label>
                                    <div className="relative group">
                                        <Globe className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            id="zalo_url"
                                            type="text"
                                            value={formData.zalo_webhook_url || ""}
                                            onChange={(e) => handleChange('zalo_webhook_url', e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm"
                                            placeholder="https://openapi.zalo.me/..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* Telegram */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <label htmlFor="telegram_enabled" className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        id="telegram_enabled"
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.telegram_enabled}
                                        onChange={(e) => handleChange('telegram_enabled', e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                                </label>
                                <span className="text-base font-semibold text-slate-900">Telegram Bot</span>
                            </div>

                            {formData.telegram_enabled && (
                                <div className="pl-14 grid grid-cols-1 gap-4 animate-in slide-in-from-top-2 fade-in">
                                    <div className="space-y-2">
                                        <label htmlFor="tele_token" className="text-sm font-medium text-slate-600">Bot Token</label>
                                        <div className="relative group">
                                            <Key className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                            <input
                                                id="tele_token"
                                                type="text"
                                                value={formData.telegram_bot_token || ""}
                                                onChange={(e) => handleChange('telegram_bot_token', e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all text-sm font-mono"
                                                placeholder="123456:ABC-DEF..."
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="tele_chatid" className="text-sm font-medium text-slate-600">Chat ID</label>
                                        <div className="relative group">
                                            <MessageSquare className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                            <input
                                                id="tele_chatid"
                                                type="text"
                                                value={formData.telegram_chat_id || ""}
                                                onChange={(e) => handleChange('telegram_chat_id', e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all text-sm font-mono"
                                                placeholder="-100..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* Email */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <label htmlFor="email_enabled" className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        id="email_enabled"
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.email_enabled}
                                        onChange={(e) => handleChange('email_enabled', e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                </label>
                                <span className="text-base font-semibold text-slate-900">Email SMTP</span>
                            </div>

                            {formData.email_enabled && (
                                <div className="pl-14 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in">
                                    <div className="space-y-2">
                                        <label htmlFor="email_host" className="text-sm font-medium text-slate-600">SMTP Host</label>
                                        <input
                                            id="email_host"
                                            type="text"
                                            value={formData.email_host || ""}
                                            onChange={(e) => handleChange('email_host', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all text-sm"
                                            placeholder="smtp.gmail.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email_port" className="text-sm font-medium text-slate-600">Port</label>
                                        <input
                                            id="email_port"
                                            type="number"
                                            value={formData.email_port || 587}
                                            onChange={(e) => handleChange('email_port', Number(e.target.value))}
                                            className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all text-sm"
                                            placeholder="587"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email_user" className="text-sm font-medium text-slate-600">Username/Email</label>
                                        <input
                                            id="email_user"
                                            type="email"
                                            value={formData.email_user || ""}
                                            onChange={(e) => handleChange('email_user', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all text-sm"
                                            placeholder="admin@example.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email_pass" className="text-sm font-medium text-slate-600">Password</label>
                                        <input
                                            id="email_pass"
                                            type="password"
                                            value={formData.email_password || ""}
                                            onChange={(e) => handleChange('email_password', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all text-sm"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
