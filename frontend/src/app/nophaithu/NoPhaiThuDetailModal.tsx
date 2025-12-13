"use client";

import Modal from "@/components/ui/Modal";
import PaymentsList from "@/components/ui/PaymentsList";
import PaymentModal from "@/components/ui/PaymentModal";
import { useState, useCallback, useEffect } from "react";
import { payInterestByRecord, getPaymentHistoryByContract } from "@/services/paymentApi";
import { CalendarDays } from "lucide-react";

interface NoPhaiThuDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: { ma_hop_dong: string; raw?: any; tien_can_tra_theo_ky: number } | null;
  onRefresh?: () => void;
}

export default function NoPhaiThuDetailModal({ isOpen, onClose, contract, onRefresh }: NoPhaiThuDetailModalProps) {
  if (!isOpen || !contract) return null;

  const fallbackHistory = Array.isArray(contract.raw?.LichSuTraLai) ? contract.raw.LichSuTraLai : [];
  let tienCanThanhToanTheoKy = 0;
  if (contract.ma_hop_dong.startsWith("TC")) {
    tienCanThanhToanTheoKy = contract?.tien_can_tra_theo_ky;
  } else {
    tienCanThanhToanTheoKy = (Number(contract?.raw.LaiSuat) + Number(contract?.raw.SoTienVay))/Number(contract?.raw.SoLanTra);
  }

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{ id: number; amount: number } | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>(fallbackHistory);

  const fetchPaymentHistory = useCallback(async () => {
    if (!contract?.ma_hop_dong) return;
    try {
      const response = await getPaymentHistoryByContract(contract.ma_hop_dong);
      const data = Array.isArray(response?.data) ? response.data : [];
      if (data.length > 0) {
        setPaymentHistory(data);
        return;
      }
    } catch (error) {
      console.error("Error fetching NoPhaiThu payment history:", error);
    }
    setPaymentHistory(fallbackHistory);
  }, [contract?.ma_hop_dong, fallbackHistory]);

  useEffect(() => {
    if (isOpen) {
      fetchPaymentHistory();
    }
  }, [isOpen, fetchPaymentHistory]);

  const handleOpenPayment = (id: number, amount: number) => {
    setSelectedPayment({ id, amount });
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    await fetchPaymentHistory();
    if (onRefresh) onRefresh();
  };

  const processPayment = async (paymentId: number, amount: number) => {
    await payInterestByRecord(paymentId, amount);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Lịch sử trả lãi - ${contract.ma_hop_dong}`}
        size="lg"
      >
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
            <h4 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span className="truncate">Lịch sử trả lãi nợ phải thu</span>
            </h4>
            <PaymentsList 
              contractId={contract.ma_hop_dong}
              contractStatus={contract.raw?.TrangThai || ''}
              items={paymentHistory}
              onPayClick={(id, remain) => handleOpenPayment(Number(id), remain)}
              disablePayWhen={(p) => p.TrangThaiNgayThanhToan === 'Quá hạn' || p.TrangThaiNgayThanhToan === 'Quá kỳ đóng lãi'}
              onEditSuccess={handlePaymentSuccess}
            />
          </div>
        </div>
      </Modal>
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
          onProcessPayment={processPayment}
          tienCanThanhToanTheoKy= {tienCanThanhToanTheoKy}
        />
      )}
    </>
  );
}
