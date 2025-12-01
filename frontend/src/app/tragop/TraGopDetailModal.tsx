"use client";

import GenericContractDetailModal from '@/components/ui/GenericContractDetailModal';
import { getContractDetailConfig } from '@/config/contractDetailConfigs';
import { ContractDetailType } from '@/types/contractDetail';
import { ContractDetailData, PaymentHistoryItem } from '@/types/contractDetail';
import type { CreditContract as TraGopContract } from '@/hooks/useTraGop';
import { payInterestByContract } from '@/services/paymentApi';
import { useWebSocketEvents } from '@/hooks/useWebSocket';
import { WebSocketEventType } from '@/types/websocket';
// import { getTraLaiByContract, processPayment } from '@/apis/traLaiTraGop-api';

interface TraGopDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: TraGopContract | null;
  onRefresh?: () => void;
}

export default function TraGopDetailModal({ 
  isOpen, 
  onClose, 
  contract,
  onRefresh
}: TraGopDetailModalProps) {

  // Subscribe to WebSocket payment events for real-time updates
  useWebSocketEvents(
    [
      WebSocketEventType.LICH_SU_TRA_LAI_UPDATED,
      WebSocketEventType.LICH_SU_TRA_LAI_CREATED,
      WebSocketEventType.TIN_CHAP_UPDATED
    ],
    (data, message) => {
      console.log('📡 TinChapDetailModal received WebSocket event:', message.type);
      // Trigger refresh khi có payment events
      if (isOpen && onRefresh) {
        onRefresh();
      }
    },
    isOpen // Only subscribe when modal is open
  );
  const config = getContractDetailConfig(ContractDetailType.TRA_GOP);

  // Map API contract to Generic modal data shape
  const mappedContract: ContractDetailData | null = contract
    ? {
        id: contract.MaHD,
        ma_hop_dong: contract.MaHD,
        ten_khach_hang: contract.HoTen,
        customerInfo: `Kỳ đóng: ${contract.KyDong} ngày • Số lần trả: ${contract.SoLanTra ?? '-'}`,
        ngay_vay: contract.NgayVay,
        tong_tien_vay: contract.SoTienVay,
        lai_suat: `${contract.LaiSuat}`,
        kieu_lai_suat: 'kỳ',
        total_interest_paid: contract.DaThanhToan || 0,
        unpaid_amount: contract.ConLai || 0,
        amount_to_collect: undefined,
        daily_interest: undefined,
        status: contract.TrangThai || 'Không xác định',
        so_ky_tra: contract.SoLanTra,
        statusColor: (contract.TrangThai || '').includes('tất toán')
          ? 'bg-emerald-100 text-emerald-700'
          : (contract.TrangThai || '').includes('một phần')
          ? 'bg-blue-100 text-blue-700'
          : 'bg-amber-100 text-amber-700',
      }
    : null;

  // Load payment history for Tra Gop (prefer data from contract if available)
  const loadPaymentHistory = async (maHopDong: string): Promise<PaymentHistoryItem[]> => {
    try {
      if (contract?.LichSuTraLai && Array.isArray(contract.LichSuTraLai)) {
        return contract.LichSuTraLai.map((item: any) => ({
          id: item.Stt,
          ngay_tra_lai: item.Ngay,
          so_tien_lai: item.SoTien,
          so_tien_tra: item.TienDaTra,
          trang_thai: item.TrangThaiThanhToan,
          // Provide both camel and snake/alt keys for Generic modal compatibility
          TrangThaiThanhToan: item.TrangThaiThanhToan,
          TrangThaiNgayThanhToan: item.TrangThaiNgayThanhToan,
          ghi_chu: item.NoiDung,
          NoiDung: item.NoiDung, // Add NoiDung field for PaymentsList component
          created_at: undefined,
          ThanhToan: item.ThanhToan, // Add ThanhToan field for PaymentsList component
          SuaLichSu: item.SuaLichSu, // Add SuaLichSu field for PaymentsList component
        }));
      }
      // TODO: fallback to API when needed
      return [];
    } catch (error) {
      console.error('Error loading Tra Gop payment history:', error);
      return [];
    }
  };

  // Process payment for Tra Gop
  const processTraGopPayment = async (maHD: string, amount: number): Promise<void> => {
    await payInterestByContract(maHD, amount);
  };

  return (
    <GenericContractDetailModal
      isOpen={isOpen}
      onClose={onClose}
      contract={mappedContract}
      onRefresh={onRefresh}
      config={config}
      onLoadPaymentHistory={loadPaymentHistory}
      onProcessPayment={processTraGopPayment}
    />
  );
}
