import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface TinChapFilterProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  selectedStatus: string;
  setSelectedStatus: (v: string) => void;
  selectedTimeRange: string;
  setSelectedTimeRange: (v: string) => void;
}

export default function TinChapFilter({
  searchTerm,
  setSearchTerm,
  selectedStatus,
  setSelectedStatus,
  selectedTimeRange,
  setSelectedTimeRange,
}: TinChapFilterProps) {
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
            <label className="text-sm font-medium text-slate-700">Trạng thái</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-blue-200">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="all">Tất cả trạng thái</SelectItem>
                <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="Chưa thanh toán">Chưa thanh toán</SelectItem>
                <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="Đóng đủ">Đóng đủ</SelectItem>
                <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="Thanh toán một phần">Thanh toán một phần</SelectItem>
                <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="Đã tất toán">Đã tất toán</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Thời gian</label>
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-blue-200">
                <SelectValue placeholder="Chọn khoảng thời gian" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
                <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="all">Tất cả thời gian</SelectItem>
                <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="hom_nay">Ngày hôm nay</SelectItem>
                <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="thang_nay">Tháng này</SelectItem>
                <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="quy_nay">Quý này</SelectItem>
                <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="nam_nay">Năm này</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
