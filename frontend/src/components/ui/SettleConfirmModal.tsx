"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { AlertTriangle, CheckCircle, FileText, Calculator } from "lucide-react";
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
  contractType?: 'tin_chap' | 'tra_gop';
  // Contract details for calculation
  contract?: {
    SoTienVay?: number;
    LaiConLai?: number;
    TongTienVayVaLai?: number;
  };
}

export default function SettleConfirmModal({
  isOpen,
  onClose,
  maHopDong,
  tenKhachHang,
  onSettled,
  paymentHistory,
  contractType = 'tra_gop',
  contract,
}: SettleConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [done, setDone] = useState(false);
  
  // Settlement amount states
  const [interestInput, setInterestInput] = useState<string>('');

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

  // Calculate settlement amounts
  const principalAmount = contractType === 'tin_chap' 
    ? (contract?.SoTienVay || 0) - (contract?.SoTienTraGoc || 0)  // Gốc còn lại cho tín chấp
    : (contract?.SoTienVay || 0);  // Gốc đầy đủ cho trả góp
  const interestAmount = contract?.LaiConLai || unpaidTotal;
  
  const principalValue = principalAmount; // Sử dụng gốc từ hợp đồng
  const interestValue = parseFloat(interestInput.replace(/[^0-9]/g, '')) || 0;
  const totalSettlementAmount = principalValue + interestValue;

  const handleConfirm = async () => {
    if (!maHopDong) return;
    setLoading(true);
    try {
      // Call API to settle the contract with optional interest amount
      const response = await payFullByContract(maHopDong, interestValue);
      
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

  const contractTypeLabel = contractType === 'tin_chap' ? 'tín chấp' : 'trả góp';
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Xác nhận tất toán hợp đồng ${contractTypeLabel}`}
      size="md"
    >
      <>
        <div className="p-6 space-y-6">

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
            
            {contractType === 'tin_chap' && (
              <div>
                <div className="text-slate-600">Lãi còn lại</div>
                <div className="font-semibold text-orange-700">
                  {formatCurrency(interestAmount)}
                </div>
              </div>
            )}
            <div>
              <div className="text-slate-600">Tổng cần trả</div>
              <div className="font-bold text-red-700 text-lg">
                {contractType === 'tra_gop' 
                  ? formatCurrency(interestAmount)
                  : formatCurrency(principalAmount + interestAmount)
                }
              </div>
            </div>
          </div>
        </div>

        {/* Settlement Input */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            Nhập số tiền lãi tất toán
          </h4>
          
          <div className="space-y-4">
            {/* Gốc cố định - chỉ hiển thị cho tín chấp */}
            {contractType === 'tin_chap' && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Số tiền gốc (VNĐ)
                </label>
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-300">
                  <span className="font-medium text-slate-800">{formatCurrency(principalAmount)}</span>
                </div>
              </div>
            )}
            
            {/* Lãi có thể nhập */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Số tiền lãi (VNĐ)
              </label>
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                placeholder="Nhập số tiền lãi..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Lãi hiện tại: {formatCurrency(interestAmount)} | Để trống = không trả lãi
              </p>
            </div>
          </div>
        </div>

        {/* Settlement Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-blue-600" />
            Tổng kết tất toán
          </h4>
          
          <div className="space-y-2">
            {contractType === 'tin_chap' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Gốc (cố định):</span>
                <span className="text-sm font-medium text-slate-800">
                  {formatCurrency(principalValue)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Lãi:</span>
              <span className="text-sm font-medium text-slate-800">
                {formatCurrency(interestValue)}
              </span>
            </div>
            
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-bold text-slate-800">Tổng cộng:</span>
              <span className="text-lg font-bold text-blue-700">
                {contractType === 'tra_gop' 
                  ? formatCurrency(interestValue)
                  : formatCurrency(totalSettlementAmount)
                }
              </span>
            </div>
            
            {interestValue === 0 && contractType === 'tin_chap' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                <p className="text-xs text-amber-700">
                  ℹ️ Chỉ trả gốc, không trả lãi
                </p>
              </div>
            )}
            
            {interestValue === 0 && contractType === 'tra_gop' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                <p className="text-xs text-amber-700">
                  ℹ️ Không trả lãi
                </p>
              </div>
            )}
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
            disabled={loading || historyLoading}
            className="rounded-xl shadow-lg px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
          >
            {loading ? 'Đang tất toán...' : 'Xác nhận tất toán'}
          </Button>
        </div>
      </div>
      </>
    </Modal>
  );
}


