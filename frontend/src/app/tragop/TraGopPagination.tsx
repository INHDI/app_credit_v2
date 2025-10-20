import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TraGopPaginationProps {
  currentPage: number;
  setCurrentPage: (v: number) => void;
  totalPages: number;
  startIndex: number;
  itemsPerPage: number;
  countAllItems: number;
  hasNextPage?: boolean;
}

export default function TraGopPagination({
  currentPage,
  setCurrentPage,
  totalPages,
  startIndex,
  itemsPerPage,
  countAllItems,
  hasNextPage,
}: TraGopPaginationProps) {
  const startItem = startIndex + 1;
  const endItem = Math.min(startIndex + itemsPerPage, countAllItems);
  const windowSize = 5;
  let pages: number[] = [];
  let showLeadingEllipsis = false;
  let showTrailingEllipsis = false;
  let showFirstPage = false;
  let showLastPage = false;

  if (totalPages && totalPages > 0) {
    let s = Math.max(1, currentPage - Math.floor(windowSize / 2));
    let e = s + windowSize - 1;
    if (e > totalPages) {
      e = totalPages;
      s = Math.max(1, e - windowSize + 1);
    }
    pages = Array.from({ length: e - s + 1 }, (_, i) => s + i);
    showLeadingEllipsis = s > 2;
    showTrailingEllipsis = e < totalPages - 1;
    showFirstPage = s > 1;
    showLastPage = e < totalPages;
  } else {
    const s = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const e = currentPage + (hasNextPage ? Math.floor(windowSize / 2) : 0);
    pages = Array.from({ length: Math.max(0, e - s + 1) }, (_, i) => s + i);
    showLeadingEllipsis = s > 1;
    showTrailingEllipsis = !!hasNextPage;
  }

  return (
    <div className="p-6 border-t border-slate-200 bg-gradient-to-r from-slate-50/50 to-blue-50/30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-600 font-medium">
          {countAllItems > 0 ? (
            <>
              Hiển thị {""}
              <span className="font-semibold text-slate-800">{startItem}-{endItem}</span>{" "}
              trong tổng số {""}
              <span className="font-semibold text-slate-800">{countAllItems}</span> hợp đồng
            </>
          ) : (
            <>
              Hiển thị <span className="font-semibold text-slate-800">0-0</span> trong tổng số <span className="font-semibold text-slate-800">0</span> hợp đồng
            </>
          )}
        </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-slate-200 hover:bg-slate-50 shadow-sm"
          disabled={currentPage <= 1 || totalPages === 0}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Trước
        </Button>
        <div className="flex gap-1">
          {showFirstPage && (
            <Button
              key={`tragop-page-1`}
              variant={currentPage === 1 ? "default" : "outline"}
              size="sm"
              className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                currentPage === 1 
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg" 
                  : "border-slate-200 hover:bg-slate-50 shadow-sm"
              }`}
              onClick={() => setCurrentPage(1)}
            >
              1
            </Button>
          )}
          {showLeadingEllipsis && (
            <span className="px-2 text-slate-500">…</span>
          )}
          {pages.map((page) => (
            <Button
              key={`tragop-page-${page}`}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                currentPage === page 
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg" 
                  : "border-slate-200 hover:bg-slate-50 shadow-sm"
              }`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          {showTrailingEllipsis && (
            <span className="px-2 text-slate-500">…</span>
          )}
          {showLastPage && totalPages > 0 && (
            <Button
              key={`tragop-page-${totalPages}`}
              variant={currentPage === totalPages ? "default" : "outline"}
              size="sm"
              className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                currentPage === totalPages 
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg" 
                  : "border-slate-200 hover:bg-slate-50 shadow-sm"
              }`}
              onClick={() => setCurrentPage(totalPages)}
            >
              {totalPages}
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-slate-200 hover:bg-slate-50 shadow-sm"
          disabled={totalPages > 0 ? currentPage >= totalPages : !hasNextPage}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Sau
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      </div>
    </div>
  );
}


