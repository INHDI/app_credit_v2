"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { CreditContract } from "@/hooks/useTinChap";
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
// import { getTraLaiByContract } from '@/apis/traLaiTinChap-api';
// import { TraLaiTinChapResponse } from '@/models/tinChap';
import PaymentModal from '@/components/ui/PaymentModal';
import { payInterestByRecord, payPrincipalTinChap } from '@/services/paymentApi';
import PrincipalPaymentModal from '@/components/ui/PrincipalPaymentModal';
import PaymentsList from '@/components/ui/PaymentsList';

interface TinChapDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: CreditContract | null;
  onRefresh?: () => void;
  lichSuTraLai?: any[];
}

export default function TinChapDetailModal({ 
  isOpen, 
  onClose, 
  contract,
  onRefresh,
  lichSuTraLai
}: TinChapDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{id: number, amount: number} | null>(null);

  // Fetch payment history when modal opens - sử dụng lichSuTraLai từ props hoặc API
  useEffect(() => {
    if (isOpen && contract) {
      if (lichSuTraLai && lichSuTraLai.length > 0) {
        // Sử dụng data từ props
        setPaymentHistory(lichSuTraLai.map((item: any) => ({
          ...item,
          TrangThaiThanhToan: item.TrangThaiThanhToan || item.trang_thai,
          TrangThaiNgayThanhToan: item.TrangThaiNgayThanhToan || item.trang_thai_ngay,
        })));
        setLoading(false);
      } else {
        // Fallback: không có data
        setPaymentHistory([]);
        setLoading(false);
      }
    }
  }, [isOpen, contract, lichSuTraLai]);

  // Function mở modal thanh toán
  const handlePayment = (paymentId: number, paymentAmount: number) => {
    setSelectedPayment({ id: paymentId, amount: paymentAmount });
    setPaymentModalOpen(true);
  };

  // Function xử lý sau khi thanh toán thành công
  const handlePaymentSuccess = () => {
    // Gọi callback refresh nếu có
    if (onRefresh) {
      onRefresh();
    }
  };

  const processPaymentInterest = async (paymentId: number, amount: number) => {
    await payInterestByRecord(paymentId, amount);
  };

  const [principalModalOpen, setPrincipalModalOpen] = useState(false);

  if (!contract) return null;

  // Chỉ hiển thị thông tin cơ bản
  const totalAmount = contract.SoTienVay || contract.tong_tien_vay || 0;

  // Tab configuration
  const tabs = [
    { id: "overview", label: "Thông tin vay", icon: FileText },
    { id: "payments", label: "Lịch sử trả lãi", icon: CalendarDays },
  ];

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
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{contract.MaHD || contract.ma_hop_dong}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 truncate">{contract.HoTen || contract.ten_khach_hang}</p>
                  </div>
                </div>
                <Badge className={`${
                  contract.TrangThai === 'Chưa thanh toán' 
                    ? 'bg-amber-100 text-amber-700' 
                    : contract.TrangThai === 'Đã thanh toán'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                } border-0 font-medium px-3 sm:px-4 py-1 sm:py-2 rounded-full shadow-sm text-xs sm:text-sm flex-shrink-0 self-start sm:self-auto`}>
                  {contract.TrangThai || contract.status}
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
                    <span className="font-medium text-slate-800 text-sm sm:text-base truncate">{contract.HoTen || contract.ten_khach_hang}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-600">Mã hợp đồng</label>
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-white rounded-lg border border-emerald-100">
                    <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                    <span className="font-medium text-slate-800 text-sm sm:text-base truncate">{contract.MaHD || contract.ma_hop_dong}</span>
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
                      Tín chấp
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-600">Ngày vay</label>
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-white rounded-lg border border-amber-100">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                    <span className="font-medium text-slate-800 text-sm sm:text-base truncate">{contract.NgayVay || contract.ngay_vay || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-600">Lãi suất</label>
                  <div className="flex items-center gap-2 p-2 sm:p-3 bg-white rounded-lg border border-amber-100">
                    <span className="font-medium text-slate-800 text-sm sm:text-base truncate">{formatCurrency(contract.LaiSuat || contract.lai_suat || 0)} / kỳ</span>
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
                    <p className="text-sm sm:text-lg font-bold text-green-700 truncate">{formatCurrency(contract.LaiDaTra || contract.total_interest_paid || 0)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-2">
                  <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 bg-purple-100 rounded-lg p-1 sm:p-1.5 flex-shrink-0" />
                  <div className="text-right min-w-0 flex-1 ml-2">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Lãi còn lại</p>
                    <p className="text-sm sm:text-lg font-bold text-purple-700 truncate">{formatCurrency(contract.LaiConLai || contract.daily_interest || 0)}</p>
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
                <span className="truncate">Lịch sử trả lãi tín chấp</span>
              </h4>
              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-slate-600 mt-2 text-sm sm:text-base">Đang tải lịch sử...</p>
                </div>
              ) : (
                <PaymentsList
                  items={paymentHistory as any}
                  onPayClick={(id, remain) => handlePayment(Number(id), remain)}
                  disablePayWhen={(p) => p.TrangThaiNgayThanhToan === 'Quá hạn' || p.TrangThaiNgayThanhToan === 'Quá kỳ đóng lãi'}
                />
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200">
              <h4 className="text-lg font-bold text-slate-800 mb-4">
                {tabs.find(tab => tab.id === activeTab)?.label || "Thông tin"}
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
      title="Chi tiết hợp đồng tín chấp"
      size="xl"
      className="max-h-[95vh] sm:max-h-[90vh]"
    >
      {/* Tab Navigation - Responsive */}
      <div className="px-3 sm:px-6 pt-4 border-b border-slate-200">
        <div className="flex overflow-x-auto scrollbar-hide" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={`tinchap-tab-${tab.id}`}
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
        <Button
          onClick={() => setPrincipalModalOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg px-4 sm:px-8 text-sm flex-1 sm:flex-none"
        >
          Thanh toán gốc
        </Button>
      </div>

      {contract && (
        <PrincipalPaymentModal
          isOpen={principalModalOpen}
          onClose={() => setPrincipalModalOpen(false)}
          maHopDong={(contract as any).MaHD || (contract as any).ma_hop_dong}
          remainingPrincipal={(contract as any).GocConLai || 0}
          onPaymentSuccess={() => { onRefresh && onRefresh(); }}
          onProcessPayment={async (amount) => {
            const maHD = (contract as any).MaHD || (contract as any).ma_hop_dong;
            await payPrincipalTinChap(maHD, amount);
          }}
        />
      )}

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
          onProcessPayment={processPaymentInterest}
        />
      )}
    </Modal>
  );
}