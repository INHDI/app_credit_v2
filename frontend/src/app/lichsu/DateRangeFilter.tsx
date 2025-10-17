import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onSearch: () => void;
}

export default function DateRangeFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onSearch,
}: DateRangeFilterProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Từ ngày
          </label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            className="rounded-xl border-slate-200 focus:border-blue-300"
          />
        </div>
        
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Đến ngày
          </label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            className="rounded-xl border-slate-200 focus:border-blue-300"
          />
        </div>
        
        <Button
          onClick={onSearch}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-6 h-10 shadow-sm"
        >
          <Search className="h-4 w-4 mr-2" />
          Tìm kiếm
        </Button>
      </div>
    </div>
  );
}

