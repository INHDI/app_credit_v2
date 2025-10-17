import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { LichSuStatisticsByDate } from "@/services/lichsuApi";
import { formatDateDisplay } from "@/lib/utils";

interface StatisticsTableProps {
  statistics: LichSuStatisticsByDate[];
}

export default function StatisticsTable({ statistics }: StatisticsTableProps) {
  return (
    <Card className="rounded-2xl border-0 shadow-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
        <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Bảng trạng thái tín dụng
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-blue-50/95 backdrop-blur">
              <tr className="border-b border-slate-200">
                <th className="text-center p-4 font-semibold text-slate-700 w-16">STT</th>
                <th className="text-left p-4 font-semibold text-slate-700">Ngày</th>
                <th className="text-center p-4 font-semibold text-slate-700">Số người chưa trả</th>
                <th className="text-center p-4 font-semibold text-slate-700">Số người đã trả</th>
              </tr>
            </thead>
            <tbody>
              {statistics.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-slate-500">
                    Không có dữ liệu thống kê
                  </td>
                </tr>
              ) : (
                statistics.map((item, index) => (
                  <tr
                    key={`stat-${index}`}
                    className="border-b border-slate-100 even:bg-slate-50/60 hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="text-center p-4 align-middle font-medium text-slate-600">
                      {index + 1}
                    </td>
                    <td className="p-4 align-middle text-slate-700 font-medium">
                      {formatDateDisplay(item.ngay)}
                    </td>
                    <td className="text-center p-4 align-middle">
                      <span className="font-semibold text-orange-600 text-base">
                        {item.so_nguoi_chua_tra}
                      </span>
                    </td>
                    <td className="text-center p-4 align-middle">
                      <span className="font-semibold text-emerald-600 text-base">
                        {item.so_nguoi_da_tra}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 md:hidden p-4">
          {statistics.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              Không có dữ liệu thống kê
            </div>
          ) : (
            statistics.map((item, index) => (
              <div
                key={`stat-mobile-${index}`}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">#{index + 1}</span>
                    <span className="font-semibold text-slate-800">
                      {formatDateDisplay(item.ngay)}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">Chưa trả</div>
                    <div className="text-xl font-semibold text-orange-600">
                      {item.so_nguoi_chua_tra}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">Đã trả</div>
                    <div className="text-xl font-semibold text-emerald-600">
                      {item.so_nguoi_da_tra}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

