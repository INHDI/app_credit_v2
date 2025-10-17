"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/utils/formatters";
import { 
  Calendar, 
  Clock, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface PaymentHistoryItem {
  id: string;
  thoi_gian: string;
  so_tien: number;
  so_tien_tra: number;
  trang_thai: boolean;
  noi_dung: string;
  created_at?: string;
  updated_at?: string;
  // Tra Gop specific fields
  Stt?: number;
  MaHD?: string;
  Ngay?: string;
  SoTien?: number;
  NoiDung?: string;
  TrangThaiThanhToan?: string;
  TrangThaiNgayThanhToan?: string;
  TienDaTra?: number;
}

interface PaymentScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: any; // CreditContract type
}

export default function PaymentScheduleModal({
  isOpen,
  onClose,
  contract
}: PaymentScheduleModalProps) {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [nextPayment, setNextPayment] = useState<PaymentHistoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [contractInfo, setContractInfo] = useState<any>(null);

  // Load payment schedule from contract data
  useEffect(() => {
    if (!isOpen) return;
    if (!contract?.MaHD && !contract?.ma_hop_dong) return;
    setLoading(true);
    try {
      // Set contract info
      setContractInfo({
        ma_hop_dong: contract.MaHD || contract.ma_hop_dong,
        ten_khach_hang: contract.HoTen || contract.ten_khach_hang,
      });

      // Process LichSuTraLai from contract data
      if (contract.LichSuTraLai && Array.isArray(contract.LichSuTraLai)) {
        const items: PaymentHistoryItem[] = contract.LichSuTraLai.map((item: any) => ({
          id: `${contract.MaHD || contract.ma_hop_dong}-${item.Stt}`,
          thoi_gian: item.Ngay,
          so_tien: item.SoTien,
          so_tien_tra: item.TienDaTra || 0,
          trang_thai: item.TrangThaiThanhToan === 'Đóng đủ' || item.TrangThaiThanhToan === 'Đã tất toán',
          noi_dung: item.NoiDung,
          // Keep original Tra Gop fields
          Stt: item.Stt,
          MaHD: item.MaHD,
          Ngay: item.Ngay,
          SoTien: item.SoTien,
          NoiDung: item.NoiDung,
          TrangThaiThanhToan: item.TrangThaiThanhToan,
          TrangThaiNgayThanhToan: item.TrangThaiNgayThanhToan,
          TienDaTra: item.TienDaTra,
        }));
        setPaymentHistory(items);

        // Find next payment - prioritize "Chưa đến hạn" status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const nextPaymentItem = items
          .filter((item) => {
            const paymentDate = new Date(item.thoi_gian);
            paymentDate.setHours(0, 0, 0, 0);
            return paymentDate >= today && item.so_tien_tra < item.so_tien;
          })
          .filter((item) => item.TrangThaiNgayThanhToan === 'Chưa đến hạn')
          .sort((a, b) => new Date(a.thoi_gian).getTime() - new Date(b.thoi_gian).getTime())[0] || null;
        
        setNextPayment(nextPaymentItem);
      } else {
        // Fallback to empty data
        setPaymentHistory([]);
        setNextPayment(null);
      }
    } finally {
      setLoading(false);
    }
  }, [isOpen, contract?.MaHD, contract?.ma_hop_dong, contract?.HoTen, contract?.ten_khach_hang, contract?.LichSuTraLai]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilPayment = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = new Date(dateString);
    paymentDate.setHours(0, 0, 0, 0);
    
    const diffTime = paymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hôm nay";
    if (diffDays === 1) return "Ngày mai";
    if (diffDays < 0) return `${Math.abs(diffDays)} ngày trước`;
    return `${diffDays} ngày nữa`;
  };

  const getStatusColor = (daysUntil: string, trangThaiNgay?: string) => {
    // Priority: TrangThaiNgayThanhToan over days calculation
    if (trangThaiNgay === 'Quá hạn') return "text-red-600 bg-red-50 border-red-200 animate-pulse";
    if (trangThaiNgay === 'Quá kỳ đóng lãi') return "text-red-600 bg-red-50 border-red-200 animate-pulse";
    if (trangThaiNgay === 'Đến hạn') return "text-indigo-600 bg-indigo-50 border-indigo-200";
    if (trangThaiNgay === 'Chưa đến hạn') return "text-blue-600 bg-blue-50 border-blue-200";
    
    // Fallback to days calculation
    if (daysUntil === "Hôm nay") return "text-red-600 bg-red-50 border-red-200";
    if (daysUntil.includes("ngày trước")) return "text-red-600 bg-red-50 border-red-200";
    if (daysUntil === "Ngày mai") return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lịch thanh toán tiếp theo"
      size="lg"
    >
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <span className="ml-3 text-slate-600">Đang tải lịch thanh toán...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Contract Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Thông tin hợp đồng
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Mã hợp đồng</span>
                  </div>
                  <p className="font-bold text-lg text-slate-800">{contractInfo?.ma_hop_dong || contract?.MaHD || contract?.ma_hop_dong}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Khách hàng</span>
                  </div>
                  <p className="font-bold text-lg text-slate-800">{contractInfo?.ten_khach_hang || contract?.HoTen || contract?.ten_khach_hang}</p>
                </div>
              </div>
              
              {/* Additional contract details if available */}
              {(contract?.NgayVay || contract?.SoTienVay || contract?.KyDong) && (
                <div className="mt-4 pt-4 border-t border-blue-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    {contract?.NgayVay && (
                      <div>
                        <span className="text-slate-600">Ngày vay:</span>
                        <p className="font-medium text-slate-800">{new Date(contract.NgayVay).toLocaleDateString('vi-VN')}</p>
                      </div>
                    )}
                    {contract?.SoTienVay && (
                      <div>
                        <span className="text-slate-600">Số tiền vay:</span>
                        <p className="font-medium text-slate-800">{formatCurrency(contract.SoTienVay)}</p>
                      </div>
                    )}
                    {contract?.KyDong && (
                      <div>
                        <span className="text-slate-600">Kỳ đóng:</span>
                        <p className="font-medium text-slate-800">{contract.KyDong} ngày</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Next Payment Info */}
            {nextPayment ? (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
                <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-emerald-600" />
                  Kỳ thanh toán tiếp theo
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Ngày thanh toán:</span>
                    <span className="font-semibold text-slate-800">{formatDate(nextPayment.thoi_gian)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Thời gian còn lại:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(getDaysUntilPayment(nextPayment.thoi_gian), nextPayment.TrangThaiNgayThanhToan)}`}>
                      {nextPayment.TrangThaiNgayThanhToan || getDaysUntilPayment(nextPayment.thoi_gian)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Số tiền cần trả:</span>
                    <span className="font-bold text-lg text-emerald-700">
                      {formatCurrency(nextPayment.so_tien)}
                    </span>
                  </div>
                  
                  {nextPayment.so_tien_tra > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Đã trả:</span>
                      <span className="font-medium text-blue-600">
                        {formatCurrency(nextPayment.so_tien_tra)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Còn lại:</span>
                    <span className="font-bold text-lg text-red-600">
                      {formatCurrency(nextPayment.so_tien - nextPayment.so_tien_tra)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Nội dung:</span>
                    <span className="font-medium text-slate-800">{nextPayment.noi_dung}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-green-700 mb-2">Tất cả đã thanh toán!</h4>
                <p className="text-green-600">Không còn kỳ thanh toán nào chờ xử lý.</p>
              </div>
            )}


            {/* Upcoming Payments List - Show payments with "Chưa đến hạn" status */}
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              const upcomingPayments = paymentHistory
                .filter(item => {
                  const paymentDate = new Date(item.thoi_gian);
                  paymentDate.setHours(0, 0, 0, 0);
                  return paymentDate >= today && item.so_tien_tra < item.so_tien;
                })
                .filter(item => item.TrangThaiNgayThanhToan === 'Chưa đến hạn')
                .sort((a, b) => new Date(a.thoi_gian).getTime() - new Date(b.thoi_gian).getTime());
              
              return upcomingPayments.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    Các kỳ thanh toán chưa đến hạn
                  </h4>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {upcomingPayments
                      .slice(0, 5) // Chỉ hiển thị 5 kỳ gần nhất
                      .map((item, index) => (
                        <div key={`payment-schedule-${item.id}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-amber-700">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{formatDate(item.thoi_gian)}</p>
                              <p className="text-sm text-slate-600">{item.noi_dung}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-amber-700">{formatCurrency(item.so_tien - item.so_tien_tra)}</p>
                            <p className={`text-xs px-2 py-1 rounded-full ${getStatusColor(getDaysUntilPayment(item.thoi_gian), item.TrangThaiNgayThanhToan)}`}>
                              {item.TrangThaiNgayThanhToan || getDaysUntilPayment(item.thoi_gian)}
                            </p>
                            {item.so_tien_tra > 0 && (
                              <p className="text-xs text-blue-500">Đã trả: {formatCurrency(item.so_tien_tra)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
        <Button
          variant="outline"
          onClick={onClose}
          className="rounded-xl border-slate-200 hover:bg-slate-50 px-6"
        >
          Đóng
        </Button>
      </div>
    </Modal>
  );
}
