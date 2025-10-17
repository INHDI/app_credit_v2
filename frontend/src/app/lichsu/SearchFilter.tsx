import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function SearchFilter({
  searchTerm,
  onSearchChange,
}: SearchFilterProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm theo MaHD hoặc Họ tên..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 rounded-xl border-slate-200 focus:border-blue-300"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-slate-100 rounded-lg"
            >
              <X className="h-4 w-4 text-slate-400" />
            </Button>
          )}
        </div>
      </div>
      {searchTerm && (
        <div className="mt-2 text-sm text-slate-600">
          Đang tìm kiếm: <span className="font-semibold text-blue-600">"{searchTerm}"</span>
        </div>
      )}
    </div>
  );
}

