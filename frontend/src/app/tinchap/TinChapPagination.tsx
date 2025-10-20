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
  const startItem = startIndex + 1;
  const endItem = Math.min(startIndex + itemsPerPage, countAllItems);
  const windowSize = 5;
  let pages: number[] = [];
  let showLeadingEllipsis = false;
  let showTrailingEllipsis = false;
  let showFirstPage = false;
  let showLastPage = false;

  if (totalPages && totalPages > 0) {
    // Known total pages: center window around currentPage
    let startPage = Math.max(1, currentPage - Math.floor(windowSize / 2));
    let endPage = startPage + windowSize - 1;
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - windowSize + 1);
    }
    pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    showLeadingEllipsis = startPage > 2; // there are hidden pages between 1 and startPage
    showTrailingEllipsis = endPage < totalPages - 1; // hidden pages between endPage and totalPages
    showFirstPage = startPage > 1;
    showLastPage = endPage < totalPages;
  } else {
    // Unknown total pages: grow window based on hasNextPage
    const startPage = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const endPage = currentPage + (hasNextPage ? Math.floor(windowSize / 2) : 0);
    pages = Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, i) => startPage + i);
    showLeadingEllipsis = startPage > 1;
    showTrailingEllipsis = !!hasNextPage;
  }

  return (
    <div className="p-6 border-t border-slate-200 bg-gradient-to-r from-slate-50/50 to-blue-50/30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-600 font-medium">
          {countAllItems > 0 ? (
            <>
              Hiển thị {""}
              <span className="font-semibold text-slate-800">
                {startItem}-{endItem}
              </span>{" "}
              trong tổng số {""}
              <span className="font-semibold text-slate-800">
                {countAllItems}
              </span>{" "}
              hợp đồng
            </>
          ) : (
            <>
              Hiển thị {""}
              <span className="font-semibold text-slate-800">0-0</span> trong tổng số {""}
              <span className="font-semibold text-slate-800">0</span> hợp đồng
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
                key={`tinchap-page-1`}
                variant={currentPage === 1 ? "default" : "outline"}
                size="sm"
                className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                  currentPage === 1
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-lg"
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
                key={`tinchap-page-${page}`}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                  currentPage === page
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-lg"
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
                key={`tinchap-page-${totalPages}`}
                variant={currentPage === totalPages ? "default" : "outline"}
                size="sm"
                className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                  currentPage === totalPages
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-lg"
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
