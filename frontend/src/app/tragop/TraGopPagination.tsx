import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TraGopPaginationProps {
  currentPage: number;
  setCurrentPage: (v: number) => void;
  totalPages: number;
  startIndex: number;
  itemsPerPage: number;
  countAllItems: number;
}

export default function TraGopPagination({
  currentPage,
  setCurrentPage,
  totalPages,
  startIndex,
  itemsPerPage,
  countAllItems,
}: TraGopPaginationProps) {
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
          disabled={currentPage <= 1 || totalPages === 0}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Trước
        </Button>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const page = i + 1;
            return (
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
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-slate-200 hover:bg-slate-50 shadow-sm"
          disabled={totalPages === 0 || currentPage >= totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Sau
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}


