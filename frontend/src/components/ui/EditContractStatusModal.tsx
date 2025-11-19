"use client";

import { useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

type StatusType = 'loading' | 'success' | 'error' | 'warning';

interface EditContractStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: StatusType;
  title?: string;
  message?: string;
  details?: string;
  onConfirm?: () => void;
  confirmText?: string;
  showCloseButton?: boolean;
  autoCloseDelay?: number; // milliseconds
}

export default function EditContractStatusModal({
  isOpen,
  onClose,
  status,
  title,
  message,
  details,
  onConfirm,
  confirmText = 'Đóng',
  showCloseButton = true,
  autoCloseDelay
}: EditContractStatusModalProps) {
  
  // Auto close on success - chỉ đóng modal này, không trigger reload
  useEffect(() => {
    if (isOpen && status === 'success' && autoCloseDelay) {
      const timer = setTimeout(() => {
        // Chỉ đóng modal status, không làm gì khác
        onClose();
      }, autoCloseDelay);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isOpen, status, autoCloseDelay, onClose]);

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: Loader2,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: title || 'Đang xử lý...',
          iconClassName: 'animate-spin'
        };
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: title || 'Thành công!',
          iconClassName: ''
        };
      case 'error':
        return {
          icon: XCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: title || 'Lỗi!',
          iconClassName: ''
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          title: title || 'Cảnh báo!',
          iconClassName: ''
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={status === 'loading' ? () => {} : onClose}
      title=""
      size="md"
      className="max-h-[90vh]"
    >
      <>
        <div className="p-6 sm:p-8">
        {/* Icon and Title */}
        <div className="flex flex-col items-center text-center">
          <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-full p-4 mb-4`}>
            <IconComponent className={`h-12 w-12 ${config.iconColor} ${config.iconClassName}`} />
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">
            {config.title}
          </h3>
          
          {/* Main Message */}
          {message && (
            <p className="text-base text-slate-600 mb-4 max-w-md">
              {message}
            </p>
          )}
          
          {/* Details */}
          {details && (
            <div className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4 mt-2 max-w-md w-full text-left`}>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {details}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showCloseButton && status !== 'loading' && (
          <div className="flex justify-center gap-3 mt-6">
            {onConfirm ? (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="rounded-xl px-6"
                >
                  Hủy
                </Button>
                <Button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl px-6"
                >
                  {confirmText}
                </Button>
              </>
            ) : (
              <Button
                onClick={onClose}
                className={`rounded-xl px-8 ${
                  status === 'success'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                    : status === 'error'
                    ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                }`}
              >
                {confirmText}
              </Button>
            )}
          </div>
        )}
        </div>
      </>
    </Modal>
  );
}

