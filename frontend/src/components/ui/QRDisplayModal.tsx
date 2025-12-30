import React from 'react';

interface QRDisplayModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        qrUrl: string | null;
        amount: number;
        maHD: string;
    };
}

const QRDisplayModal: React.FC<QRDisplayModalProps> = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

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
                                <span className="font-mono font-medium text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                                    THANH TOAN HD {data.maHD}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRDisplayModal;
