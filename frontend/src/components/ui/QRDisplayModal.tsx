import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { API_CONFIG, createApiUrl } from '@/config/config';
import { getAuthHeaders } from '@/services/authApi';

interface QRDisplayModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        qrUrl: string | null;
        amount: number;
        maHD: string;
        note?: string;
    };
    onPaymentConfirmed?: () => void;
    onConfirmPayment?: (maHD: string, amount: number) => Promise<void>;
}

const QRDisplayModal: React.FC<QRDisplayModalProps> = ({ isOpen, onClose, data, onPaymentConfirmed, onConfirmPayment }) => {
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !data) return null;

    const handleConfirmPayment = async () => {
        if (isConfirming || confirmed) return;

        setIsConfirming(true);
        setError(null);

        try {
            if (onConfirmPayment) {
                // Use custom confirmation handler (e.g., for principal payment)
                await onConfirmPayment(data.maHD, data.amount);
                setConfirmed(true);
                if (onPaymentConfirmed) {
                    onPaymentConfirmed();
                }
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                // Default: call interest payment confirm API
                const paymentMethod = data.note || "Chuyển khoản";
                const response = await fetch(
                    createApiUrl(`/lich-su-tra-lai/confirm-payment/${data.maHD}?so_tien=${data.amount}&hinh_thuc_thanh_toan=${encodeURIComponent(paymentMethod)}`),
                    {
                        method: 'POST',
                        headers: {
                            ...getAuthHeaders(),
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const result = await response.json();

                if (result.success) {
                    setConfirmed(true);
                    if (onPaymentConfirmed) {
                        onPaymentConfirmed();
                    }
                    setTimeout(() => {
                        onClose();
                    }, 2000);
                } else {
                    setError(result.message || 'Có lỗi xảy ra khi xác nhận thanh toán');
                }
            }
        } catch (err) {
            console.error('Payment confirmation error:', err);
            setError('Không thể kết nối tới server');
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-6 text-white text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                        <span className="text-xl">×</span>
                    </button>
                    <h3 className="text-xl font-bold mb-1">Quét mã để thanh toán</h3>
                    <p className="text-teal-100 text-sm">Sử dụng ứng dụng ngân hàng của bạn</p>
                </div>
                <div className="p-8 flex flex-col items-center">
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 mb-6 relative group">
                        {data.qrUrl ? (
                            <img
                                src={data.qrUrl}
                                alt="QR Payment"
                                className="w-64 h-64 object-contain rounded-lg"
                            />
                        ) : (
                            <div className="w-64 h-64 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-400">
                                <div className="w-12 h-12 border-4 border-slate-300 border-t-teal-500 rounded-full animate-spin mb-3"></div>
                                <p>Đang tạo mã QR...</p>
                            </div>
                        )}
                    </div>
                    <div className="w-full space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Số tiền thanh toán</span>
                                <span className="font-bold text-teal-600 text-lg">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.amount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Nội dung</span>
                                <span className="font-mono font-medium text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 text-xs">
                                    {data.note === "Thanh toán toàn bộ gốc"
                                        ? `THANH TOAN TOAN BO GOC HD ${data.maHD}`
                                        : data.note === "Thanh toán một phần gốc"
                                            ? `THANH TOAN MOT PHAN GOC HD ${data.maHD}`
                                            : data.note === "Tất toán toàn bộ"
                                                ? `TAT TOAN TOAN BO HD ${data.maHD}`
                                                : data.note === "Tất toán một phần"
                                                    ? `TAT TOAN MOT PHAN HD ${data.maHD}`
                                                    : `THANH TOAN HD ${data.maHD}`
                                    }
                                </span>
                            </div>
                        </div>

                        {/* Confirm Payment Button */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleConfirmPayment}
                            disabled={isConfirming || confirmed}
                            className={`w-full py-4 rounded-2xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${confirmed
                                ? 'bg-emerald-500 cursor-default'
                                : isConfirming
                                    ? 'bg-slate-400 cursor-wait'
                                    : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 active:scale-[0.98] shadow-lg shadow-teal-500/30'
                                }`}
                        >
                            {confirmed ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    Đã xác nhận thanh toán!
                                </>
                            ) : isConfirming ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    Tôi đã thanh toán
                                </>
                            )}
                        </button>

                        <p className="text-center text-xs text-slate-400">
                            Nhấn xác nhận sau khi đã hoàn tất chuyển khoản qua ngân hàng
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRDisplayModal;
