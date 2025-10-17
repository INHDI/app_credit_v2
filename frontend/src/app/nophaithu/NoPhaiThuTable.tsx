import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, CheckCircle, Eye } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import PaymentModal from "@/components/ui/PaymentModal";
import { payInterestByRecord } from "@/services/paymentApi";
import { getDueStatusClass, getPayStatusClass, getRowHighlightClass } from "@/utils/statusHelpers";
import NoPhaiThuDetailModal from "./NoPhaiThuDetailModal";
import SettleConfirmModal from "@/components/ui/SettleConfirmModal";
import { useState, useMemo } from "react";

interface NoPhaiThuContract {
  id: string;
  ma_hop_dong: string;
  ten_khach_hang: string;
  loai_hop_dong: string;
  ngay_vay: string;
  tong_tien_can_tra: number;
  tien_can_tra_theo_ky: number;
  tongNoChuaTra: number;
  status: string;
  statusColor: string;
  raw?: any;
}

interface NoPhaiThuTableProps {
  contracts: NoPhaiThuContract[];
  startIndex: number;
  itemsPerPage: number;
  onRefresh?: () => void;
}

export default function NoPhaiThuTable({ 
  contracts, 
  startIndex, 
  itemsPerPage, 
  onRefresh 
}: NoPhaiThuTableProps) {
  // Generate unique instance ID for this component instance
  const instanceId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
  
  const [selectedContract, setSelectedContract] = useState<NoPhaiThuContract | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{ id: number; amount: number } | null>(null);

  const handlePaymentClick = (contract: NoPhaiThuContract) => {
    setSelectedContract(contract);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list: any[] = Array.isArray(contract.raw?.LichSuTraLai) ? contract.raw.LichSuTraLai : [];

    const toDateOnly = (d: any): string => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const da = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    };
    const todayStr = toDateOnly(today);

    let record = list.find((it) => toDateOnly(it.Ngay) === todayStr);
    if (!record) {
      record = list.find((it) => it.TrangThaiNgayThanhToan === 'Đến hạn')
        || list.find((it) => it.TrangThaiNgayThanhToan === 'Chưa đến hạn')
        || list[0];
    }
    if (record) {
      const soTien = Number(record.SoTien || 0);
      const daTra = Number(record.TienDaTra || 0);
      const remain = Math.max(0, soTien - daTra);
      setSelectedPayment({ id: Number(record.Stt), amount: remain });
      setShowPaymentModal(true);
    }
  };

  const handleSettleClick = (contract: NoPhaiThuContract) => {
    setSelectedContract(contract);
    setShowSettleModal(true);
  };

  const handleOpenDetail = (contract: NoPhaiThuContract) => {
    setSelectedContract(contract);
    setShowDetailModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedContract(null);
  };

  const handleCloseSettleModal = () => {
    setShowSettleModal(false);
    setSelectedContract(null);
  };

  return (
    <TooltipProvider>
      {/* Desktop/Table view */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 font-semibold text-slate-700 text-sm">STT</th>
              <th className="text-left p-4 font-semibold text-slate-700 text-sm">Mã hợp đồng</th>
              <th className="text-left p-4 font-semibold text-slate-700 text-sm">Khách hàng</th>
              <th className="text-left p-4 font-semibold text-slate-700 text-sm">Loại hợp đồng</th>
              <th className="text-right p-4 font-semibold text-slate-700 text-sm">Tổng phải trả</th>
              <th className="text-right p-4 font-semibold text-slate-700 text-sm">Theo kỳ/ngày</th>
              <th className="text-right p-4 font-semibold text-slate-700 text-sm">Nợ chưa trả</th>
              <th className="text-center p-4 font-semibold text-slate-700 text-sm">Trạng thái</th>
              <th className="text-center p-4 font-semibold text-slate-700 text-sm">Chức năng</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract, index) => {
              const list: any[] = Array.isArray(contract.raw?.LichSuTraLai) ? contract.raw.LichSuTraLai : [];
              const toDateOnly = (d: any): string => {
                const dt = new Date(d);
                dt.setHours(0, 0, 0, 0);
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const da = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${da}`;
              };
              const todayStr = toDateOnly(new Date());
              const todayRec = list.find((it) => toDateOnly(it.Ngay) === todayStr) || null;
              const payStatus = todayRec?.TrangThaiThanhToan || '';
              const dueStatus = todayRec?.TrangThaiNgayThanhToan || '';
              const rowHighlight = getRowHighlightClass(dueStatus);
              const payClass = getPayStatusClass(payStatus);
              const dueClass = getDueStatusClass(dueStatus);
              return (
              <tr 
                key={`nophaithu-table-${instanceId}-${startIndex}-${index}-${contract.id}`} 
                className={`border-b border-slate-100 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-blue-50/30 transition-all duration-200 ${rowHighlight}`}
              >
                <td className="p-4 text-slate-600 font-medium">{startIndex + index + 1}</td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-800 text-sm">{contract.ma_hop_dong}</div>
                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md inline-block">
                      Ngày vay: {new Date(contract.ngay_vay).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-slate-800">{contract.ten_khach_hang}</div>
                </td>
                <td className="p-4">
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 font-medium px-3 py-1 rounded-full">
                    {contract.loai_hop_dong}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 text-sm">{formatCurrency(contract.tong_tien_can_tra)}</div>
                    <div className="text-xs text-slate-500">VNĐ</div>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="space-y-1">
                    <div className="font-bold text-amber-600 text-sm">{formatCurrency(contract.tien_can_tra_theo_ky)}</div>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="font-bold text-red-700">{formatCurrency(contract.tongNoChuaTra)}</div>
                </td>
                <td className="p-4 text-center">
                  {todayRec ? (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Badge className={`${payClass} border-0 font-medium px-3 py-1 rounded-full shadow-sm`}>
                        {payStatus || 'Không xác định'}
                      </Badge>
                      <Badge className={`${dueClass} border-0 font-medium px-3 py-1 rounded-full shadow-sm`}>
                        {dueStatus || 'Không xác định'}
                      </Badge>
                    </div>
                  ) : (
                    <Badge className={`${contract.statusColor} border-0 font-medium px-3 py-1 rounded-full shadow-sm`}>
                      {contract.status}
                    </Badge>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:shadow-sm"
                          aria-label="Xem chi tiết"
                          onClick={() => handleOpenDetail(contract)}
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Xem chi tiết</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 hover:bg-green-50 rounded-lg transition-all duration-200 hover:shadow-sm"
                          aria-label="Đóng tiền"
                          onClick={() => handlePaymentClick(contract)}
                        >
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Đóng tiền</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 hover:bg-emerald-50 rounded-lg transition-all duration-200 hover:shadow-sm"
                          aria-label="Tất toán"
                          onClick={() => handleSettleClick(contract)}
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tất toán</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile/Card view */}
      <div className="space-y-3 md:hidden">
        {contracts.map((contract, index) => {
          const list: any[] = Array.isArray(contract.raw?.LichSuTraLai) ? contract.raw.LichSuTraLai : [];
          const toDateOnly = (d: any): string => {
            const dt = new Date(d);
            dt.setHours(0, 0, 0, 0);
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const da = String(dt.getDate()).padStart(2, '0');
            return `${y}-${m}-${da}`;
          };
          const todayStr = toDateOnly(new Date());
          const todayRec = list.find((it) => toDateOnly(it.Ngay) === todayStr) || null;
          const payStatus = todayRec?.TrangThaiThanhToan || '';
          const dueStatus = todayRec?.TrangThaiNgayThanhToan || '';
          const rowHighlight = getRowHighlightClass(dueStatus);
          const payClass = getPayStatusClass(payStatus);
          const dueClass = getDueStatusClass(dueStatus);
          return (
          <div 
            key={`nophaithu-mobile-${instanceId}-${startIndex}-${index}-${contract.id}`} 
            className={`rounded-xl border border-slate-200 bg-white shadow-sm p-4 ${rowHighlight ? 'ring-1 ring-red-200' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">#{startIndex + index + 1} • {contract.ma_hop_dong}</div>
                <div className="font-semibold text-slate-800">{contract.ten_khach_hang}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Ngày vay: {new Date(contract.ngay_vay).toLocaleDateString('vi-VN')}
                </div>
              </div>
              {todayRec ? (
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`${payClass} border-0 font-medium px-2 py-0.5 rounded-full`}>
                    {payStatus || 'Không xác định'}
                  </Badge>
                  <Badge className={`${dueClass} border-0 font-medium px-2 py-0.5 rounded-full`}>
                    {dueStatus || 'Không xác định'}
                  </Badge>
                </div>
              ) : (
                <Badge className={`${contract.statusColor} border-0 font-medium px-2 py-0.5 rounded-full`}>
                  {contract.status}
                </Badge>
              )}
            </div>
            
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Loại</div>
                <div className="text-sm font-medium text-slate-800">{contract.loai_hop_dong}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Tổng phải trả</div>
                <div className="text-sm font-bold text-slate-800">{formatCurrency(contract.tong_tien_can_tra)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Theo kỳ/ngày</div>
                <div className="text-sm font-bold text-amber-600">{formatCurrency(contract.tien_can_tra_theo_ky)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Nợ chưa trả</div>
                <div className="text-sm font-bold text-red-700">{formatCurrency(contract.tongNoChuaTra)}</div>
              </div>
            </div>
            
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="default" size="sm" className="rounded-lg flex-1">
                <Eye className="h-4 w-4 mr-1" /> Chi tiết
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-lg border-green-200 text-green-700 hover:bg-green-50 flex-1" 
                onClick={() => handlePaymentClick(contract)}
              >
                <DollarSign className="h-4 w-4 mr-1" /> Đóng tiền
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex-1" 
                onClick={() => handleSettleClick(contract)}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Tất toán
              </Button>
            </div>
          </div>
        );})}
      </div>

      {/* Payment Modal */}
      {selectedPayment && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handleClosePaymentModal}
          paymentId={selectedPayment.id}
          paymentAmount={selectedPayment.amount}
          onPaymentSuccess={onRefresh || (() => {})}
          onProcessPayment={async (paymentId, amount) => {
            await payInterestByRecord(paymentId, amount);
          }}
        />
      )}

      <SettleConfirmModal
        isOpen={showSettleModal}
        onClose={handleCloseSettleModal}
        maHopDong={selectedContract?.ma_hop_dong}
        tenKhachHang={selectedContract?.ten_khach_hang}
        onSettled={onRefresh}
        paymentHistory={selectedContract?.raw?.LichSuTraLai}
      />

      <NoPhaiThuDetailModal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedContract(null); }}
        contract={selectedContract as any}
      />
    </TooltipProvider>
  );
}