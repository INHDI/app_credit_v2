import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TinChapPaginationProps {
  currentPage: number;
  setCurrentPage: (v: number) => void;
  totalPages: number;
  startIndex: number;
  itemsPerPage: number;
  countAllItems: number;
  hasNextPage?: boolean;
}

export default function TinChapPagination({
  currentPage,
  setCurrentPage,
  totalPages,
  startIndex,
  itemsPerPage,
  countAllItems,
  hasNextPage,
}: TinChapPaginationProps) {
  return (
    <div className="p-6 border-t border-slate-200 bg-gradient-to-r from-slate-50/50 to-blue-50/30">
      <div className="text-sm text-slate-600 font-medium">
        {countAllItems > 0 ? (
          <>Hiển thị <span className="font-semibold text-slate-800">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, countAllItems)}</span> trong tổng số <span className="font-semibold text-slate-800">{countAllItems}</span> hợp đồng</>
        ) : (
          <>Hiển thị <span className="font-semibold text-slate-800">0-0</span> trong tổng số <span className="font-semibold text-slate-800">0</span> hợp đồng</>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-slate-200 hover:bg-slate-50 shadow-sm"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Trước
        </Button>
        {/* Server paginated, page numbers unknown; keep simple prev/next */}
        <div className="flex gap-1" />
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-slate-200 hover:bg-slate-50 shadow-sm"
          disabled={!hasNextPage}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Sau
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
