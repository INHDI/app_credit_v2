"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { payFullByContract } from "@/services/paymentApi";

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
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    if (!contract?.MaHD) return;
    setLoading(true);
    try {
      // Call API to settle the contract
      const response = await payFullByContract(contract.MaHD);
      
      if (response.success) {
        setDone(true);
        setTimeout(() => {
          onClose();
          onRefresh && onRefresh();
          setDone(false);
        }, 800);
      } else {
        throw new Error(response.message || 'Tất toán thất bại');
      }
    } catch (error) {
      console.error('Error settling contract:', error);
      alert('Tất toán thất bại: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận tất toán hợp đồng tín chấp"
      size="md"
    >
      <div className="p-6 space-y-6">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <p className="text-sm text-slate-700">
              Hành động này sẽ đánh dấu tất cả các kỳ chưa thanh toán của hợp đồng tín chấp là "đã thanh toán".
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Thông tin hợp đồng
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-600">Mã hợp đồng</div>
              <div className="font-medium text-slate-800">{contract?.MaHD || '-'}</div>
            </div>
            <div>
              <div className="text-slate-600">Khách hàng</div>
              <div className="font-medium text-slate-800">{contract?.HoTen || '-'}</div>
            </div>
            <div>
              <div className="text-slate-600">Số tiền vay</div>
              <div className="font-semibold text-blue-700">
                {contract?.SoTienVay ? formatCurrency(contract.SoTienVay) : '-'}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Lãi còn lại</div>
              <div className="font-bold text-red-700">
                {contract?.LaiConLai ? formatCurrency(contract.LaiConLai) : '-'}
              </div>
            </div>
          </div>
        </div>

        {done && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 font-medium">Đã tất toán thành công</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border-slate-200 hover:bg-slate-50 px-6"
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-xl shadow-lg px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
          >
            {loading ? 'Đang tất toán...' : 'Xác nhận tất toán'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}