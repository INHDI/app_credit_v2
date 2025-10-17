"use client";

import { useState } from 'react';
import GenericContractModal from '@/components/ui/GenericContractModal';
import { getContractConfig } from '@/config/contractConfigs';
import { ContractType } from '@/types/contract';
import { TraGopFormData } from '@/types/contract';
import { createContractWithPaymentHistory } from '@/services/contractApi';

interface AddTraGopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: TraGopFormData) => void;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
}

export default function AddTraGopModal({ 
  isOpen, 
  onClose, 
  onSave, 
  loading = false,
  error,
  success
}: AddTraGopModalProps) {
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);

  const config = getContractConfig(ContractType.TRA_GOP);

  // Handle save with API calls
  const handleSave = async (data: TraGopFormData) => {
    try {
      setApiLoading(true);
      setApiError(null);
      setApiSuccess(null);

      console.log('Creating Tra Gop contract with payment history...', data);
      
      // Create contract and payment history in one call
      const { contractResponse, paymentResponse } = await createContractWithPaymentHistory('tra-gop', data);

      console.log('Tra Gop contract created:', contractResponse.data);
      console.log('Payment history created:', paymentResponse.data);

      const maHD = contractResponse.data.MaHD;
      const recordsCreated = paymentResponse.data.records_created;

      // Success message
      setApiSuccess(`Tạo hợp đồng trả góp thành công! Mã HD: ${maHD} (${recordsCreated} kỳ thanh toán)`);
      
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
      console.error('Error creating Tra Gop contract:', err);
      setApiError(err.message || 'Có lỗi xảy ra khi tạo hợp đồng trả góp');
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
