"use client";

import { useState } from 'react';
import GenericContractModal from '@/components/ui/GenericContractModal';
import { getContractConfig } from '@/config/contractConfigs';
import { ContractType } from '@/types/contract';
import { TinChapFormData } from '@/types/contract';
import { createContractWithPaymentHistory } from '@/services/contractApi';

interface AddTinChapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: TinChapFormData) => void;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
}

export default function AddTinChapModal({ 
  isOpen, 
  onClose, 
  onSave, 
  loading = false,
  error,
  success
}: AddTinChapModalProps) {
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);

  const config = getContractConfig(ContractType.TIN_CHAP);

  // Handle save with API calls
  const handleSave = async (data: TinChapFormData) => {
    try {
      setApiLoading(true);
      setApiError(null);
      setApiSuccess(null);

      console.log('Creating Tin Chap contract with payment history...', data);
      
      // Create contract and payment history in one call
      const { contractResponse, paymentResponse } = await createContractWithPaymentHistory('tin-chap', data);

      console.log('Tin Chap contract created:', contractResponse.data);
      console.log('Payment history created:', paymentResponse.data);

      const maHD = contractResponse.data.MaHD;
      const recordsCreated = paymentResponse.data.records_created;

      // Success message
      setApiSuccess(`Tạo hợp đồng tín chấp thành công! Mã HD: ${maHD} (${recordsCreated} kỳ thanh toán)`);
      
      // Call parent onSave if provided
      if (onSave) {
        await onSave(data);
      }

      // Close modal after delay
      setTimeout(() => {
        onClose();
        setApiSuccess(null);
      }, 2000);

    } catch (err: any) {
      console.error('Error creating Tin Chap contract:', err);
      setApiError(err.message || 'Có lỗi xảy ra khi tạo hợp đồng tín chấp');
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <GenericContractModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      loading={loading || apiLoading}
      error={error || apiError}
      success={success || apiSuccess}
      config={config}
    />
  );
}
