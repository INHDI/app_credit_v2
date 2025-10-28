"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowDownRight, ArrowUpRight, CalendarRange, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { useThongKe } from "@/hooks/useThongKe";
import { useDashboardEvents } from "@/hooks/useWebSocket";

type LineSeries = {
  name: string;
  color: string;
  data: number[];
};

const metricTone = [
  { text: "text-blue-600", fill: "bg-blue-100" },
  { text: "text-emerald-600", fill: "bg-emerald-100" },
  { text: "text-sky-600", fill: "bg-sky-100" },
  { text: "text-rose-600", fill: "bg-rose-100" },
];

function formatCompactCurrency(value: number) {
  if (!value) return "0";
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("vi-VN");
}

function LineChart({ categories, series }: { categories: string[]; series: LineSeries[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 960;
  const height = 320;
  const margin = { top: 16, right: 24, bottom: 36, left: 64 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const allValues = series.flatMap((s) => s.data);
  const maxVal = Math.max(1, ...allValues.map((v) => (isFinite(v) ? v : 0)));

  const x = (i: number) => (categories.length <= 1 ? 0 : (i * innerW) / (categories.length - 1));
  const y = (v: number) => innerH - (v / maxVal) * innerH;

  const ticks = 6;
  const yTicks = new Array(ticks + 1).fill(0).map((_, i) => Math.round((maxVal * i) / ticks));

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = event.clientX - rect.left - margin.left;
    const step = categories.length <= 1 ? innerW : innerW / (categories.length - 1);
    let idx = Math.round(offsetX / step);
    idx = Math.max(0, Math.min(categories.length - 1, idx));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => setHoverIndex(null);

  return (
    <div className="w-full">
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          {series.map((s) => (
            <linearGradient key={s.name} id={`grad-${s.name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {yTicks.map((t, idx) => (
            <g key={`tick-${idx}`}>
              <line x1={0} y1={y(t)} x2={innerW} y2={y(t)} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={-14} y={y(t)} textAnchor="end" alignmentBaseline="middle" className="fill-slate-500 text-[11px]">
                {formatCompactCurrency(t)}
              </text>
            </g>
          ))}

          {categories.map((c, i) => {
            const shouldShow = categories.length <= 12 || i % Math.ceil(categories.length / 12) === 0 || i === categories.length - 1;
            if (!shouldShow) return null;
            return (
              <text key={`xlabel-${i}`} x={x(i)} y={innerH + 20} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {c}
              </text>
            );
          })}

          {series.map((s) => {
            const points = s.data.map((v, i) => [x(i), y(v)] as const);
            const dLine = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
            const dArea = `${dLine} L${x(points.length - 1)},${innerH} L0,${innerH} Z`;
            return (
              <g key={s.name}>
                <path d={dArea} fill={`url(#grad-${s.name})`} />
                <path d={dLine} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinecap="round" />
                {points.map((p, i) => (
                  <circle key={`${s.name}-point-${i}`} cx={p[0]} cy={p[1]} r={3} fill="#fff" stroke={s.color} strokeWidth={1.6} />
                ))}
              </g>
            );
          })}

          {hoverIndex !== null && (
            <g>
              <line x1={x(hoverIndex)} y1={0} x2={x(hoverIndex)} y2={innerH} stroke="#94a3b8" strokeDasharray="4 4" />
              <foreignObject x={Math.min(Math.max(x(hoverIndex) - 100, 0), innerW - 200)} y={8} width={200} height={140}>
                <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-xs shadow-lg backdrop-blur-md">
                  <div className="font-semibold text-slate-700 mb-2">{categories[hoverIndex]}</div>
                  {series.map((s) => (
                    <div key={`${s.name}-hover`} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-500">{s.name}</span>
                      </div>
                      <span className="text-slate-800 font-medium">{formatCurrency(s.data[hoverIndex] || 0)}</span>
                    </div>
                  ))}
                </div>
              </foreignObject>
            </g>
          )}

          <rect
            x={0}
            y={0}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </g>
      </svg>
    </div>
  );
}

function HorizontalBars({
  items,
  emptyMessage,
}: {
  items: { label: string; value: number; color: string }[];
  emptyMessage?: string;
}) {
  const total = items.reduce((acc, i) => acc + i.value, 0);

  if (!items.length || total === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
        {emptyMessage ?? "Chưa có dữ liệu"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((i) => {
        const percent = total > 0 ? Math.round((i.value / total) * 100) : 0;
        return (
          <div key={i.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.color }} />
                <span className="font-medium text-slate-800">{i.label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{formatCurrency(i.value)}</span>
                <span className="font-semibold text-slate-700">{percent}%</span>
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-3 rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: i.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  delta,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tone: (typeof metricTone)[number];
  delta?: { value: string; trend: "up" | "down" | "neutral"; label?: string };
}) {
  return (
    <Card className="border border-transparent bg-white/90 backdrop-blur hover:border-slate-200 transition-all duration-200 shadow-sm hover:shadow-lg">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
            <div className={cn("mt-1 text-3xl font-semibold", tone.text)}>{value}</div>
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", tone.fill)}>{icon}</div>
        </div>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        {delta && (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
              delta.trend === "up"
                ? "bg-emerald-50 text-emerald-600"
                : delta.trend === "down"
                ? "bg-rose-50 text-rose-600"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {delta.trend === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : delta.trend === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5" />
            )}
            <span>{delta.value}</span>
            {delta.label && <span className="text-slate-400">• {delta.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ThongKe() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Format date to DD-MM-YYYY for API
  const formatDateForAPI = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Format date to YYYY-MM-DD for input display
  const formatDateForInput = (dateStr: string) => {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  };

  // Calculate date range based on granularity
  const calculateDateRange = (granularity: "daily" | "weekly" | "monthly") => {
    const today = new Date();
    
    switch (granularity) {
      case "daily":
        // Từ đầu tháng đến cuối tháng hiện tại
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          start: formatDateForAPI(firstDayOfMonth),
          end: formatDateForAPI(lastDayOfMonth)
        };
        
      case "weekly":
        // Từ 4 tuần trước đến 4 tuần sau
        const fourWeeksAgo = new Date(today);
        fourWeeksAgo.setDate(today.getDate() - 28); // 4 tuần = 28 ngày
        const fourWeeksLater = new Date(today);
        fourWeeksLater.setDate(today.getDate() + 28);
        return {
          start: formatDateForAPI(fourWeeksAgo),
          end: formatDateForAPI(fourWeeksLater)
        };
        
      case "monthly":
        // Từ 4 tháng trước đến 4 tháng sau
        const fourMonthsAgo = new Date(today);
        fourMonthsAgo.setMonth(today.getMonth() - 4);
        const fourMonthsLater = new Date(today);
        fourMonthsLater.setMonth(today.getMonth() + 4);
        return {
          start: formatDateForAPI(fourMonthsAgo),
          end: formatDateForAPI(fourMonthsLater)
        };
        
      default:
        return {
          start: formatDateForAPI(firstDayOfMonth),
          end: formatDateForAPI(today)
        };
    }
  };

  // Calculate default date range for "daily" granularity
  const defaultDateRange = calculateDateRange("daily");
  
  const {
    state: { granularity, startDate, endDate },
    setGranularity,
    setStartDate,
    setEndDate,
    data: series,
    totals,
    statistics,
    loading,
    error,
    refreshData,
  } = useThongKe({ 
    granularity: "daily", 
    startDate: defaultDateRange.start, 
    endDate: defaultDateRange.end 
  });

  // Update date range when granularity changes
  const handleGranularityChange = (newGranularity: "daily" | "weekly" | "monthly") => {
    setGranularity(newGranularity);
    const dateRange = calculateDateRange(newGranularity);
    setStartDate(dateRange.start);
    setEndDate(dateRange.end);
  };

  // Subscribe to WebSocket events for real-time updates
  useDashboardEvents((data, message) => {
    console.log('📡 ThongKe page received WebSocket event:', message.type);
    // Auto-refresh statistics when data changes
    refreshData();
  });

  const summary = statistics?.summary;
  const topOutstanding = statistics?.top_outstanding ?? [];

  const categories = useMemo(() => series?.data.map((r) => r.bucket) ?? [], [series]);
  const chartSeries = useMemo<LineSeries[]>(
    () => [
      { name: "Chi", color: "#ef4444", data: series?.data.map((r) => r.tong_tien_chi) ?? [] },
      { name: "Thu", color: "#10b981", data: series?.data.map((r) => r.tong_tien_thu) ?? [] },
    ],
    [series]
  );

  const disbursedBreakdown = useMemo(() => {
    if (!statistics) return [];
    return [
      { label: "Tín chấp", value: statistics.breakdown.tin_chap.disbursed, color: "#3b82f6" },
      { label: "Trả góp", value: statistics.breakdown.tra_gop.disbursed, color: "#f59e0b" },
    ];
  }, [statistics]);

  const collectedBreakdown = useMemo(() => {
    if (!statistics) return [];
    return [
      { label: "Tín chấp", value: statistics.breakdown.tin_chap.collected, color: "#3b82f6" },
      { label: "Trả góp", value: statistics.breakdown.tra_gop.collected, color: "#f59e0b" },
    ];
  }, [statistics]);

  const metricCards = useMemo(() => {
    return [
      {
        title: "Tổng giải ngân",
        value: formatCurrency(totals.chi),
        subtitle: "Tiền chi ra để cho vay",
        tone: metricTone[0],
      },
      {
        title: "Thu thực tế",
        value: formatCurrency(totals.thu),
        subtitle: "Tiền thực tế đã thu",
        tone: metricTone[1],
      },
      {
        title: "Dự kiến thu được",
        value: formatCurrency(summary?.total_expected || 0),
        subtitle: "Tiền gốc + tiền lãi",
        tone: metricTone[2],
      },
      {
        title: "Dòng tiền ròng",
        value: formatCurrency(totals.net),
        subtitle: "Thu thực tế - Tổng giải ngân",
        tone: totals.net >= 0 ? metricTone[1] : metricTone[3],
        delta: totals.net >= 0 ? { value: "Dương", trend: "up" as const } : { value: "Âm", trend: "down" as const },
      },
    ];
  }, [totals, summary]);


  return (
    <div className="space-y-8" suppressHydrationWarning>
      <PageHeader
        title="Thống kê tài chính"
        description="Theo dõi dòng tiền, lợi nhuận và rủi ro theo từng giai đoạn"
        breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Thống kê" }]}
      />

      <Card className="border-0 bg-gradient-to-br from-slate-50 via-white to-blue-50 shadow-sm">
        <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Độ chi tiết</p>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
              {(["daily", "weekly", "monthly"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleGranularityChange(option)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition",
                    granularity === option ? "bg-blue-500 text-white shadow" : "text-slate-500 hover:text-blue-500"
                  )}
                >
                  {option === "daily" ? "Ngày" : option === "weekly" ? "Tuần" : "Tháng"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Từ ngày</p>
            <input
              type="date"
              value={formatDateForInput(startDate)}
              onChange={(e) => {
                const date = new Date(e.target.value);
                setStartDate(formatDateForAPI(date));
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Đến ngày</p>
            <input
              type="date"
              value={formatDateForInput(endDate)}
              onChange={(e) => {
                const date = new Date(e.target.value);
                setEndDate(formatDateForAPI(date));
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng quan</p>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              Khoảng thời gian: {startDate} → {endDate}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item) => (
          <MetricCard key={item.title} title={item.title} value={item.value} subtitle={item.subtitle} tone={item.tone} delta={item.delta} />
        ))}
      </div>

      {/* Secondary metrics removed */}

      <Card className="border-0 shadow-xl shadow-blue-50/40">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Xu hướng</p>
              <CardTitle className="mt-1 text-2xl text-slate-800">Chi • Thu theo thời gian</CardTitle>
            </div>
            <div className="hidden items-center gap-4 text-xs text-slate-500 md:flex">
              {chartSeries.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex h-60 items-center justify-center text-slate-500">Đang tải dữ liệu...</div>
          ) : error ? (
            <div className="flex h-60 items-center justify-center text-rose-500">{error}</div>
          ) : (
            <LineChart categories={categories} series={chartSeries} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg shadow-blue-50/30">
          <CardHeader className="pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Cơ cấu dòng tiền</p>
            <CardTitle className="text-xl text-slate-800">Phân bổ theo loại hợp đồng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
              <h4 className="mb-4 text-sm font-semibold text-slate-700">Giải ngân</h4>
              <HorizontalBars items={disbursedBreakdown} emptyMessage="Không có giải ngân trong giai đoạn đã chọn" />
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
              <h4 className="mb-4 text-sm font-semibold text-slate-700">Thu thực tế</h4>
              <HorizontalBars items={collectedBreakdown} emptyMessage="Chưa phát sinh thu trong giai đoạn đã chọn" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-blue-50/30">
          <CardHeader className="pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Rủi ro</p>
            <CardTitle className="text-xl text-slate-800">Các hợp đồng dư nợ cao nhất</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-slate-500">Đang tải dữ liệu...</div>
            ) : error ? (
              <div className="flex h-40 items-center justify-center text-rose-500">{error}</div>
            ) : topOutstanding.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
                Không có hợp đồng dư nợ
              </div>
            ) : (
              topOutstanding.map((item) => (
                <div key={item.ma_hop_dong} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-gradient-to-r from-white to-slate-50/60 px-5 py-4 shadow-sm">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{item.ma_hop_dong}</div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      {item.contract_type ? item.contract_type.replace(/_/g, " ") : "Không xác định"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold text-slate-800">{formatCurrency(item.amount)}</div>
                    {item.is_overdue ? (
                      <span className="text-xs font-semibold text-rose-500">Quá hạn</span>
                    ) : (
                      <span className="text-xs text-slate-400">Chưa đến hạn</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
