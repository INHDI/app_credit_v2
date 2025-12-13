"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditContract } from "@/hooks/useTinChap";
// import { getTraLaiByContract } from '@/apis/traLaiTinChap-api';
// import { TraLaiTinChapResponse } from '@/models/tinChap';
import { payInterestByContract, getPaymentHistoryByContract } from '@/services/paymentApi';
import { useWebSocketEvents } from '@/hooks/useWebSocket';
import { WebSocketEventType } from '@/types/websocket';
import GenericContractDetailModal from "@/components/ui/GenericContractDetailModal";
import { ContractDetailData, ContractDetailType, PaymentHistoryItem } from "@/types/contractDetail";
import { getContractDetailConfig } from "@/config/contractDetailConfigs";

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
  const config = getContractDetailConfig(ContractDetailType.TIN_CHAP);
  const mappedContract: ContractDetailData | null = contract
    ? {
        id: contract.MaHD,
        ma_hop_dong: contract.MaHD,
        ten_khach_hang: contract.HoTen,
        customerInfo: `Kỳ đóng: ${contract.KyDong} ngày`,
        ngay_vay: contract.NgayVay,
        tong_tien_vay: contract.SoTienVay,
        lai_suat: `${contract.LaiSuat}`,
        kieu_lai_suat: 'kỳ',
        total_interest_paid: contract.LaiDaTra || 0,
        // unpaid_amount: contract.ConLai || 0,
        amount_to_collect: undefined,
        daily_interest: contract.LaiSuat,
        status: contract.TrangThai || 'Không xác định',
        so_ky_tra: contract.KyDong,
        statusColor: (contract.TrangThai || '').includes('tất toán')
          ? 'bg-emerald-100 text-emerald-700'
          : (contract.TrangThai || '').includes('một phần')
          ? 'bg-blue-100 text-blue-700'
          : 'bg-amber-100 text-amber-700',
        GocConLai: contract.GocConLai, 
      }
    : null;
  // Load payment history for Tin Chap (prefer data from contract if available)
  const mapHistoryItems = (items: any[] = []): PaymentHistoryItem[] =>
    items.map((item: any) => ({
      id: item.Stt,
      ngay_tra_lai: item.Ngay,
      so_tien_lai: item.SoTien,
      so_tien_tra: item.TienDaTra,
      trang_thai: item.TrangThaiThanhToan,
      TrangThaiThanhToan: item.TrangThaiThanhToan,
      TrangThaiNgayThanhToan: item.TrangThaiNgayThanhToan,
      ghi_chu: item.NoiDung,
      NoiDung: item.NoiDung,
      created_at: item.created_at,
      ThanhToan: item.ThanhToan,
      SuaLichSu: item.SuaLichSu,
    }));

  const loadPaymentHistory = useCallback(async (maHopDong: string): Promise<PaymentHistoryItem[]> => {
    try {
      const response = await getPaymentHistoryByContract(maHopDong);
      const raw = Array.isArray(response?.data) ? response.data : [];
      if (raw.length > 0) {
        return mapHistoryItems(raw);
      }
    } catch (error) {
      console.error('Error loading Tin Chap payment history:', error);
    }

    if (contract?.LichSuTraLai && Array.isArray(contract.LichSuTraLai)) {
      return mapHistoryItems(contract.LichSuTraLai);
    }
    return [];
  }, [contract?.LichSuTraLai]);

  // Process payment for Tin Chap
  const processTinChapPayment = async (maHD: string, amount: number): Promise<void> => {
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
        onProcessPayment={processTinChapPayment}
      />
    );
  }
