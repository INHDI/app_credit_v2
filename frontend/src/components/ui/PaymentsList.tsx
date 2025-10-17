"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { getDuePriority, getDueStatusClass, getPayStatusClass } from "@/utils/statusHelpers";

interface PaymentRecord {
  Stt?: number | string;
  id?: number | string;
  Ngay?: string;
  ngay_tra_lai?: string;
  NoiDung?: string;
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
  const sorted = [...safeItems].sort((a, b) => {
    const pa = getDuePriority(a.TrangThaiNgayThanhToan || "");
    const pb = getDuePriority(b.TrangThaiNgayThanhToan || "");
    if (pa !== pb) return pa - pb;
    const da = new Date(a.Ngay || (a as any).ngay_tra_lai || 0).getTime();
    const db = new Date(b.Ngay || (b as any).ngay_tra_lai || 0).getTime();
    return db - da;
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

        const id = (payment as any).Stt ?? payment.id ?? idx;
        const dateStr = new Date(payment.Ngay || (payment as any).ngay_tra_lai).toLocaleDateString('vi-VN');

        return (
          <div key={`payments-list-${id}`} className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs sm:text-sm font-semibold text-blue-600">{String(id)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{dateStr}</p>
                  <p className="text-xs sm:text-sm text-slate-600 truncate">{payment.NoiDung}</p>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">Số tiền: {formatCurrency(Number(soTien))} | Đã trả: {formatCurrency(Number(daTra))}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Badge className={`${payClass} border-0 font-medium px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex-shrink-0`}>{payment.TrangThaiThanhToan}</Badge>
                <Badge className={`${dueClass} border-0 font-medium px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex-shrink-0`}>{payment.TrangThaiNgayThanhToan}</Badge>
                {onPayClick && !isPaid && !disablePay && (
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


