"use client";

import Modal from "@/components/ui/Modal";
import PaymentsList from "@/components/ui/PaymentsList";
import PaymentModal from "@/components/ui/PaymentModal";
import { useState } from "react";
import { payInterestByRecord } from "@/services/paymentApi";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lịch sử trả lãi - ${contract.ma_hop_dong}`}
      size="lg"
    >
      <div className="p-4">
        <PaymentsList 
          items={items}
          onPayClick={(id, remain) => handleOpenPayment(id, remain)}
          disablePayWhen={(p) => p.TrangThaiNgayThanhToan === 'Quá hạn' || p.TrangThaiNgayThanhToan === 'Quá kỳ đóng lãi'}
        />
      </div>
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
    </Modal>
  );
}


