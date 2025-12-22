'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthContext';
import { API_CONFIG, createApiUrl } from '@/config/config';
import { getAuthHeaders } from '@/services/authApi';
import {
    FileText,
    Calendar,
    DollarSign,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle,
    User
} from 'lucide-react';

interface Contract {
    MaHD: string;
    HoTen: string;
    NgayVay: string;
    SoTienVay: number;
    KyDong: number;
    LaiSuat: number;
    TrangThai: string;
    contract_type: 'tin_chap' | 'tra_gop';
}

interface PaymentSchedule {
    MaHD: string;
    Ngay: string;
    SoTien: number;
    TrangThaiThanhToan: string;
    days_until_due: number;
}

interface Summary {
    total_contracts: number;
    total_borrowed: number;
    total_paid: number;
    total_remaining_interest: number;
}

interface PaymentHistory {
    MaHD: string;
    Ngay: string;
    SoTien: number;
    TienDaTra: number;
    TrangThaiThanhToan: string;
}

export default function DebtorPortalPage() {
    const { user } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [schedule, setSchedule] = useState<PaymentSchedule[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [history, setHistory] = useState<PaymentHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'schedule' | 'history'>('overview');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError('');

        try {
            const headers = { ...getAuthHeaders(), accept: 'application/json' };

            // Fetch all data in parallel
            const [contractsRes, scheduleRes, summaryRes, historyRes] = await Promise.all([
                fetch(createApiUrl(API_CONFIG.ENDPOINTS.DEBTOR_CONTRACTS), { headers }),
                fetch(createApiUrl(API_CONFIG.ENDPOINTS.DEBTOR_SCHEDULE), { headers }),
                fetch(createApiUrl(API_CONFIG.ENDPOINTS.DEBTOR_SUMMARY), { headers }),
                fetch(createApiUrl(API_CONFIG.ENDPOINTS.DEBTOR_HISTORY), { headers }),
            ]);

            if (!contractsRes.ok || !scheduleRes.ok || !summaryRes.ok || !historyRes.ok) {
                throw new Error('Không thể tải dữ liệu');
            }

            const [contractsData, scheduleData, summaryData, historyData] = await Promise.all([
                contractsRes.json(),
                scheduleRes.json(),
                summaryRes.json(),
                historyRes.json(),
            ]);

            if (contractsData.success) setContracts(contractsData.data);
            if (scheduleData.success) setSchedule(scheduleData.data);
            if (summaryData.success) setSummary(summaryData.data);
            if (historyData.success) setHistory(historyData.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                    <p className="text-slate-500">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Xin chào, {user?.ho_ten}</h1>
                        <p className="text-teal-100">Tra cứu thông tin hợp đồng và thanh toán của bạn</p>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Số hợp đồng</p>
                                <p className="text-xl font-bold text-slate-800">{summary.total_contracts}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Tổng vay</p>
                                <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.total_borrowed)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Đã trả</p>
                                <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.total_paid)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Lãi còn lại</p>
                                <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.total_remaining_interest)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex border-b border-slate-100">
                    {[
                        { key: 'overview', label: 'Tổng quan', icon: TrendingUp },
                        { key: 'contracts', label: 'Hợp đồng', icon: FileText },
                        { key: 'schedule', label: 'Lịch trả', icon: Calendar },
                        { key: 'history', label: 'Lịch sử', icon: Clock },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as typeof activeTab)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === tab.key
                                    ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50/50'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-4">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-800">Lịch trả lãi sắp tới</h3>
                            {schedule.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Không có lịch trả nào sắp tới</p>
                            ) : (
                                <div className="space-y-2">
                                    {schedule.slice(0, 5).map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                            <div>
                                                <p className="font-medium text-slate-800">{item.MaHD}</p>
                                                <p className="text-sm text-slate-500">{formatDate(item.Ngay)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-teal-600">{formatCurrency(item.SoTien)}</p>
                                                <p className="text-xs text-slate-500">
                                                    {item.days_until_due === 0 ? 'Hôm nay' :
                                                        item.days_until_due < 0 ? `Quá hạn ${Math.abs(item.days_until_due)} ngày` :
                                                            `Còn ${item.days_until_due} ngày`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contracts Tab */}
                    {activeTab === 'contracts' && (
                        <div className="space-y-3">
                            {contracts.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Không có hợp đồng nào</p>
                            ) : (
                                contracts.map((contract) => (
                                    <div key={contract.MaHD} className="p-4 bg-slate-50 rounded-xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="font-semibold text-slate-800">{contract.MaHD}</span>
                                                <span className="ml-2 text-xs px-2 py-1 bg-slate-200 rounded-full">
                                                    {contract.contract_type === 'tin_chap' ? 'Tín chấp' : 'Trả góp'}
                                                </span>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${contract.TrangThai.includes('Đã tất toán')
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {contract.TrangThai}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-slate-500">Ngày vay:</span>
                                                <span className="ml-2 text-slate-700">{formatDate(contract.NgayVay)}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Số tiền:</span>
                                                <span className="ml-2 text-slate-700">{formatCurrency(contract.SoTienVay)}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Kỳ đóng:</span>
                                                <span className="ml-2 text-slate-700">{contract.KyDong} ngày</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Lãi suất:</span>
                                                <span className="ml-2 text-slate-700">{contract.LaiSuat}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Schedule Tab */}
                    {activeTab === 'schedule' && (
                        <div className="space-y-2">
                            {schedule.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Không có lịch trả nào</p>
                            ) : (
                                schedule.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.TrangThaiThanhToan === 'Đóng đủ'
                                                    ? 'bg-emerald-100'
                                                    : item.days_until_due < 0
                                                        ? 'bg-red-100'
                                                        : 'bg-amber-100'
                                                }`}>
                                                {item.TrangThaiThanhToan === 'Đóng đủ' ? (
                                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                                ) : (
                                                    <Calendar className="w-5 h-5 text-amber-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{item.MaHD}</p>
                                                <p className="text-sm text-slate-500">{formatDate(item.Ngay)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-teal-600">{formatCurrency(item.SoTien)}</p>
                                            <p className={`text-xs ${item.TrangThaiThanhToan === 'Đóng đủ'
                                                    ? 'text-emerald-600'
                                                    : item.days_until_due < 0
                                                        ? 'text-red-600'
                                                        : 'text-slate-500'
                                                }`}>
                                                {item.TrangThaiThanhToan === 'Đóng đủ' ? 'Đã thanh toán' :
                                                    item.days_until_due === 0 ? 'Hôm nay' :
                                                        item.days_until_due < 0 ? `Quá hạn ${Math.abs(item.days_until_due)} ngày` :
                                                            `Còn ${item.days_until_due} ngày`}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="space-y-2">
                            {history.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Chưa có lịch sử thanh toán</p>
                            ) : (
                                history.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div>
                                            <p className="font-medium text-slate-800">{item.MaHD}</p>
                                            <p className="text-sm text-slate-500">{formatDate(item.Ngay)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-emerald-600">+{formatCurrency(item.TienDaTra)}</p>
                                            <p className="text-xs text-slate-500">{item.TrangThaiThanhToan}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
