"use client";

import Modal from "@/components/ui/Modal";
import PaymentsList from "@/components/ui/PaymentsList";
import PaymentModal from "@/components/ui/PaymentModal";
import { useState } from "react";
import { payInterestByRecord } from "@/services/paymentApi";
import { CalendarDays } from "lucide-react";

interface NoPhaiThuDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: { ma_hop_dong: string; raw?: any } | null;
  onRefresh?: () => void;
}

export default function NoPhaiThuDetailModal({ isOpen, onClose, contract, onRefresh }: NoPhaiThuDetailModalProps) {
  if (!isOpen || !contract) return null;

  const items = Array.isArray(contract.raw?.LichSuTraLai) ? contract.raw.LichSuTraLai : [];

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{ id: number; amount: number } | null>(null);

  const handleOpenPayment = (id: number, amount: number) => {
    setSelectedPayment({ id, amount });
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
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
              items={items}
              onPayClick={(id, remain) => handleOpenPayment(id, remain)}
              disablePayWhen={(p) => p.TrangThaiNgayThanhToan === 'Quá hạn' || p.TrangThaiNgayThanhToan === 'Quá kỳ đóng lãi'}
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
        />
      )}
    </>
  );
}


