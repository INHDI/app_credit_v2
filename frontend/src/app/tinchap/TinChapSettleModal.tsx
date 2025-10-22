"use client";

import SettleConfirmModal from "@/components/ui/SettleConfirmModal";

interface TinChapSettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: any;
  onRefresh?: () => void;
}

export default function TinChapSettleModal({ 
  isOpen, 
  onClose, 
  contract, 
  onRefresh 
}: TinChapSettleModalProps) {
  return (
    <SettleConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      maHopDong={contract?.MaHD}
      tenKhachHang={contract?.HoTen}
      onSettled={onRefresh}
      paymentHistory={contract?.LichSuTraLai}
      contractType="tin_chap"
      contract={{
        SoTienVay: contract?.SoTienVay,
        LaiConLai: contract?.LaiConLai,
        TongTienVayVaLai: contract?.TongTienVayVaLai
      }}
    />
  );
}