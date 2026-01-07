'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/providers/AuthContext';
import { API_CONFIG, createApiUrl } from '@/config/config';
import { getAuthHeaders } from '@/services/authApi';
import { PageHeader } from "@/components/layout/PageHeader";
import DebtorFilter from './DebtorFilter';
import DebtorSummary from './DebtorSummary';
import DebtorTable from './DebtorTable';
import GenericContractDetailModal from '@/components/ui/GenericContractDetailModal';
import PaymentModal from '@/components/ui/PaymentModal';
import QRDisplayModal from '@/components/ui/QRDisplayModal';
import PaymentScheduleModal from '@/components/ui/PaymentScheduleModal'; // Added import
import {
    FileText,
    DollarSign,
    AlertCircle,
    TrendingUp,
    Calendar,
    Receipt
} from 'lucide-react';
import { ContractDetailConfig } from '@/types/contractDetail';

// --- Interfaces ---
interface Contract {
    MaHD: string;
    HoTen: string;
    NgayVay: string;
    SoTienVay: number;
    KyDong: number;
    LaiSuat: number;
    TrangThai: string;
    contract_type: 'tin_chap' | 'tra_gop';
    // Enriched fields
    LaiDaTra?: number;
    GocConLai?: number;
    LaiConLai?: number;
    DaThanhToan?: number;
    ConLai?: number;
    SoLanTra?: number;
}

interface PaymentData {
    maHD: string;
    totalAmountDue: number; // Tổng nợ cần trả (Overdue + Current Period)
    periodAmount: number;   // Số tiền 1 kỳ (cho hint partial payment)
}

// Config for Detail Modal
const tinChapConfig: ContractDetailConfig = {
    title: "Chi tiết hợp đồng tín chấp",
    contractType: "tin_chap",
    tabs: [
        { id: "overview", label: "Tổng quan", icon: FileText },
        { id: "payments", label: "Lịch trả lãi", icon: Calendar },
    ],
    apiEndpoint: "/tin-chap",
    paymentApiEndpoint: "/tin-chap/payment"
};

const traGopConfig: ContractDetailConfig = {
    title: "Chi tiết hợp đồng trả góp",
    contractType: "tra_gop",
    tabs: [
        { id: "overview", label: "Tổng quan", icon: FileText },
        { id: "payments", label: "Lịch trả góp", icon: Calendar },
    ],
    apiEndpoint: "/tra-gop",
    paymentApiEndpoint: "/tra-gop/payment"
};

export default function DebtorPortalPage() {
    const { user } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedTimeRange, setSelectedTimeRange] = useState('all');

    // Modals
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [detailInitialTab, setDetailInitialTab] = useState("overview");

    // Payment Schedule Modal
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [selectedScheduleContract, setSelectedScheduleContract] = useState<Contract | null>(null);

    // Payment Modal
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

    // QR Modal
    const [qrModal, setQrModal] = useState<{ isOpen: boolean; qrUrl: string | null; amount: number; maHD: string; note?: string }>({
        isOpen: false, qrUrl: null, amount: 0, maHD: ''
    });
    // Track if QR is for principal payment (to use different confirm API)
    const [isPrincipalPayment, setIsPrincipalPayment] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError('');

        try {
            const headers = { ...getAuthHeaders(), accept: 'application/json' };

            const [contractsRes, summaryRes] = await Promise.all([
                fetch(createApiUrl(API_CONFIG.ENDPOINTS.DEBTOR_CONTRACTS), { headers }),
                fetch(createApiUrl(API_CONFIG.ENDPOINTS.DEBTOR_SUMMARY), { headers }),
            ]);

            const [contractsData, summaryData] = await Promise.all([
                contractsRes.json(),
                summaryRes.json(),
            ]);

            if (contractsData.success && contractsData.data) {
                const tinChapContracts = (contractsData.data.tin_chap || []).map((c: any) => ({ ...c, contract_type: 'tin_chap' }));
                const traGopContracts = (contractsData.data.tra_gop || []).map((c: any) => ({ ...c, contract_type: 'tra_gop' }));
                setContracts([...tinChapContracts, ...traGopContracts]);
            }

            if (summaryData.success && summaryData.data) {
                setSummary(summaryData.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDetail = (contract: Contract) => {
        setSelectedContract(contract);
        setDetailInitialTab("overview");
        setDetailModalOpen(true);
    };

    const handleViewSchedule = (contract: Contract) => {
        setSelectedScheduleContract(contract);
        setScheduleModalOpen(true);
    };

    const handleSettle = (contract: Contract) => {
        // "Tất toán" means paying off remaining debt.
        // For TinChap: Principal Remaining (GocConLai) + Interest Remaining (LaiConLai)
        // For TraGop: Total Remaining (ConLai)

        const isTinChap = contract.contract_type === 'tin_chap';
        let totalDue = 0;
        let periodAmount = 0;

        if (isTinChap) {
            // For TinChap, period amount is distinct from settlement.
            periodAmount = contract.LaiSuat;

            const remainingPrincipal = contract.GocConLai || 0;
            const remainingInterest = contract.LaiConLai || 0;
            totalDue = remainingPrincipal + remainingInterest;
        } else {
            const SoLanTra = (contract as any).SoLanTra || 1;
            const totalLoan = Number(contract.SoTienVay) + Number(contract.LaiSuat);
            periodAmount = Math.ceil(totalLoan / SoLanTra);

            totalDue = contract.ConLai || 0;
        }

        if (totalDue <= 0) {
            // Already settled or fully paid?
            // Allow opening modal still? Or alert?
            // But maybe user wants to pay partially even if logic says 0? No.
            // Just warn.
            alert('Hợp đồng này hiện không còn dư nợ để tất toán.');
            // But keep open logic just in case enrichment is delayed? No.
            return;
        }

        setPaymentData({
            maHD: contract.MaHD,
            totalAmountDue: totalDue,
            periodAmount: periodAmount
        });
        setPaymentModalOpen(true);
    };

    const handleProcessPayment = async (maHD: string | number, amount: number) => {
        try {
            const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
            const totalDue = paymentData?.totalAmountDue || 0;
            // Determine payment type for interest payments
            const paymentType = amount >= totalDue ? 'interest_full' : 'interest_partial';

            const res = await fetch(createApiUrl('/debtor/generate-qr'), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ma_hd: maHD,
                    amount: amount,
                    payment_type: paymentType
                })
            });
            const data = await res.json();

            if (data.success) {
                const paymentNote = amount >= totalDue ? "Tất toán toàn bộ" : "Tất toán một phần";

                setQrModal({
                    isOpen: true,
                    maHD: maHD.toString(),
                    amount: amount,
                    qrUrl: data.data.qr_url,
                    note: paymentNote
                });
                return Promise.resolve();
            } else {
                alert('Lỗi: ' + data.message);
                return Promise.reject(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Lỗi kết nối');
            throw err;
        }
    };

    // Mapping helper for GenericContractDetailModal
    const getMappedContractDetail = (c: Contract | null) => {
        if (!c) return null;
        const isTinChap = c.contract_type === 'tin_chap';
        return {
            ma_hop_dong: c.MaHD,
            ten_khach_hang: c.HoTen,
            ngay_vay: c.NgayVay,
            tong_tien_vay: c.SoTienVay,
            lai_suat: c.LaiSuat,
            status: c.TrangThai,
            statusColor: c.TrangThai?.includes('Đã') || c.TrangThai?.includes('đủ') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
            customerInfo: `${c.HoTen} - ${c.MaHD}`,

            // Conditional fields
            daily_interest: isTinChap ? c.LaiSuat : 0, // Mapping 'LaiSuat' to daily_interest prop for display? 
            // Generic modal uses 'daily_interest' label "Lãi/ngày" or similar. But `contract.kieu_lai_suat` used in Modal.
            // Let's check logic:
            // {config.contractType === 'tin_chap' ? `Lãi/${contract.kieu_lai_suat}` : 'Còn lại'}

            kieu_lai_suat: isTinChap ? `${c.KyDong} ngày` : '',

            // TraGop specific
            so_ky_tra: c.SoLanTra || 0,

            // Financials for bottom cards
            total_interest_paid: c.LaiDaTra || (c.DaThanhToan) || 0,

            // For Principal Payment Modal support (TinChap)
            GocConLai: c.GocConLai,

            // Extra props used by modal internally?
            // It seems "contract" prop is fairly loose typed in usage based on modal code.
        };
    };

    // Filter Logic
    const filteredContracts = useMemo(() => {
        return contracts.filter(c => {
            const matchesSearch = c.MaHD.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.HoTen.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesStatus = true;
            if (selectedStatus !== 'all') {
                matchesStatus = c.TrangThai === selectedStatus;
            }
            return matchesSearch && matchesStatus;
        });
    }, [contracts, searchTerm, selectedStatus]);

    // Summary Cards Data
    const summaryCards = useMemo(() => {
        if (!summary) return [];
        return [
            {
                title: "Tổng hợp đồng",
                value: String(summary.tong_hop_dong || 0),
                subtitle: "Hợp đồng",
                description: `${(summary.so_hop_dong_tin_chap || 0) + (summary.so_hop_dong_tra_gop || 0)} đang hoạt động`,
                icon: FileText,
                gradient: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
                iconBg: "bg-blue-100",
                textColor: "text-blue-700",
            },
            {
                title: "Tổng tiền cho vay",
                value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.tong_vay || 0),
                subtitle: "VNĐ",
                description: "Tổng giá trị cho vay",
                icon: DollarSign,
                gradient: "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200",
                iconBg: "bg-emerald-100",
                textColor: "text-emerald-700",
            },
            {
                title: "Đã thu về",
                value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.da_tra || 0),
                subtitle: "VNĐ",
                description: `Đã thanh toán`,
                icon: TrendingUp,
                gradient: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
                iconBg: "bg-green-100",
                textColor: "text-green-700",
            },
            {
                title: "Còn phải thu",
                value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.con_lai || 0),
                subtitle: "VNĐ",
                description: "Số tiền chưa thanh toán",
                icon: AlertCircle,
                gradient: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200",
                iconBg: "bg-amber-100",
                textColor: "text-amber-700",
            },
        ];
    }, [summary]);

    // Need to provide onLoadPaymentHistory prop to GenericContractDetailModal
    // Usually fetching from /api/lich-su-tra-lai/{maHD}? 
    // Or /debtor/payment-history API?
    // GenericContractDetailModal expects `onLoadPaymentHistory` to return `PaymentHistoryItem[]`.
    // We can wrap the call.
    const loadPaymentHistory = async (maHD: string) => {
        try {
            // We can maybe reuse /debtor/payment-history but that is paginated for ALL.
            // We probably need a specific endpoint or filter the all-history endpoint?
            // Actually, `GenericContractDetailModal` logic usually calls specific API.
            // Since we are reusing the component, we should probably providing a compliant function.
            // However, allow Debtor to view history of specific contract?
            // Simplest: Call the admin endpoint if allowed? Unlikely.
            // Or call /debtor/payment-history and filter client side (not efficient but workaround)
            // Better: Create /debtor/history/{maHD} ?
            // Or filter the /debtor/payment-history endpoint by maHD?
            // backend/app/routers/debtor.py: get_payment_history(page, page_size) - no maHD filter.

            // Workaround: We don't have a direct API to get history for ONE contract for Debtor yet.
            // But the modal NEEDS it to render "Lịch trả lãi".
            // Let's check backend debtor.py again.
            // It doesn't have it.

            // Solution: Modify backend debtor.py to allow filtering by MaHD in get_payment_history?
            // Or just return empty for now to avoid breaking?
            // User asked "Xem lịch thanh toán" icon. This implies they want to see it.
            // I should probably add backend support for it or use the existing "Schedule" endpoint?
            // Schedule != History.
            // GenericContractDetailModal shows History.
            // If user wants "Xem lịch thanh toán" (Schedule), maybe I should show Schedule instead of History?
            // But GenericContractDetailModal tabs say "Lịch trả lãi" ~ History.

            // Let's assume for now I will use a dummy function that returns empty or tries to fetch from existing.
            // Actually, the /debtor/payment-history endpoint queries all.
            // I'll add a quick tool call to fix backend if needed.
            // For now, let's just make it run without crashing.
            return [];
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
        </div>
    );

    return (
        <div>
            <PageHeader
                title={`Xin chào, ${user?.ho_ten}`}
                description="Theo dõi và quản lý các khoản vay của bạn"
                breadcrumbs={[
                    { label: "Trang chủ", href: "/" },
                    { label: "Tổng quan" }
                ]}
            />

            <DebtorFilter
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                selectedTimeRange={selectedTimeRange}
                setSelectedTimeRange={setSelectedTimeRange}
            />

            <DebtorSummary summaryCards={summaryCards} />

            <DebtorTable
                contracts={filteredContracts}
                startIndex={0}
                onViewDetail={handleViewDetail}
                onViewSchedule={handleViewSchedule}
                onPay={handleSettle}
            />

            {/* Modals */}
            <GenericContractDetailModal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                contract={getMappedContractDetail(selectedContract) as any}
                config={selectedContract?.contract_type === 'tin_chap' ? tinChapConfig : traGopConfig}
                initialTab={detailInitialTab}
                onRefresh={fetchData}
                // Principal payment handler - show QR for debtor
                onProcessPrincipalPayment={async (maHD, amount, paymentType) => {
                    try {
                        const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
                        // Map 'full' | 'partial' to backend expected values
                        const backendPaymentType = paymentType === 'full' ? 'principal_full' : 'principal_partial';
                        const res = await fetch(createApiUrl('/debtor/generate-qr'), {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                ma_hd: maHD,
                                amount: amount,
                                payment_type: backendPaymentType
                            })
                        });
                        const data = await res.json();

                        if (data.success) {
                            setIsPrincipalPayment(true);
                            setQrModal({
                                isOpen: true,
                                maHD: maHD,
                                amount: amount,
                                qrUrl: data.data.qr_url,
                                note: paymentType === 'full' ? "Thanh toán toàn bộ gốc" : "Thanh toán một phần gốc"
                            });
                        } else {
                            alert('Lỗi: ' + data.message);
                        }
                    } catch (err) {
                        console.error(err);
                        alert('Lỗi kết nối');
                    }
                }}
                // Mapping payment history load - using a fetch compatible with GenericContractDetailModal expectations
                // For now, since we lack the specific API for debtor to get SINGLE contract history, 
                // We might just pass an empty function or simplistic one. 
                // But this might result in empty history tab.
                onLoadPaymentHistory={async (maHD) => {
                    // Temporary: Fetch all history and filter client side.
                    // This is inefficient but works without backend changes immediately.
                    const res = await fetch(createApiUrl(`/debtor/payment-history?page=1&page_size=1000`), {
                        headers: getAuthHeaders()
                    });
                    const json = await res.json();
                    if (json.success) {
                        return json.data.items.filter((p: any) => p.MaHD === maHD).map((p: any) => ({
                            ...p,
                            ngay_tra_lai: p.Ngay,
                            so_tien_lai: p.SoTien,
                            so_tien_tra: p.TienDaTra,
                            ghi_chu: p.TrangThaiNgayThanhToan
                        }));
                    }
                    return [];
                }}
            />

            {paymentData && (
                <PaymentModal
                    isOpen={paymentModalOpen}
                    onClose={() => setPaymentModalOpen(false)}
                    paymentId={paymentData.maHD}
                    paymentAmount={paymentData.totalAmountDue}
                    tienCanThanhToanTheoKy={paymentData.periodAmount}
                    onPaymentSuccess={() => {
                        setPaymentModalOpen(false);
                        fetchData();
                    }}
                    onProcessPayment={handleProcessPayment}
                />
            )}

            <PaymentScheduleModal
                isOpen={scheduleModalOpen}
                onClose={() => setScheduleModalOpen(false)}
                contract={selectedScheduleContract}
                onFetchHistory={async (maHD) => {
                    // Call the new Debtor API endpoint
                    const res = await fetch(createApiUrl(`/debtor/contract-history/${maHD}`), {
                        headers: getAuthHeaders()
                    });
                    const json = await res.json();
                    if (json.success) {
                        return json.data;
                    }
                    return [];
                }}
            />

            <QRDisplayModal
                isOpen={qrModal.isOpen}
                onClose={() => {
                    setQrModal(prev => ({ ...prev, isOpen: false }));
                    setIsPrincipalPayment(false);
                    fetchData();
                }}
                data={qrModal}
                onConfirmPayment={isPrincipalPayment ? async (maHD, amount) => {
                    // Call principal payment API
                    const res = await fetch(createApiUrl(`/tin-chap/tra-goc/${maHD}?so_tien_tra_goc=${amount}`), {
                        method: 'PUT',
                        headers: {
                            ...getAuthHeaders(),
                            'Content-Type': 'application/json'
                        }
                    });
                    const result = await res.json();
                    if (!result.success) {
                        throw new Error(result.message || 'Lỗi thanh toán gốc');
                    }
                } : undefined}
            />
        </div>
    );
}
