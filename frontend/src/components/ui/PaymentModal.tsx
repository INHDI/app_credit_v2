"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/formatters";
// import { processPayment } from "@/apis/traLaiTinChap-api";
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId: number;
  paymentAmount: number;
  onPaymentSuccess: () => void;
  onProcessPayment?: (paymentId: number, amount: number) => Promise<void>;
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  paymentId,
  paymentAmount,
  onPaymentSuccess,
  onProcessPayment
}: PaymentModalProps) {
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const parsedPartial = Math.max(0, parseFloat(partialAmount) || 0);
  const cappedPartial = Math.min(parsedPartial, paymentAmount);
  const remainingAfterPartial = Math.max(0, paymentAmount - cappedPartial);

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    
    try {
      let amountToPay = paymentAmount;
      
      if (paymentType === 'partial') {
        const parsedAmount = parsedPartial;
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          setError('Vui lòng nhập số tiền hợp lệ');
          return;
        }
        if (parsedAmount > paymentAmount) {
          setError('Số tiền thanh toán không được vượt quá số tiền lãi');
          return;
        }
        amountToPay = parsedAmount;
      }

      // Gọi API thanh toán với số tiền
      if (onProcessPayment) {
        await onProcessPayment(paymentId, amountToPay);
      } else {
            // await processPayment(paymentId, amountToPay);
            console.log('Processing payment:', paymentId, amountToPay);
      }
      
      onPaymentSuccess();
      onClose();
    } catch (error) {
      setError('Có lỗi xảy ra khi thanh toán');
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPaymentType('full');
    setPartialAmount('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Thanh toán lãi"
      size="md"
      className="max-h-[100vh] sm:max-h-[90vh]"
    >
      <div className="p-6 space-y-6 overflow-y-auto">
        {/* Thông tin thanh toán (match reference UI) */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/90 flex items-center justify-center shadow-sm">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Số tiền cần thanh toán</p>
              <p className="text-2xl font-bold text-blue-700 leading-7">{formatCurrency(paymentAmount)}</p>
            </div>
          </div>
        </div>

        {/* Chọn loại thanh toán */}
        <div className="space-y-4">
          <label className="text-base font-semibold text-slate-800">Chọn hình thức thanh toán</label>
          
          {/* Thanh toán hết */}
          <button
            type="button"
            role="radio"
            aria-checked={paymentType === 'full'}
            className={`w-full text-left p-4 border-2 rounded-xl cursor-pointer transition-colors duration-150 focus:outline-none ${
              paymentType === 'full' 
                ? 'border-emerald-500 bg-emerald-50 shadow-sm' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            onClick={() => setPaymentType('full')}
          >
            <div className="flex items-center gap-3">
              <span className={`relative w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentType === 'full' ? 'border-emerald-500' : 'border-slate-300'}`}>
                {paymentType === 'full' && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
              </span>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">Thanh toán toàn bộ</h4>
                <p className="text-sm text-slate-600">Thanh toán đầy đủ {formatCurrency(paymentAmount)}</p>
              </div>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </button>

          {/* Thanh toán một phần */}
          <button
            type="button"
            role="radio"
            aria-checked={paymentType === 'partial'}
            className={`w-full text-left p-4 border-2 rounded-xl cursor-pointer transition-colors duration-150 focus:outline-none ${
              paymentType === 'partial' 
                ? 'border-blue-500 bg-blue-50 shadow-sm' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            onClick={() => setPaymentType('partial')}
          >
            <div className="flex items-center gap-3">
              <span className={`relative w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentType === 'partial' ? 'border-blue-500' : 'border-slate-300'}`}>
                {paymentType === 'partial' && <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
              </span>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">Thanh toán một phần</h4>
                <p className="text-sm text-slate-600">Thanh toán một số tiền nhỏ hơn tổng số tiền cần trả</p>
              </div>
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
          </button>
        </div>

        {/* Nhập số tiền (chỉ hiển thị khi chọn thanh toán một phần) */}
        {paymentType === 'partial' && (
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 duration-200">
            <label htmlFor="partialAmount" className="text-sm font-medium text-slate-700">
              Số tiền thanh toán
            </label>
            <div className="relative">
              <Input
                id="partialAmount"
                type="number"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder={`Nhập số tiền (≤ ${formatCurrency(paymentAmount)})`}
                className="pr-16 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                min="0"
                max={paymentAmount}
                step="1000"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-500 font-medium">
                VNĐ
              </div>
            </div>
            <div className="text-xs text-slate-500">Sau thanh toán còn: <span className="font-medium text-slate-800">{formatCurrency(remainingAfterPartial)}</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-slate-200">
                <span className="text-slate-600">Sẽ thanh toán</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Math.min(parsedPartial || 0, paymentAmount))}</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-slate-200">
                <span className="text-slate-600">Còn lại</span>
                <span className={`font-semibold ${ (parsedPartial || 0) >= paymentAmount ? 'text-green-600' : 'text-slate-900' }`}>
                  {formatCurrency(remainingAfterPartial)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Hiển thị lỗi */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 h-11 border-slate-300 text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            onClick={handlePayment}
            disabled={loading || (paymentType === 'partial' && (!partialAmount || parseFloat(partialAmount) <= 0))}
            className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang xử lý...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Xác nhận thanh toán
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
