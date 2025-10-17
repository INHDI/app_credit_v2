"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/utils/formatters";
import { 
  User, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  FileText, 
  Hash,
  Receipt,
  CalendarDays,
  CheckCircle
} from 'lucide-react';
import { ContractDetailData, PaymentHistoryItem, DetailTab } from '@/types/contractDetail';
import { ContractDetailConfig } from '@/types/contractDetail';
import PaymentModal from './PaymentModal';

interface GenericContractDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ContractDetailData | null;
  onRefresh?: () => void;
  config: ContractDetailConfig;
  onLoadPaymentHistory?: (maHopDong: string) => Promise<PaymentHistoryItem[]>;
  onProcessPayment?: (paymentId: number, amount: number) => Promise<void>;
}

export default function GenericContractDetailModal({ 
  isOpen, 
  onClose, 
  contract,
  onRefresh,
  config,
  onLoadPaymentHistory,
  onProcessPayment
}: GenericContractDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{id: number, amount: number} | null>(null);

  // Fetch payment history when modal opens
  useEffect(() => {
    if (isOpen && contract?.ma_hop_dong && onLoadPaymentHistory) {
      const loadPaymentHistory = async () => {
        setLoading(true);
        try {
          const data = await onLoadPaymentHistory(contract.ma_hop_dong);
          setPaymentHistory(data);
        } catch (error) {
          console.error('Error loading payment history:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadPaymentHistory();
    }
  }, [isOpen, contract?.ma_hop_dong, onLoadPaymentHistory]);

  // Function mở modal thanh toán
  const handlePayment = (paymentId: number, paymentAmount: number) => {
    setSelectedPayment({ id: paymentId, amount: paymentAmount });
    setPaymentModalOpen(true);
  };

  // Function xử lý sau khi thanh toán thành công
  const handlePaymentSuccess = async () => {
    // Reload payment history
    if (contract?.ma_hop_dong && onLoadPaymentHistory) {
      setLoading(true);
      try {
        const data = await onLoadPaymentHistory(contract.ma_hop_dong);
        setPaymentHistory(data);
      } catch (error) {
        console.error('Error loading payment history:', error);
      } finally {
        setLoading(false);
      }
    }
    
    // Gọi callback refresh nếu có
    if (onRefresh) {
      onRefresh();
    }
  };

  if (!contract) return null;

  // Chỉ hiển thị thông tin cơ bản
  const totalAmount = contract.tong_tien_vay || 0;

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Header Section - Responsive */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{contract.ma_hop_dong}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 truncate">{contract.customerInfo}</p>
                  </div>
                </div>
                <Badge className={`${contract.statusColor} border-0 font-medium px-3 sm:px-4 py-1 sm:py-2 rounded-full shadow-sm text-xs sm:text-sm flex-shrink-0 self-start sm:self-auto`}>
                  {contract.status}
                </Badge>
              </div>
            </div>

            {/* Customer Information - Responsive */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-emerald-200">
              <h4 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
                <span className="truncate">Thông tin khách hàng</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-600">Họ và tên</label>
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-white rounded-lg border border-emerald-100">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                    <span className="font-medium text-slate-800 text-sm sm:text-base truncate">{contract.ten_khach_hang}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-600">Mã hợp đồng</label>
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-white rounded-lg border border-emerald-100">
                    <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                    <span className="font-medium text-slate-800 text-sm sm:text-base truncate">{contract.ma_hop_dong}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Details - Responsive */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-amber-200">
              <h4 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
                <span className="truncate">Chi tiết hợp đồng</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-600">Loại hợp đồng</label>
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-white rounded-lg border border-amber-100">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs sm:text-sm">
                      {config.contractType === 'tin_chap' ? 'Tín chấp' : 'Trả góp'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-600">Ngày vay</label>
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-white rounded-lg border border-amber-100">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                    <span className="font-medium text-slate-800 text-sm sm:text-base truncate">{contract.ngay_vay || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-600">Lãi suất</label>
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-white rounded-lg border border-amber-100">
                    <span className="font-medium text-slate-800 text-sm sm:text-base truncate">{formatCurrency(contract.lai_suat)} / {contract.kieu_lai_suat}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 bg-blue-100 rounded-lg p-1 sm:p-1.5 flex-shrink-0" />
                  <div className="text-right min-w-0 flex-1 ml-2">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Gốc vay</p>
                    <p className="text-sm sm:text-lg font-bold text-blue-700 truncate">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 bg-green-100 rounded-lg p-1 sm:p-1.5 flex-shrink-0" />
                  <div className="text-right min-w-0 flex-1 ml-2">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Lãi đã trả</p>
                    <p className="text-sm sm:text-lg font-bold text-green-700 truncate">{formatCurrency(contract.total_interest_paid || 0)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-2">
                  <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 bg-purple-100 rounded-lg p-1 sm:p-1.5 flex-shrink-0" />
                  <div className="text-right min-w-0 flex-1 ml-2">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Lãi/{contract.kieu_lai_suat}</p>
                    <p className="text-sm sm:text-lg font-bold text-purple-700 truncate">{formatCurrency(contract.daily_interest || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "payments":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
              <h4 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <span className="truncate">Lịch sử trả lãi {config.contractType === 'tin_chap' ? 'tín chấp' : 'trả góp'}</span>
              </h4>
              
              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-slate-600 mt-2 text-sm sm:text-base">Đang tải lịch sử...</p>
                </div>
              ) : paymentHistory.length > 0 ? (
                <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
                  {[...paymentHistory]
                    .sort((a, b) => {
                      // Ưu tiên theo TrangThaiNgayThanhToan: Đến hạn -> Chưa đến hạn -> Quá hạn -> Quá kỳ đóng lãi
                      const getDuePriority = (p: any) => {
                        const s = (p as any).TrangThaiNgayThanhToan || (p as any).trang_thai_ngay || '';
                        if (s === 'Đến hạn') return 0;
                        if (s === 'Chưa đến hạn') return 1;
                        if (s === 'Quá hạn') return 2;
                        if (s === 'Quá kỳ đóng lãi') return 3;
                        return 4;
                      };
                      const priorityA = getDuePriority(a);
                      const priorityB = getDuePriority(b);
                      if (priorityA !== priorityB) return priorityA - priorityB;
                      
                      // Nếu trạng thái giống nhau, sắp xếp theo thời gian tạo từ mới nhất đến cũ nhất
                      const dateA = new Date(a.created_at || a.ngay_tra_lai);
                      const dateB = new Date(b.created_at || b.ngay_tra_lai);
                      return dateB.getTime() - dateA.getTime();
                    })
                    .map((payment, index) => (
                    <div key={`${config.contractType}-detail-payment-${payment.id}`} className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs sm:text-sm font-semibold text-blue-600">{index + 1}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">
                              {new Date(payment.ngay_tra_lai).toLocaleDateString('vi-VN')}
                            </p>
                            {payment.trang_thai !== 'qua_han_tra_lai' && (
                              <p className="text-xs sm:text-sm text-slate-600 truncate">
                                {(() => {
                                  const soTienLai = parseFloat(payment.so_tien_lai?.toString?.() || `${payment.so_tien_lai || 0}`) || 0;
                                  const soTienTra = parseFloat(payment.so_tien_tra?.toString?.() || `${payment.so_tien_tra || 0}`) || 0;
                                  const soTienConLai = Math.max(0, soTienLai - soTienTra);
                                  return `Còn lại: ${formatCurrency(soTienConLai)}`;
                                })()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {/* Tính toán trạng thái từ nhiều nguồn để tương thích */}
                          {(() => {
                            const anyPayment: any = payment as any;
                            const payStatus: string = anyPayment.TrangThaiThanhToan 
                              || (payment.trang_thai === 'da_thanh_toan' || payment.trang_thai === 'TrangThaiThanhToan.DA_THANH_TOAN' ? 'Đóng đủ' : 'Chưa thanh toán');
                            const dueStatus: string = anyPayment.TrangThaiNgayThanhToan || anyPayment.trang_thai_ngay || '';
                            const isPaid = payStatus === 'Đóng đủ' || payStatus === 'Đã tất toán' || payment.trang_thai === 'da_thanh_toan' || payment.trang_thai === 'TrangThaiThanhToan.DA_THANH_TOAN';

                            const payClass = payStatus === 'Đóng đủ' || payStatus === 'Đã tất toán'
                              ? 'bg-green-100 text-green-700'
                              : payStatus === 'Thanh toán một phần'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700';

                            const dueClass = dueStatus === 'Đến hạn'
                              ? 'bg-indigo-100 text-indigo-700'
                              : dueStatus === 'Chưa đến hạn'
                              ? 'bg-slate-100 text-slate-700'
                              : dueStatus === 'Quá kỳ đóng lãi'
                              ? 'bg-red-200 text-red-800 border border-red-300 font-bold animate-pulse'
                              : 'bg-red-200 text-red-800 border border-red-300 font-bold animate-pulse';
                            return (
                              <>
                                <Badge className={`${payClass} border-0 font-medium px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex-shrink-0`}>
                                  {payStatus}
                                </Badge>
                                <Badge className={`${dueClass} border-0 font-medium px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex-shrink-0`}>
                                  {dueStatus || 'Không xác định'}
                                </Badge>
                                {/* Nút thanh toán - chỉ hiển thị khi chưa trả và không quá hạn */}
                                {(!isPaid && dueStatus !== 'Quá hạn' && dueStatus !== 'Quá kỳ đóng lãi') && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const soTienLai = (payment as any).SoTien ?? (parseFloat(payment.so_tien_lai?.toString?.() || `${payment.so_tien_lai || 0}`) || 0);
                                      const soTienTra = (payment as any).TienDaTra ?? (parseFloat(payment.so_tien_tra?.toString?.() || `${payment.so_tien_tra || 0}`) || 0);
                                      const soTienConLai = Math.max(0, soTienLai - soTienTra);
                                      handlePayment(payment.id, soTienConLai);
                                    }}
                                    className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-2 sm:px-3 py-1 text-xs flex-shrink-0"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Thanh toán</span>
                                    <span className="sm:hidden">Trả</span>
                                  </Button>
                                )}
                                {isPaid && (
                                  <Button size="sm" variant="outline" className="rounded-lg px-2 sm:px-3 py-1 text-xs flex-shrink-0" disabled>
                                    Hoàn tác
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                          
                          
                        </div>
                      </div>
                      {payment.ghi_chu && (
                        <div className="mt-2 text-xs sm:text-sm text-slate-600">
                          <strong>Ghi chú:</strong> {payment.ghi_chu}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <CalendarDays className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 text-sm sm:text-base">Chưa có lịch sử trả lãi</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200">
              <h4 className="text-lg font-bold text-slate-800 mb-4">
                {config.tabs.find(tab => tab.id === activeTab)?.label || "Thông tin"}
              </h4>
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Tính năng này đang được phát triển</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      size="xl"
      className="max-h-[95vh] sm:max-h-[90vh]"
    >
      {/* Tab Navigation - Responsive */}
      <div className="px-3 sm:px-6 pt-4 border-b border-slate-200">
        <div className="flex overflow-x-auto scrollbar-hide" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          {config.tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={`${config.contractType}-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-w-0 flex-shrink-0 ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content - Responsive padding */}
      <div className="p-3 sm:p-6 max-h-[60vh] sm:max-h-[80vh] overflow-y-auto">
        {renderTabContent()}
      </div>

      {/* Footer Actions - Responsive */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between sm:justify-end gap-2 sm:gap-4 p-3 sm:p-6 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
        <Button
          variant="outline"
          onClick={onClose}
          className="rounded-xl border-slate-200 hover:bg-slate-50 px-4 sm:px-8 text-sm flex-1 sm:flex-none"
        >
          Đóng
        </Button>
        <Button
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl shadow-lg px-4 sm:px-8 text-sm flex-1 sm:flex-none"
        >
          <span className="hidden sm:inline">In hợp đồng</span>
          <span className="sm:hidden">In</span>
        </Button>
      </div>

      {/* Payment Modal */}
      {selectedPayment && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPayment(null);
          }}
          paymentId={selectedPayment.id}
          paymentAmount={selectedPayment.amount}
          onPaymentSuccess={handlePaymentSuccess}
          onProcessPayment={onProcessPayment}
        />
      )}
    </Modal>
  );
}
