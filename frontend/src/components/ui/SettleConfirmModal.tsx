"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { payFullByContract } from "@/services/paymentApi";

interface PaymentHistoryItem {
  id: string;
  thoi_gian: string;
  so_tien: number;
  so_tien_tra: number;
  trang_thai: boolean;
  noi_dung: string;
}

interface SettleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  maHopDong: string | undefined;
  tenKhachHang?: string;
  onSettled?: () => void;
  // For Tra Gop: Pass payment history data
  paymentHistory?: any[];
}

export default function SettleConfirmModal({
  isOpen,
  onClose,
  maHopDong,
  tenKhachHang,
  onSettled,
  paymentHistory,
}: SettleConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isOpen || !maHopDong) return;
    setHistoryLoading(true);
    try {
      // For Tra Gop: Use actual payment history if provided
      if (paymentHistory && Array.isArray(paymentHistory)) {
        const mappedItems: PaymentHistoryItem[] = paymentHistory.map((item: any) => ({
          id: `${maHopDong}-${item.Stt}`,
          thoi_gian: item.Ngay,
          so_tien: item.SoTien,
          so_tien_tra: item.TienDaTra || 0,
          trang_thai: item.TrangThaiThanhToan === 'Đóng đủ' || item.TrangThaiThanhToan === 'Đã tất toán',
          noi_dung: item.NoiDung,
        }));
        setItems(mappedItems);
      } else {
        // Fallback to mock data for Tin Chap
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        const mock = Array.from({ length: 8 }, (_, i) => {
          const d = new Date(base);
          d.setMonth(base.getMonth() - 2 + i);
          const so_tien = Math.round(1200000 + Math.random() * 1200000);
          const so_tien_tra = Math.random() > 0.6 ? Math.round(so_tien * Math.random()) : 0;
          return {
            id: `${maHopDong}-${i + 1}`,
            thoi_gian: d.toISOString(),
            so_tien,
            so_tien_tra,
            trang_thai: so_tien_tra >= so_tien,
            noi_dung: `Kỳ ${i + 1} hợp đồng ${maHopDong}`,
          } as PaymentHistoryItem;
        });
        setItems(mock);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [isOpen, maHopDong, paymentHistory]);

  const unpaid = useMemo(() => items.filter((i) => i.so_tien_tra < i.so_tien), [items]);
  const unpaidTotal = useMemo(
    () => unpaid.reduce((sum, i) => sum + (i.so_tien - i.so_tien_tra), 0),
    [unpaid]
  );

  const handleConfirm = async () => {
    if (!maHopDong) return;
    setLoading(true);
    try {
      // Call API to settle the contract
      const response = await payFullByContract(maHopDong);
      
      if (response.success) {
        setDone(true);
        setTimeout(() => {
          onClose();
          onSettled && onSettled();
          setDone(false);
        }, 800);
      } else {
        throw new Error(response.message || 'Tất toán thất bại');
      }
    } catch (error) {
      console.error('Error settling contract:', error);
      // You might want to show an error message to the user here
      alert('Tất toán thất bại: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận tất toán hợp đồng"
      size="md"
    >
      <div className="p-6 space-y-6">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <p className="text-sm text-slate-700">
              Hành động này sẽ đánh dấu tất cả các kỳ chưa thanh toán của hợp đồng là "đã thanh toán".
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
              <div className="font-medium text-slate-800">{maHopDong || '-'}</div>
            </div>
            <div>
              <div className="text-slate-600">Khách hàng</div>
              <div className="font-medium text-slate-800">{tenKhachHang || '-'}</div>
            </div>
            <div>
              <div className="text-slate-600">Số kỳ chưa thanh toán</div>
              <div className="font-semibold text-amber-700">
                {historyLoading ? 'Đang tải...' : unpaid.length}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Số tiền tất toán</div>
              <div className="font-bold text-red-700 text-lg">
                {historyLoading ? 'Đang tải...' : formatCurrency(unpaidTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        {unpaid.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              Chi tiết các kỳ chưa thanh toán
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {unpaid.map((item, index) => (
                <div key={`unpaid-${item.id}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-amber-700">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{new Date(item.thoi_gian).toLocaleDateString('vi-VN')}</p>
                      <p className="text-xs text-slate-600">{item.noi_dung}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-700 text-sm">{formatCurrency(item.so_tien - item.so_tien_tra)}</p>
                    {item.so_tien_tra > 0 && (
                      <p className="text-xs text-slate-500">Đã trả: {formatCurrency(item.so_tien_tra)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            disabled={loading || historyLoading || unpaid.length === 0}
            className="rounded-xl shadow-lg px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
          >
            {loading ? 'Đang tất toán...' : 'Xác nhận tất toán'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


