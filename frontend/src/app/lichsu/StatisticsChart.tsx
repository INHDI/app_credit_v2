"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LichSuStatisticsByDate } from "@/services/lichsuApi";
import { formatDateShort } from "@/lib/utils";

interface StatisticsChartProps {
  statistics: LichSuStatisticsByDate[];
}

export default function StatisticsChart({ statistics }: StatisticsChartProps) {
  // Transform data for recharts
  const chartData = statistics.map(stat => ({
    date: formatDateShort(stat.ngay),
    'Số người đã trả': stat.so_nguoi_da_tra,
    'Số người chưa trả': stat.so_nguoi_chua_tra,
  }));

  return (
    <Card className="rounded-2xl border-0 shadow-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
        <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Biểu đồ trạng thái tín dụng
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {statistics.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            Không có dữ liệu thống kê
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Bar 
                dataKey="Số người đã trả" 
                fill="#3b82f6" 
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="Số người chưa trả" 
                fill="#f97316" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

