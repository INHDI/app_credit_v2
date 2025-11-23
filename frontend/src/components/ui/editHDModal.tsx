"use client";

import { useState, useEffect, useMemo } from 'react';
import GenericContractModal from '@/components/ui/GenericContractModal';
import EditContractStatusModal from '@/components/ui/EditContractStatusModal';
import { getContractConfig } from '@/config/contractConfigs';
import { ContractType } from '@/types/contract';
import { TinChapFormData, TraGopFormData } from '@/types/contract';
import { updateContractWithPaymentHistory, updateContractCustomerName } from '@/services/contractApi';

interface EditHDModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractType: 'tin-chap' | 'tra-gop';
  contract: any; // The contract data to edit
  onSuccess?: () => void;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
}

type StatusModalState = {
  isOpen: boolean;
  status: 'loading' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
};

export default function EditHDModal({ 
  isOpen, 
  onClose, 
  contractType,
  contract,
  onSuccess,
  loading = false,
  error,
  success
}: EditHDModalProps) {
  const [statusModal, setStatusModal] = useState<StatusModalState>({
    isOpen: false,
    status: 'loading',
    message: '',
    details: undefined
  });

  // Helper to detect whether contract already has any payment
  const hasPaymentHistory = useMemo(() => {
    if (!contract) return false;
    const normalizeNumber = (value: unknown) => {
      if (typeof value === "number") return value;
      if (typeof value === "string") return parseFloat(value) || 0;
      return 0;
    };
    const interestPaid =
      normalizeNumber(contract.LaiDaTra) ||
      normalizeNumber((contract as any).DaThanhToan) ||
      normalizeNumber((contract as any).tien_da_tra);
    const principalPaid =
      normalizeNumber(contract.SoTienTraGoc) ||
      normalizeNumber((contract as any).so_tien_tra_goc);
    const historyPaid =
      Array.isArray(contract.LichSuTraLai) &&
      contract.LichSuTraLai.some(
        (ls: any) => normalizeNumber(ls?.TienDaTra ?? ls?.so_tien_tra) > 0
      );
    return interestPaid > 0 || principalPaid > 0 || historyPaid;
  }, [contract]);

  const maHD = contract?.MaHD || (contract as any)?.ma_hop_dong || "";

  // Get the appropriate config based on contract type
  const config = getContractConfig(
    contractType === 'tin-chap' ? ContractType.TIN_CHAP : ContractType.TRA_GOP
  );

  // Update modal title and default values for edit mode
  // Use useMemo to recreate config when contract changes
  const editConfig = useMemo(() => {
    if (!contract) return config;
    
    // Parse date properly - handle both Date objects and string formats
    let ngayVay = new Date();
    if (contract.NgayVay) {
      if (contract.NgayVay instanceof Date) {
        ngayVay = contract.NgayVay;
      } else if (typeof contract.NgayVay === 'string') {
        // Handle YYYY-MM-DD format from backend
        ngayVay = new Date(contract.NgayVay + 'T00:00:00');
      }
    }
    
    // Add read-only MaHD field at the beginning
    const maHDField = {
      key: 'ma_hd',
      label: 'Mã hợp đồng',
      type: 'text' as const,
      placeholder: 'Mã hợp đồng',
      required: false,
      disabled: true, // Read-only field
    };
    
    const lockedFields = [maHDField, ...config.fields].map((field) => {
      if (hasPaymentHistory && !['ho_ten', 'ma_hd'].includes(field.key)) {
        return { ...field, disabled: true };
      }
      return field;
    });

    return {
      ...config,
      title: contractType === 'tin-chap' ? 'Chỉnh sửa hợp đồng tín chấp' : 'Chỉnh sửa hợp đồng trả góp',
      fields: lockedFields,
      defaultValues: {
        ma_hd: contract.MaHD || '',
        ho_ten: contract.HoTen || '',
        ngay_vay: ngayVay,
        so_tien_vay: contract.SoTienVay || 0,
        ky_dong: contract.KyDong || 0,
        lai_suat: contract.LaiSuat || 0,
        so_lan_tra: contract.SoLanTra || 0, // Only for TraGop
      }
    };
  }, [contract, config, contractType, hasPaymentHistory]);

  // Handle save with API calls
  const handleSave = async (data: TinChapFormData | TraGopFormData) => {
    if (!contract || !maHD) {
      return;
    }
    const renameOnly = hasPaymentHistory;
    
    try {
      const pendingMessage = renameOnly
        ? 'Đang cập nhật tên khách hàng...'
        : 'Đang cập nhật hợp đồng...';
      setStatusModal({
        isOpen: true,
        status: 'loading',
        message: pendingMessage,
        details: `Mã hợp đồng: ${maHD}\nVui lòng chờ trong giây lát.`
      });
      
      if (renameOnly) {
        const newName = (data as TinChapFormData).ho_ten;
        await updateContractCustomerName(contractType, maHD, newName);
        setStatusModal({
          isOpen: true,
          status: 'success',
          message: 'Cập nhật tên khách hàng thành công!',
          details: `Mã hợp đồng: ${maHD}\nTên mới: ${newName}`
        });
      } else {
        const { paymentResponse } = await updateContractWithPaymentHistory(
          contractType,
          maHD,
          data
        );
        const recordsCreated = paymentResponse.data.records_created;
        setStatusModal({
          isOpen: true,
          status: 'success',
          message: 'Cập nhật hợp đồng thành công!',
          details: `Mã hợp đồng: ${maHD}\nĐã tạo ${recordsCreated} kỳ thanh toán mới\n\nHợp đồng ${contractType === 'tin-chap' ? 'tín chấp' : 'trả góp'} đã được cập nhật và lịch thanh toán đã được làm mới.`
        });
      }
      
      // Đóng edit modal ngay
      onClose();
      
      // Chờ 1s rồi mới refresh data (để người dùng thấy thông báo success trước)
      setTimeout(async () => {
        // Refresh data (WebSocket sẽ tự động update, nhưng gọi callback để chắc chắn)
        if (onSuccess) {
          await onSuccess();
        }
      }, 1000);
      
      // Đóng status modal sau 2.5s
      setTimeout(() => {
        setStatusModal((prev: StatusModalState) => ({ ...prev, isOpen: false }));
      }, 2500);

    } catch (err: any) {
      console.error(`Error updating ${contractType} contract:`, err);
      
      // Display detailed error message
      const errorMessage = err.message || `Có lỗi xảy ra khi cập nhật hợp đồng ${contractType === 'tin-chap' ? 'tín chấp' : 'trả góp'}`;
      
      if (!hasPaymentHistory && (errorMessage.includes('thanh toán') || errorMessage.includes('VNĐ'))) {
        setStatusModal({
          isOpen: true,
          status: 'error',
          message: 'Không thể chỉnh sửa hợp đồng!',
          details: `${errorMessage}\n\n💡 Lý do: Hợp đồng này đã có khoản thanh toán.\n\n✅ Giải pháp:\n• Hoàn tất tất toán hợp đồng trước\n• Hoặc tạo hợp đồng mới thay vì sửa`
        });
      } else {
        setStatusModal({
          isOpen: true,
          status: 'error',
          message: renameOnly ? 'Không thể cập nhật tên khách hàng!' : 'Lỗi cập nhật hợp đồng!',
          details: errorMessage
        });
      }
    }
  };

  // Không reset status modal khi edit modal đóng - để status modal tự quản lý
  // useEffect(() => {
  //   if (!isOpen) {
  //     setStatusModal((prev: StatusModalState) => ({ ...prev, isOpen: false }));
  //   }
  // }, [isOpen]);

  const handleCloseStatusModal = () => {
    setStatusModal((prev: StatusModalState) => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      <GenericContractModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={handleSave}
        loading={loading}
        error={error}
        success={success}
        config={editConfig}
      />

      {/* Status modal độc lập, không bị ảnh hưởng bởi edit modal */}
      <EditContractStatusModal
        isOpen={statusModal.isOpen}
        onClose={handleCloseStatusModal}
        status={statusModal.status}
        message={statusModal.message}
        details={statusModal.details}
        autoCloseDelay={statusModal.status === 'success' ? 2500 : undefined}
        showCloseButton={statusModal.status !== 'loading'}
      />
    </>
  );
}
