"use client";

import { useEffect, useState, useCallback } from "react";
import StatsCard from "@/components/ui/StatsCard";
import { FileText, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { API_CONFIG, ENV_CONFIG } from "@/config/config";
import { useTraGopEvents } from "@/hooks/useWebSocket";

interface TraGopItem {
  MaHD: string;
  HoTen: string;
  NgayVay: string;
  SoTienVay: number;
  KyDong: number;
  SoLanTra: number;
  LaiSuat: number;
  TrangThai: string;
  DaThanhToan?: number;
  ConLai?: number;
}

export default function TraGopSummary() {
  const [cards, setCards] = useState<any[]>([]);

  // Fetch summary data function
  const fetchSummary = useCallback(async () => {
    try {
      const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.TRA_GOP}?page=1&page_size=999999&sort_by=NgayVay&sort_dir=desc`;
      const resp = await fetch(url, { headers: { accept: "application/json" } });
      const json = await resp.json();
      const list: TraGopItem[] = json?.data || [];

      const totalContracts = list.length;
      const activeContracts = list.filter((c) => c.TrangThai !== "Đã tất toán").length;
      const totalVay = list.reduce((s, c) => s + (c.SoTienVay || 0), 0);
      const totalDaTra = list.reduce((s, c) => s + (c.DaThanhToan || 0), 0);
      const totalConLai = list.reduce((s, c) => s + (c.ConLai || 0), 0);

      const summaryCards = [
        {
          title: "Tổng hợp đồng",
          value: String(totalContracts),
          subtitle: "Hợp đồng",
          description: `${activeContracts} đang hoạt động`,
          icon: FileText,
          gradient: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
          iconBg: "bg-blue-100",
          textColor: "text-blue-700",
        },
        {
          title: "Tổng tiền cho vay",
          value: formatCurrency(totalVay),
          subtitle: "VNĐ",
          description: "Tổng giá trị cho vay",
          icon: DollarSign,
          gradient: "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200",
          iconBg: "bg-emerald-100",
          textColor: "text-emerald-700",
        },
        {
          title: "Đã thu về",
          value: formatCurrency(totalDaTra),
          subtitle: "VNĐ",
          description: `${((totalDaTra / totalVay) * 100 || 0).toFixed(1)}%`,
          icon: TrendingUp,
          gradient: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
          iconBg: "bg-green-100",
          textColor: "text-green-700",
        },
        {
          title: "Còn phải thu",
          value: formatCurrency(totalConLai),
          subtitle: "VNĐ",
          description: "Số tiền chưa thu",
          icon: AlertCircle,
          gradient: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200",
          iconBg: "bg-amber-100",
          textColor: "text-amber-700",
        },
      ];

      setCards(summaryCards);
      console.log('🔄 TraGopSummary refreshed - Total contracts:', totalContracts);
    } catch (e) {
      console.error('❌ TraGopSummary fetch error:', e);
      setCards([]);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Subscribe to WebSocket events for real-time updates
  useTraGopEvents((data, message) => {
    console.log('📡 TraGopSummary received WebSocket event:', message.type);
    // Auto-refresh summary khi có thay đổi
    fetchSummary();
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => (
        <StatsCard key={`tragop-stats-${index}`} data={card as any} />
      ))}
    </div>
  );
}


