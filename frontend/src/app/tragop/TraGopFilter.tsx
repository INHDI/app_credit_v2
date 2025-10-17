import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface TraGopFilterProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  selectedloai_hop_dong: string;
  setSelectedloai_hop_dong: (v: string) => void;
  selectedStatus: string;
  setSelectedStatus: (v: string) => void;
  selectedTimeRange: string;
  setSelectedTimeRange: (v: string) => void;
}

export default function TraGopFilter({
  searchTerm,
  setSearchTerm,
  selectedloai_hop_dong,
  setSelectedloai_hop_dong,
  selectedStatus,
  setSelectedStatus,
  selectedTimeRange,
  setSelectedTimeRange,
}: TraGopFilterProps) {
  return (
    <div className="my-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        {/* <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Loại hình vay</label>
          <Select value={selectedloai_hop_dong} onValueChange={setSelectedloai_hop_dong}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white shadow-sm">
              <SelectValue placeholder="Chọn loại hình" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại hình</SelectItem>
              <SelectItem value="hop_dong_thuong">Hợp đồng thường</SelectItem>
              <SelectItem value="tra_goc_lai">Trả gốc lãi</SelectItem>
            </SelectContent>
          </Select>
        </div> */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Trạng thái</label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-blue-200">
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
        <div className="space-y-2 sm:col-span-1">
          <label className="text-sm font-medium text-slate-700">Thời gian</label>
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-blue-200">
              <SelectValue placeholder="Chọn khoảng thời gian" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
              <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="all">Tất cả thời gian</SelectItem>
              <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="today">Hôm nay</SelectItem>
              <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="week">Tuần này</SelectItem>
              <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="month">Tháng này</SelectItem>
              <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="quarter">Quý này</SelectItem>
              <SelectItem className="rounded-lg px-3 py-2 focus:bg-blue-50 focus:text-blue-700 cursor-pointer" value="year">Năm này</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      </div>
    </div>
  );
}


