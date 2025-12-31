'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthContext';
import { API_CONFIG, createApiUrl } from '@/config/config';
import { getAuthHeaders } from '@/services/authApi';
import PaymentModal from '@/components/ui/PaymentModal';
import {
    FileText,
    DollarSign,
    CheckCircle,
    AlertCircle,
    User,
    CreditCard,
    ArrowLeft,
    Calendar
} from 'lucide-react';
import Link from 'next/link';
import QRDisplayModal from '@/components/ui/QRDisplayModal';

// --- Interfaces ---
interface Contract {
    MaHD: string;
    HoTen: string;
    NgayVay: string;
    SoTienVay: number;
    KyDong: number;
    LaiSuat: number; // For TC: Fixed period interest. For TG: Total interest? Need to check context
    SoLanTra?: number; // Only for TraGop
    TrangThai: string;
    contract_type: 'tin_chap' | 'tra_gop';
}

interface PaymentScheduleItem {
    MaHD: string;
    Ngay: string;
    SoTien: number;
    TienDaTra: number | null; // API might return this
    TrangThaiThanhToan: string;
    days_until_due: number;
}

// Payment Data Structure for Modal
interface PaymentData {
    maHD: string;
    totalAmountDue: number; // Tổng nợ cần trả (Overdue + Current Period)
    periodAmount: number;   // Số tiền 1 kỳ (cho hint partial payment)
}

export default function PaymentPage() {
    const { user } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal States
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [activePayment, setActivePayment] = useState<PaymentData | null>(null);
    const [qrModal, setQrModal] = useState<{ isOpen: boolean; qrUrl: string | null; amount: number; maHD: string; note?: string }>({
        isOpen: false, qrUrl: null, amount: 0, maHD: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const headers = { ...getAuthHeaders(), accept: 'application/json' };
            const [contractsRes, scheduleRes] = await Promise.all([
                fetch(createApiUrl(API_CONFIG.ENDPOINTS.DEBTOR_CONTRACTS), { headers }),
                fetch(createApiUrl(API_CONFIG.ENDPOINTS.DEBTOR_SCHEDULE), { headers }),
            ]);

            const [contractsData, scheduleData] = await Promise.all([
                contractsRes.json(),
                scheduleRes.json(),
            ]);

            if (contractsData.success && contractsData.data) {
                const tinChapContracts = (contractsData.data.tin_chap || []).map((c: any) => ({ ...c, contract_type: 'tin_chap' }));
                const traGopContracts = (contractsData.data.tra_gop || []).map((c: any) => ({ ...c, contract_type: 'tra_gop' }));
                setContracts([...tinChapContracts, ...traGopContracts]);
            }

            if (scheduleData.success) {
                // Ensure schedule items have 'SoTien' and 'days_until_due'
                setSchedule(scheduleData.data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculatePaymentInfo = (contract: Contract) => {
        // 1. Calculate Period Amount (tienCanThanhToanTheoKy)
        let periodAmount = 0;
        if (contract.contract_type === 'tin_chap') {
            // For TinChap, LaiSuat is usually the fixed interest amount per period
            periodAmount = contract.LaiSuat;
        } else {
            // For TraGop: (SoTienVay + LaiSuat) / SoLanTra
            // Note: LaiSuat in TraGop model might be total interest. 
            // Based on generic modal logic: (Total + Interest) / Periods
            const total = Number(contract.SoTienVay) + Number(contract.LaiSuat);
            const periods = Number(contract.SoLanTra || 1);
            periodAmount = Math.ceil(total / periods);
        }

        // 2. Calculate Total Due (tongTienCanThanhToan)
        // Sum of all unpaid items in schedule for this contract
        // Adjust for partial payments if backend provides 'TienDaTra' in schedule items
        // The /debtor/schedule endpoint returns items with 'ThanhToan == False'
        // But does it include 'TienDaTra'? Let's assume the interface matches LichSuTraLai model

        const contractSchedule = schedule.filter(s => s.MaHD === contract.MaHD);

        // Sum (SoTien - TienDaTra)
        const totalDue = contractSchedule.reduce((sum, item) => {
            const amount = Number(item.SoTien);
            const paid = Number(item.TienDaTra || 0);
            return sum + Math.max(0, amount - paid);
        }, 0);

        return { periodAmount, totalDue };
    };

    const handleOpenPayment = (contract: Contract) => {
        const { periodAmount, totalDue } = calculatePaymentInfo(contract);

        if (totalDue <= 0) {
            alert("Hợp đồng này hiện không có khoản nợ cần thanh toán.");
            return;
        }

        setActivePayment({
            maHD: contract.MaHD,
            totalAmountDue: totalDue,
            periodAmount: periodAmount
        });
        setPaymentModalOpen(true);
    };

    const handleProcessPayment = async (maHD: string | number, amount: number) => {
        try {
            const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
            const res = await fetch(createApiUrl('/debtor/generate-qr'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ ma_hd: maHD, amount: amount })
            });
            const data = await res.json();

            if (data.success) {
                const totalDue = activePayment?.totalAmountDue || 0;
                const paymentNote = amount >= totalDue ? "Thanh toán toàn bộ" : "Thanh toán một phần";

                setQrModal({
                    isOpen: true,
                    maHD: maHD.toString(),
                    amount: amount,
                    qrUrl: data.data.qr_url,
                    note: paymentNote
                });
            } else {
                alert('Lỗi: ' + data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Lỗi kết nối');
            throw err;
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-500 rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/debtor" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Thanh toán khoản vay</h1>
                    <p className="text-slate-500">Chọn hợp đồng để thực hiện thanh toán</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {contracts.map(contract => {
                    const { totalDue } = calculatePaymentInfo(contract);
                    const hasDebt = totalDue > 0;

                    return (
                        <div key={contract.MaHD} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                            <div className={`h-2 ${hasDebt ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${contract.contract_type === 'tin_chap' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                            }`}>
                                            {contract.contract_type === 'tin_chap' ? <FileText className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{contract.MaHD}</h3>
                                            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
                                                {contract.contract_type === 'tin_chap' ? 'Tín chấp' : 'Trả góp'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-md text-xs font-bold ${hasDebt ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                        }`}>
                                        {hasDebt ? 'Cần thanh toán' : 'Đã thanh toán'}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Tổng nợ cần trả</span>
                                        <span className={`font-bold ${hasDebt ? 'text-amber-600' : 'text-slate-700'}`}>
                                            {formatCurrency(totalDue)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Kỳ thanh toán</span>
                                        <span className="font-semibold text-slate-700">
                                            {contract.contract_type === 'tin_chap'
                                                ? `${contract.KyDong} ngày/kỳ`
                                                : `${contract.SoLanTra || '?'} lần`}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleOpenPayment(contract)}
                                    disabled={!hasDebt}
                                    className="mt-auto w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    {hasDebt ? 'Thanh toán ngay' : 'Không có nợ'}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {contracts.length === 0 && !isLoading && (
                    <div className="col-span-full text-center py-12 text-slate-500">
                        Bạn chưa có hợp đồng nào.
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {activePayment && (
                <PaymentModal
                    isOpen={paymentModalOpen}
                    onClose={() => setPaymentModalOpen(false)}
                    paymentId={activePayment.maHD}
                    paymentAmount={activePayment.totalAmountDue}
                    tienCanThanhToanTheoKy={activePayment.periodAmount}
                    onPaymentSuccess={() => {
                        // QR Modal will open automatically onProcessPayment success
                        // We might want to refresh data here later if needed
                    }}
                    onProcessPayment={(id, amount) => handleProcessPayment(id, amount)}
                />
            )}

            {/* QR Result Modal */}
            <QRDisplayModal
                isOpen={qrModal.isOpen}
                onClose={() => {
                    setQrModal(prev => ({ ...prev, isOpen: false }));
                    fetchData(); // Refresh data after payment flow likely completed
                }}
                data={qrModal}
            />
        </div>
    );
}
