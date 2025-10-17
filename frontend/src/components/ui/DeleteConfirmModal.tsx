"use client";

import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { deleteTinChapContract, deleteTraGopContract, deletePaymentHistoryByContract } from "@/services/deleteApi";
import { useState } from "react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  maHopDong?: string;
  tenKhachHang?: string;
  onConfirm?: () => void | Promise<void>;
  loai?: 'tin_chap' | 'tra_gop';
  afterDeleted?: () => void | Promise<void>;
}

export default function DeleteConfirmModal({ isOpen, onClose, maHopDong, tenKhachHang, onConfirm, loai = 'tin_chap', afterDeleted }: DeleteConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      setError("");
      if (!maHopDong) return;
      if (loai === 'tin_chap') {
        await deleteTinChapContract(maHopDong);
      } else {
        await deleteTraGopContract(maHopDong);
      }
      await deletePaymentHistoryByContract(maHopDong);
      if (onConfirm) await onConfirm();
      if (afterDeleted) await afterDeleted();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Xóa hợp đồng thất bại');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xác nhận xóa" size="md">
      <div className="p-6">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-lg bg-red-50 p-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-slate-800 font-medium">Bạn có chắc muốn xóa hợp đồng này?</p>
            <p className="text-sm text-slate-600 mt-1">
              Mã hợp đồng: <span className="font-semibold">{maHopDong}</span>
              {tenKhachHang ? (
                <>
                  <span className="mx-2">•</span>Khách hàng: <span className="font-semibold">{tenKhachHang}</span>
                </>
              ) : null}
            </p>
            <p className="text-sm text-slate-500 mt-2">Hành động này sẽ xóa cả lịch sử thanh toán liên quan và không thể hoàn tác.</p>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button
            variant="destructive"
            className="rounded-xl flex items-center bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang xóa...
              </>
            ) : (
              <>Xóa</>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


