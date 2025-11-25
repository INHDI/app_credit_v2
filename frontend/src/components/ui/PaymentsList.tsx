"use client";

import { useState, ChangeEvent } from "react";
import Modal from "@/components/ui/Modal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { getDuePriority, getDueStatusClass, getPayStatusClass } from "@/utils/statusHelpers";
import { updatePaymentHistory } from "@/services/paymentApi";

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
  contractId: string;
  contractStatus: string;
  items: PaymentRecord[];
  disablePayWhen?: (record: PaymentRecord) => boolean;
  onEditSuccess?: () => void;
  onPayClick?: (id: number | string, remain: number) => void;
}

export default function PaymentsList({
  contractId,
  contractStatus,
  items,
  disablePayWhen,
  onEditSuccess,
  onPayClick,
}: PaymentsListProps) {
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string>("");
  const [resultModal, setResultModal] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const safeItems = Array.isArray(items) ? items : [];
  
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
    <>
    <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
      {sorted.map((payment, idx) => {
        const payClass = getPayStatusClass(payment.TrangThaiThanhToan || '');
        const dueClass = getDueStatusClass(payment.TrangThaiNgayThanhToan || '');

        const soTien = (payment as any).SoTien ?? payment.so_tien_lai ?? 0;
        const daTra = (payment as any).TienDaTra ?? payment.so_tien_tra ?? 0;
        const remain = Math.max(0, Number(soTien) - Number(daTra));
        const disablePay = disablePayWhen ? disablePayWhen(payment) : (payment.TrangThaiNgayThanhToan === 'Quá hạn' || payment.TrangThaiNgayThanhToan === 'Quá kỳ đóng lãi');

        const displayId = idx + 1; // STT hiển thị bắt đầu từ 1
        const id = (payment as any).Stt ?? payment.id ?? idx; // ID thực để gửi data
        const paymentDate = new Date(payment.Ngay || (payment as any).ngay_tra_lai);
        const dateStr = paymentDate.toLocaleDateString('vi-VN');
        const isToday = paymentDate.toDateString() === new Date().toDateString();
        
        return (
          <div key={`payments-list-${id}`} className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs sm:text-sm font-semibold text-blue-600">{String(displayId)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{dateStr}</p>
                  <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                    {formatPaymentContent(payment.NoiDung || payment.ghi_chu || '')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Badge className={`${payClass} border-0 font-medium px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex-shrink-0`}>{payment.TrangThaiThanhToan}</Badge>
                <Badge className={`${dueClass} border-0 font-medium px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex-shrink-0`}>{payment.TrangThaiNgayThanhToan}</Badge>
                {/* {onPayClick && !contractStatus.includes("Đã tất toán") && !disablePay && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg px-2 sm:px-3 py-1 text-xs flex-shrink-0"
                    onClick={() => onPayClick(id, remain)}
                  >
                    Thanh toán
                  </Button>
                )} */}
                {!contractStatus.includes("Đã tất toán") && isToday && (
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-2 sm:px-3 py-1 text-xs flex-shrink-0"
                    onClick={() => {
                      const currentPaid = Number((payment as any).TienDaTra ?? payment.so_tien_tra ?? 0);
                      setEditAmount(String(currentPaid));
                      setFieldError("");
                      setEditingPayment(payment);
                    }}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Sửa</span>
                    <span className="sm:hidden">Sửa</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>

      {editingPayment && (
        <Modal
          isOpen={true}
          onClose={() => {
            setEditingPayment(null);
            setEditAmount("");
            setFieldError("");
          }}
          title="Chỉnh sửa số tiền đã trả"
          size="sm"
        >
          <div className="space-y-4 p-4">
            <div>
              <p className="text-sm text-slate-600">Kỳ thanh toán</p>
              <p className="text-base font-semibold text-slate-800">
                {new Date(editingPayment.Ngay || (editingPayment as any).ngay_tra_lai).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="editAmount">
                Số tiền đã trả
              </label>
              <Input
                id="editAmount"
                type="text"
                value={editAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const cleaned = raw.replace(/[^0-9]/g, "");
                  setEditAmount(cleaned);
                  setFieldError("");
                }}
                placeholder="Nhập số tiền"
              />
              {fieldError && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {fieldError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingPayment(null);
                  setEditAmount("");
                  setFieldError("");
                }}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button
                onClick={async () => {
                  if (!editingPayment) return;
                  const parsedAmount = Number(editAmount);
                  if (isNaN(parsedAmount) || parsedAmount < 0) {
                    setFieldError("Vui lòng nhập số tiền hợp lệ");
                    return;
                  }
                  if (!contractId) {
                    setFieldError("Không xác định được hợp đồng để cập nhật");
                    return;
                  }
                  setSubmitting(true);
                  setFieldError("");
                  try {
                    await updatePaymentHistory(contractId, parsedAmount);
                    setEditingPayment(null);
                    setEditAmount("");
                    setResultModal({
                      type: "success",
                      message: "Cập nhật số tiền đã trả thành công.",
                    });
                    onEditSuccess?.();
                  } catch (error) {
                    console.error("Failed to update payment", error);
                    setResultModal({
                      type: "error",
                      message: "Có lỗi xảy ra khi cập nhật. Vui lòng thử lại.",
                    });
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Lưu
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {resultModal && (
        <Modal
          isOpen={true}
          onClose={() => setResultModal(null)}
          title={resultModal.type === "success" ? "Thành công" : "Thông báo lỗi"}
          size="sm"
        >
          <div className="p-4 space-y-4">
            <p className="text-sm text-slate-700">{resultModal.message}</p>
            <div className="flex justify-end">
              <Button onClick={() => setResultModal(null)}>Đóng</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}


