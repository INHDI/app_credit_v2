import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RotateCcw } from "lucide-react";

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onSearch: () => void;
  onReset: () => void;
}

export default function DateRangeFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onSearch,
  onReset,
}: DateRangeFilterProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1 md:p-2">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
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
        
        <div className="flex gap-2">
          <Button
            onClick={onSearch}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-6 h-10 shadow-sm"
          >
            <Search className="h-4 w-4 mr-2" />
            Tìm kiếm
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            className="border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl px-4 h-10 shadow-sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

