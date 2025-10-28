"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  PieChart,
  Activity,
  FileText,
  DollarSign,
  Target,
  AlertTriangle,
  Calendar,
  Loader2,
} from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { useState, useEffect, useCallback } from "react";
import type React from "react";
import { fetchDashboardData, type DashboardData } from "@/services/dashboardApi";
import { formatCurrency } from "@/lib/utils";
import { useDashboardEvents } from "@/hooks/useWebSocket";

type DashboardFilters = {
  window: "all" | "this_month" | "this_quarter" | "this_year";
  year?: number;
  month?: number;
  quarter?: number;
}

export default function Dashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({ window: "all" });
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availablePeriods = {
    current_year: 2025,
    years: [2023, 2024, 2025],
    current_month: 10,
    current_quarter: 4,
  };

  // Fetch dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchDashboardData(filters.window);
      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Không thể tải dữ liệu');
      }
    } catch (err) {
      setError('Lỗi kết nối đến server');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.window]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Subscribe to WebSocket events for real-time updates
  useDashboardEvents((data, message) => {
    console.log('📡 Dashboard WebSocket event received:', message.type);
    // Auto-refresh dashboard when data changes
    loadDashboardData();
  });

  const getStatsCards = () => {
    if (!dashboardData) {
      return [
        {
          title: "Tổng hợp đồng",
          subtitle: "",
          description: "",
          value: "0",
          icon: FileText,
          gradient: "bg-gradient-to-r from-blue-50 to-blue-100",
          iconBg: "bg-blue-500",
          textColor: "text-blue-700",
        },
        {
          title: "Tổng tiền đã thu",
          subtitle: "",
          description: "",
          value: "0",
          icon: DollarSign,
          gradient: "bg-gradient-to-r from-green-50 to-green-100",
          iconBg: "bg-green-500",
          textColor: "text-green-700",
        },
        {
          title: "Tổng tiền cần thu",
          subtitle: "",
          description: "",
          value: "0",
          icon: Target,
          gradient: "bg-gradient-to-r from-purple-50 to-purple-100",
          iconBg: "bg-purple-500",
          textColor: "text-purple-700",
        },
        {
          title: "Nợ phải thu",
          subtitle: "",
          description: "",
          value: "0",
          icon: AlertTriangle,
          gradient: "bg-gradient-to-r from-red-50 to-orange-100",
          iconBg: "bg-red-500",
          textColor: "text-red-700",
        },
      ];
    }

    return [
      {
        title: "Tổng hợp đồng",
        subtitle: "",
        description: "",
        value: String(dashboardData.tong_hop_dong),
        icon: FileText,
        gradient: "bg-gradient-to-r from-blue-50 to-blue-100",
        iconBg: "bg-blue-500",
        textColor: "text-blue-700",
      },
      {
        title: "Tổng tiền đã thu",
        subtitle: "",
        description: "",
        value: formatCurrency(dashboardData.tong_tien_da_thu),
        icon: DollarSign,
        gradient: "bg-gradient-to-r from-green-50 to-green-100",
        iconBg: "bg-green-500",
        textColor: "text-green-700",
      },
      {
        title: "Tổng tiền cần thu",
        subtitle: "",
        description: "",
        value: formatCurrency(dashboardData.tong_tien_can_thu),
        icon: Target,
        gradient: "bg-gradient-to-r from-purple-50 to-purple-100",
        iconBg: "bg-purple-500",
        textColor: "text-purple-700",
      },
      {
        title: "Nợ phải thu",
        subtitle: "",
        description: "",
        value: String(dashboardData.no_phai_thu),
        icon: AlertTriangle,
        gradient: "bg-gradient-to-r from-red-50 to-orange-100",
        iconBg: "bg-red-500",
        textColor: "text-red-700",
      },
    ];
  };

  const getLoanData = () => {
    if (!dashboardData) {
      return [
        {
          type: "Tín chấp",
          count: 0,
          total: "0",
          interest: "0",
          profit: "0",
          color: "bg-blue-100 text-blue-700 border border-blue-200",
        },
        {
          type: "Trả góp",
          count: 0,
          total: "0",
          interest: "0",
          profit: "0",
          color: "bg-orange-100 text-orange-700 border border-orange-200",
        },
      ];
    }

    return [
      {
        type: "Tín chấp",
        count: dashboardData.loai_hinh_vay.tin_chap.so_hop_dong,
        total: formatCurrency(dashboardData.loai_hinh_vay.tin_chap.tien_cho_vay),
        interest: formatCurrency(dashboardData.loai_hinh_vay.tin_chap.tien_da_thu),
        profit: formatCurrency(dashboardData.loai_hinh_vay.tin_chap.tien_no_can_tra),
        color: "bg-blue-100 text-blue-700 border border-blue-200",
      },
      {
        type: "Trả góp",
        count: dashboardData.loai_hinh_vay.tra_gop.so_hop_dong,
        total: formatCurrency(dashboardData.loai_hinh_vay.tra_gop.tien_cho_vay),
        interest: formatCurrency(dashboardData.loai_hinh_vay.tra_gop.tien_da_thu),
        profit: formatCurrency(dashboardData.loai_hinh_vay.tra_gop.tien_no_can_tra),
        color: "bg-orange-100 text-orange-700 border border-orange-200",
      },
    ];
  };

  const handleFilterChange = (newFilters: Partial<DashboardFilters>) => {
    setFilters((prev: DashboardFilters) => ({ ...prev, ...newFilters }));
  };

  const getTimeRangeLabel = () => {
    if (filters.window === 'all') return 'Tất cả thời gian';
    if (filters.window === 'this_month') {
      if (filters.year && filters.month) {
        return `Tháng ${filters.month}/${filters.year}`;
      }
      return 'Tháng này';
    }
    if (filters.window === 'this_quarter') {
      if (filters.year && filters.quarter) {
        return `Quý ${filters.quarter}/${filters.year}`;
      }
      return 'Quý này';
    }
    if (filters.window === 'this_year') {
      if (filters.year) {
        return `Năm ${filters.year}`;
      }
      return 'Năm này';
    }
    return 'Tất cả thời gian';
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-600" />
        <select
          value={filters.window}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const window = e.target.value as DashboardFilters['window'];
            handleFilterChange({ window, year: undefined, month: undefined, quarter: undefined });
          }}
          className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tất cả thời gian</option>
          <option value="this_month">Tháng này</option>
          <option value="this_quarter">Quý này</option>
          <option value="this_year">Năm này</option>
        </select>
      </div>
      {filters.window !== 'all' && availablePeriods && (
        <select
          value={filters.year || availablePeriods.current_year}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const year = parseInt(e.target.value);
            handleFilterChange({ year });
          }}
          className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {availablePeriods.years.map((year: number) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      )}
      {filters.window === 'this_month' && availablePeriods && (
        <select
          value={filters.month || availablePeriods.current_month}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const month = parseInt(e.target.value);
            handleFilterChange({ month });
          }}
          className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
            <option key={month} value={month}>Tháng {month}</option>
          ))}
        </select>
      )}
      {filters.window === 'this_quarter' && availablePeriods && (
        <select
          value={filters.quarter || availablePeriods.current_quarter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const quarter = parseInt(e.target.value);
            handleFilterChange({ quarter });
          }}
          className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {[1, 2, 3, 4].map(quarter => (
            <option key={quarter} value={quarter}>Quý {quarter}</option>
          ))}
        </select>
      )}
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6" suppressHydrationWarning>
        <PageHeader
          title="Tổng quan"
          description={`Bảng điều khiển và số liệu tổng quan hệ thống - ${getTimeRangeLabel()}`}
          breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Tổng quan" }]}
          actions={headerActions}
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-600">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4 md:space-y-6" suppressHydrationWarning>
        <PageHeader
          title="Tổng quan"
          description={`Bảng điều khiển và số liệu tổng quan hệ thống - ${getTimeRangeLabel()}`}
          breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Tổng quan" }]}
          actions={headerActions}
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-slate-800 font-semibold mb-2">Lỗi tải dữ liệu</p>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Thử lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6" suppressHydrationWarning>
      <PageHeader
        title="Tổng quan"
        description={`Bảng điều khiển và số liệu tổng quan hệ thống - ${getTimeRangeLabel()}`}
        breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Tổng quan" }]}
        actions={headerActions}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
        {getStatsCards().map((card, index) => (
          <StatsCard key={`dashboard-stats-${index}`} data={card} />
        ))}
      </div>
      <Card className="rounded-2xl border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 via-blue-50 to-emerald-50 border-b border-slate-200">
          <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-600" />
            Tổng quan các loại hình cho vay
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-blue-50/95 backdrop-blur supports-[backdrop-filter]:bg-blue-50/80">
                <tr className="border-b border-slate-200">
                  <th className="text-left p-4 font-semibold text-slate-700">Loại hình</th>
                  <th className="text-center p-4 font-semibold text-slate-700">Số hợp đồng</th>
                  <th className="text-right p-4 font-semibold text-slate-700">Tiền đang cho vay</th>
                  <th className="text-right p-4 font-semibold text-slate-700">Tổng tiền đã thu</th>
                  <th className="text-right p-4 font-semibold text-slate-700">Tiền nợ cần trả</th>
                </tr>
              </thead>
              <tbody>
                {getLoanData().map((item, index) => (
                  <tr
                    key={`dashboard-table-${index}`}
                    className="border-b border-slate-100 even:bg-slate-50/60 hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="p-4 align-middle">
                      <Badge className={`${item.color} border-0 font-medium px-3 py-1 rounded-full shadow-sm`}>{item.type}</Badge>
                    </td>
                    <td className="text-center p-4 align-middle tabular-nums">
                      <div className="font-semibold text-slate-800 text-base">{item.count}</div>
                      <div className="text-xs text-slate-500">hợp đồng</div>
                    </td>
                    <td className="text-right p-4 align-middle tabular-nums">
                      <div className="font-semibold text-slate-800 text-base">{item.total}</div>
                      <div className="text-xs text-slate-500">VNĐ</div>
                    </td>
                    <td className="text-right p-4 align-middle tabular-nums">
                      <div className="font-semibold text-green-600 text-base">{item.interest}</div>
                      <div className="text-xs text-green-500">VNĐ</div>
                    </td>
                    <td className="text-right p-4 align-middle tabular-nums">
                      <div className="font-semibold text-red-600 text-base">{item.profit}</div>
                      <div className="text-xs text-red-500">VNĐ</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden p-4">
            {getLoanData().map((item, index) => (
              <div key={`dashboard-mobile-${index}`} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Badge className={`${item.color} border-0 font-medium px-2.5 py-0.5 rounded-full text-xs`}> 
                    {item.type}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-slate-500">Số hợp đồng</div>
                    <div className="font-semibold text-slate-800 text-base">{item.count}</div>
                    <div className="text-[11px] text-slate-500">hợp đồng</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">Tiền đang cho vay</div>
                    <div className="font-semibold text-slate-800 text-base">{item.total}</div>
                    <div className="text-[11px] text-slate-500">VNĐ</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Tổng tiền đã thu</div>
                    <div className="font-semibold text-green-600 text-base">{item.interest}</div>
                    <div className="text-[11px] text-green-500">VNĐ</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">Tiền nợ cần trả</div>
                    <div className="font-semibold text-red-600 text-base">{item.profit}</div>
                    <div className="text-[11px] text-red-500">VNĐ</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-5">
        <Card className="rounded-2xl border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-emerald-600" />
              Lãi thu dự kiến
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <div className="w-32 h-32 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">
                      {dashboardData?.ti_le_lai_thu.da_thu.toFixed(2) || 0}%
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-300/30 to-teal-300/30 rounded-full blur-xl"></div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm"></div>
                    <span className="font-medium">
                      Đã thu: {dashboardData?.ti_le_lai_thu.da_thu.toFixed(2) || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-orange-400 rounded-full shadow-sm"></div>
                    <span className="font-medium">
                      Chưa thu: {dashboardData?.ti_le_lai_thu.chua_thu.toFixed(2) || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Tỉ lệ lợi nhuận
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <div className="w-32 h-32 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">
                      {dashboardData 
                        ? (dashboardData.ti_le_loi_nhuan.tin_chap + dashboardData.ti_le_loi_nhuan.tra_gop).toFixed(2)
                        : 0}%
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-300/30 to-indigo-300/30 rounded-full blur-xl"></div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm"></div>
                    <span className="font-medium">
                      Tín chấp: {dashboardData?.ti_le_loi_nhuan.tin_chap.toFixed(2) || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-orange-400 rounded-full shadow-sm"></div>
                    <span className="font-medium">
                      Trả góp: {dashboardData?.ti_le_loi_nhuan.tra_gop.toFixed(2) || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



