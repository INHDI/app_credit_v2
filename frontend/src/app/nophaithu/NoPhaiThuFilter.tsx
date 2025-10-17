import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface NoPhaiThuFilterProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedPayStatus: string;
  setSelectedPayStatus: (value: string) => void;
  selectedDueStatus: string;
  setSelectedDueStatus: (value: string) => void;
}

const payStatusOptions = [
  { value: "all", label: "Tất cả trạng thái thanh toán" },
  { value: "Chưa thanh toán", label: "Chưa thanh toán" },
  { value: "Thanh toán một phần", label: "Thanh toán một phần" },
  { value: "Đóng đủ", label: "Đóng đủ" },
  { value: "Đã tất toán", label: "Đã tất toán" },
];

const dueStatusOptions = [
  { value: "all", label: "Tất cả trạng thái ngày" },
  { value: "Đến hạn", label: "Đến hạn" },
  { value: "Chưa đến hạn", label: "Chưa đến hạn" },
  { value: "Quá hạn", label: "Quá hạn" },
  { value: "Quá kỳ đóng lãi", label: "Quá kỳ đóng lãi" },
];

export default function NoPhaiThuFilter({
  searchTerm,
  setSearchTerm,
  selectedPayStatus,
  setSelectedPayStatus,
  selectedDueStatus,
  setSelectedDueStatus,
}: NoPhaiThuFilterProps) {
  return (
    <div className="my-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Tìm kiếm</label>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Tìm kiếm theo mã hợp đồng, tên khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 rounded-xl border-slate-200 bg-white shadow-sm focus:shadow-md transition-shadow"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Trạng thái thanh toán</label>
            <Select value={selectedPayStatus} onValueChange={setSelectedPayStatus}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-blue-200">
                <SelectValue placeholder="Chọn trạng thái thanh toán" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                {payStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Trạng thái ngày</label>
            <Select value={selectedDueStatus} onValueChange={setSelectedDueStatus}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-blue-200">
                <SelectValue placeholder="Chọn trạng thái ngày" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                {dueStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}