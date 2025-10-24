"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { getDuePriority, getDueStatusClass, getPayStatusClass } from "@/utils/statusHelpers";

// Function to format payment content with proper line breaks
const formatPaymentContent = (content: string) => {
  if (!content) return null;
  
  // Split by "|" and clean up each part
  const parts = content.split('|').map(part => part.trim()).filter(part => part.length > 0);
  
  return parts.map((part, index) => (
    <p key={index} className="truncate">{part}</p>
  ));
};

interface PaymentRecord {
  Stt?: number | string;
  id?: number | string;
  Ngay?: string;
  ngay_tra_lai?: string;
  NoiDung?: string;
  ghi_chu?: string;
  so_tien_lai?: number;
  so_tien_tra?: number;
  SoTien?: number;
  TienDaTra?: number;
  TrangThaiThanhToan?: string;
  TrangThaiNgayThanhToan?: string;
}

interface PaymentsListProps {
  items: PaymentRecord[];
  onPayClick?: (id: number, remain: number) => void;
  disablePayWhen?: (record: PaymentRecord) => boolean;
}

export default function PaymentsList({ items, onPayClick, disablePayWhen }: PaymentsListProps) {
  const safeItems = Array.isArray(items) ? items : [];
  
  // Get today's date for button visibility logic
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Sort: Status priority (Đến hạn > Chưa đến hạn > Quá hạn) then by time (ascending)
  const sorted = [...safeItems].sort((a, b) => {
    const pa = getDuePriority(a.TrangThaiNgayThanhToan || "");
    const pb = getDuePriority(b.TrangThaiNgayThanhToan || "");
    if (pa !== pb) return pa - pb;
    
    // Within same status, sort by time ascending (earliest first)
    const da = new Date(a.Ngay || (a as any).ngay_tra_lai || 0).getTime();
    const db = new Date(b.Ngay || (b as any).ngay_tra_lai || 0).getTime();
    return da - db; // Changed from db - da to da - db for ascending order
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600 text-sm">Chưa có lịch sử trả lãi</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
      {sorted.map((payment, idx) => {
        const isPaid = payment.TrangThaiThanhToan === 'Đóng đủ' || payment.TrangThaiThanhToan === 'Đã tất toán';
        const payClass = getPayStatusClass(payment.TrangThaiThanhToan || '');
        const dueClass = getDueStatusClass(payment.TrangThaiNgayThanhToan || '');

        const soTien = (payment as any).SoTien ?? payment.so_tien_lai ?? 0;
        const daTra = (payment as any).TienDaTra ?? payment.so_tien_tra ?? 0;
        const remain = Math.max(0, Number(soTien) - Number(daTra));
        const disablePay = disablePayWhen ? disablePayWhen(payment) : (payment.TrangThaiNgayThanhToan === 'Quá hạn' || payment.TrangThaiNgayThanhToan === 'Quá kỳ đóng lãi');

        const id = idx + 1; // STT bắt đầu từ 1
        const dateStr = new Date(payment.Ngay || (payment as any).ngay_tra_lai).toLocaleDateString('vi-VN');
        
        // Check if payment date is today for button visibility
        const paymentDate = new Date(payment.Ngay || (payment as any).ngay_tra_lai);
        const paymentDateStr = paymentDate.toISOString().split('T')[0];
        const isToday = paymentDateStr === todayStr;

        return (
          <div key={`payments-list-${id}`} className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs sm:text-sm font-semibold text-blue-600">{String(id)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{dateStr}</p>
                  <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                    {formatPaymentContent(payment.NoiDung || payment.ghi_chu || '')}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">Số tiền: {formatCurrency(Number(soTien))} | Đã trả: {formatCurrency(Number(daTra))}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Badge className={`${payClass} border-0 font-medium px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex-shrink-0`}>{payment.TrangThaiThanhToan}</Badge>
                <Badge className={`${dueClass} border-0 font-medium px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex-shrink-0`}>{payment.TrangThaiNgayThanhToan}</Badge>
                {onPayClick && !disablePay && isToday && (
                  <Button
                    size="sm"
                    onClick={() => onPayClick(Number(id), remain)}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-2 sm:px-3 py-1 text-xs flex-shrink-0"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Thanh toán</span>
                    <span className="sm:hidden">Trả</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


