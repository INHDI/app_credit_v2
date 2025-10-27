import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { LichSuDetail } from "@/services/lichsuApi";
import { formatDateDisplay, formatCurrency } from "@/lib/utils";

interface LichSuTableProps {
  details: LichSuDetail[];
  startIndex: number;
}

// Get status badge class based on action type
const getStatusClass = (action: string): string => {
  if (action.includes('Tạo hợp đồng')) {
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }
  if (action.includes('Thanh toán lãi')) {
    return 'bg-green-100 text-green-700 border-green-200';
  }
  if (action.includes('Trả gốc')) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
  if (action.includes('Tất toán')) {
    return 'bg-purple-100 text-purple-700 border-purple-200';
  }
  
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

// Get amount color class based on action type
const getAmountClass = (action: string): string => {
  if (action.includes('Tạo hợp đồng')) {
    return 'text-red-600'; // Chi tiền (disbursed)
  }
  if (action.includes('Thanh toán lãi')) {
    return 'text-green-600'; // Thu lãi
  }
  if (action.includes('Trả gốc')) {
    return 'text-emerald-600'; // Thu gốc
  }
  if (action.includes('Tất toán')) {
    return 'text-purple-600'; // Thu tất toán
  }
  
  return 'text-slate-800';
};

// Get contract type badge class
const getContractTypeClass = (type: string): string => {
  if (type === 'TC') {
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }
  if (type === 'TG') {
    return 'bg-orange-100 text-orange-700 border-orange-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export default function LichSuTable({ details, startIndex }: LichSuTableProps) {
  return (
    <>
      <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-emerald-50 border-b border-slate-200 px-6 py-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="h-6 w-6 text-emerald-600" />
          Chi tiết lịch sử
        </h3>
      </div>
      <div className="p-0">
        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-blue-50/95 backdrop-blur">
              <tr className="border-b border-slate-200">
                <th className="text-center p-4 font-semibold text-slate-700 w-16">STT</th>
                <th className="text-left p-4 font-semibold text-slate-700">Ngày</th>
                <th className="text-left p-4 font-semibold text-slate-700">MaHD</th>
                <th className="text-left p-4 font-semibold text-slate-700">Họ tên</th>
                <th className="text-right p-4 font-semibold text-slate-700">Số tiền thanh toán</th>
                <th className="text-center p-4 font-semibold text-slate-700">Loại hợp đồng</th>
                <th className="text-center p-4 font-semibold text-slate-700">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {details.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-500">
                    Không có dữ liệu lịch sử
                  </td>
                </tr>
              ) : (
                details.map((item, index) => (
                  <tr
                    key={`${item.stt}-${index}`}
                    className="border-b border-slate-100 even:bg-slate-50/60 hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="text-center p-4 align-middle font-medium text-slate-600">
                      {startIndex + index + 1}
                    </td>
                    <td className="p-4 align-middle text-slate-700">
                      {formatDateDisplay(item.ngay)}
                    </td>
                    <td className="p-4 align-middle">
                      <span className="font-mono text-sm font-semibold text-blue-600">
                        {item.ma_hd}
                      </span>
                    </td>
                    <td className="p-4 align-middle text-slate-700 font-medium">
                      {item.ho_ten}
                    </td>
                    <td className="text-right p-4 align-middle tabular-nums">
                      <div className={`font-semibold text-base ${getAmountClass(item.trang_thai)}`}>
                        {formatCurrency(item.so_tien_thanh_toan)}
                      </div>
                      <div className="text-xs text-slate-500">VNĐ</div>
                    </td>
                    <td className="text-center p-4 align-middle">
                      <Badge className={`${getContractTypeClass(item.loai_hop_dong)} border font-medium px-3 py-1 rounded-full`}>
                        {item.loai_hop_dong}
                      </Badge>
                    </td>
                    <td className="text-center p-4 align-middle">
                      <Badge className={`${getStatusClass(item.trang_thai)} border font-medium px-3 py-1 rounded-full`}>
                        {item.trang_thai}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 md:hidden p-4">
          {details.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              Không có dữ liệu lịch sử
            </div>
          ) : (
            details.map((item, index) => (
              <div
                key={`${item.stt}-${index}-mobile`}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-500">#{startIndex + index + 1}</span>
                      <span className="font-mono text-sm font-semibold text-blue-600">
                        {item.ma_hd}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800">{item.ho_ten}</div>
                    <div className="text-sm text-slate-500">{formatDateDisplay(item.ngay)}</div>
                  </div>
                  <Badge className={`${getStatusClass(item.trang_thai)} border font-medium px-2.5 py-0.5 rounded-full text-xs`}>
                    {item.trang_thai}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500">Số tiền thanh toán</div>
                    <div className={`font-semibold text-base ${getAmountClass(item.trang_thai)}`}>
                      {formatCurrency(item.so_tien_thanh_toan)}
                    </div>
                    <div className="text-xs text-slate-500">VNĐ</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Loại hợp đồng</div>
                    <Badge className={`${getContractTypeClass(item.loai_hop_dong)} border font-medium px-2 py-0.5 rounded-full text-xs mt-1`}>
                      {item.loai_hop_dong}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

