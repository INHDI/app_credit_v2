import { useNavigation } from "@/hooks/useNavigation";
import { useMemo, useState, useEffect, useCallback } from "react";
import { API_CONFIG, ENV_CONFIG } from "@/config/config";
import { FileText, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

export type ContractStatus =
  | "chua_thanh_toan"
  | "da_thanh_toan"
  | "thanh_toan_mot_phan"
  | "tra_xong_lai"
  | "den_han_tra_lai"
  | "qua_han_tra_lai";

export interface CreditContract {
  id?: string;
  MaHD: string;
  HoTen: string;
  NgayVay: string;
  SoTienVay: number;
  KyDong: number;
  LaiSuat: number;
  SoTienTraGoc: number;
  TrangThai: string;
  LichSuTraLai?: any[];
  LaiDaTra: number;
  GocConLai: number;
  LaiConLai: number;
  // Legacy fields for backward compatibility
  ma_hop_dong?: string;
  ten_khach_hang?: string;
  customerInfo?: string;
  ngay_vay?: string;
  tong_tien_vay?: number;
  lai_suat?: string;
  kieu_lai_suat?: string;
  total_interest_paid?: number;
  unpaid_amount?: number;
  amount_to_collect?: number;
  daily_interest?: number;
  status?: string;
  statusColor?: string;
  statusList?: ContractStatus[];
}

export interface SummaryCard {
  title: string;
  value: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  textColor: string;
}

export function useTinChap() {
  const { navigateTo } = useNavigation();
  const breadcrumbItems: Array<{
    label: string;
    onClick?: () => void;
    isActive?: boolean;
  }> = [
    {
      label: "Trang chủ",
      onClick: () => navigateTo("/"),
    },
    {
      label: "Tín chấp",
      isActive: true,
    },
  ];

  // Data state
  const [contracts, setContracts] = useState<CreditContract[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("MaHD");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const itemsPerPage = 10;
  // Totals from API for proper pagination footer
  const [apiTotal, setApiTotal] = useState<number | undefined>(undefined);
  const [apiTotalPages, setApiTotalPages] = useState<number | undefined>(undefined);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL(`${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.TIN_CHAP}`);
      url.searchParams.set("page", String(currentPage));
      url.searchParams.set("page_size", String(itemsPerPage));
      if (selectedStatus && selectedStatus !== "all") {
        url.searchParams.set("status", selectedStatus);
      }
      if (searchTerm.trim()) {
        url.searchParams.set("search", searchTerm.trim());
      }
      url.searchParams.set("sort_by", sortBy);
      url.searchParams.set("sort_dir", sortDir);

      const resp = await fetch(url.toString(), { headers: { accept: "application/json" } });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      if (json?.success) {
        // Support both legacy array shape and new { items, total, total_pages }
        const data = json.data;
        if (Array.isArray(data)) {
          setContracts(data as CreditContract[]);
          // fall back: no totals available
          setApiTotal(undefined);
          setApiTotalPages(undefined);
        } else if (data && Array.isArray(data.items)) {
          setContracts(data.items as CreditContract[]);
          // store totals in closures via locals
          setApiTotal(typeof data.total === 'number' ? data.total : undefined);
          setApiTotalPages(typeof data.total_pages === 'number' ? data.total_pages : undefined);
        } else {
          setContracts([]);
          setApiTotal(undefined);
          setApiTotalPages(undefined);
        }
      } else {
        setContracts([]);
        setApiTotal(undefined);
        setApiTotalPages(undefined);
      }
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : undefined;
      setError(msg || "Fetch tín chấp thất bại");
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortBy, sortDir, selectedStatus, searchTerm]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Derived data
  const filteredContracts = useMemo(() => {
    let list = contracts;
    // server-side filtered by search/status; keep as passthrough here
    return list;
  }, [contracts]);

  // Server-side pagination: current list is already paginated from API
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContracts = filteredContracts;
  const countAllItems = typeof apiTotal === 'number' ? apiTotal : (startIndex + paginatedContracts.length);
  const totalPages = typeof apiTotalPages === 'number' ? apiTotalPages : 0;
  const safeCurrentPage = currentPage;
  const hasNextPage = paginatedContracts.length === itemsPerPage;

  // Summary stats based on current filtered list
  const summaryStats = useMemo(() => {
    const totalContracts = filteredContracts.length;
  const activeContracts = filteredContracts.filter(c => !((c.statusList || []) as ContractStatus[]).includes('da_thanh_toan')).length;
    const totaltong_tien_vay = filteredContracts.reduce((sum, c) => sum + (c.tong_tien_vay || 0), 0);
    const totaltien_da_tra = filteredContracts.reduce((sum, c) => sum + (c.total_interest_paid || 0), 0);
    const totaltong_tien_con_lai = filteredContracts.reduce((sum, c) => sum + (c.unpaid_amount || 0), 0);
    return { totalContracts, activeContracts, totaltong_tien_vay, totaltien_da_tra, totaltong_tien_con_lai };
  }, [filteredContracts]);

  const summaryCards: SummaryCard[] = [
    {
      title: "Tổng hợp đồng",
      value: summaryStats.totalContracts.toString(),
      subtitle: "Hợp đồng",
      description: `${summaryStats.activeContracts} đang hoạt động`,
      icon: FileText,
      gradient: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
      iconBg: "bg-blue-100",
      textColor: "text-blue-700",
    },
    {
      title: "Tổng tiền cho vay",
      value: formatCurrency(summaryStats.totaltong_tien_vay),
      subtitle: "VNĐ",
      description: "Tổng giá trị cho vay",
      icon: DollarSign,
      gradient: "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200",
      iconBg: "bg-emerald-100",
      textColor: "text-emerald-700",
    },
    {
      title: "Đã thu về",
      value: formatCurrency(summaryStats.totaltien_da_tra),
      subtitle: "VNĐ",
      description: `${((summaryStats.totaltien_da_tra / summaryStats.totaltong_tien_vay) * 100 || 0).toFixed(1)}%`,
      icon: TrendingUp,
      gradient: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
      iconBg: "bg-green-100",
      textColor: "text-green-700",
    },
    {
      title: "Còn phải thu",
      value: formatCurrency(summaryStats.totaltong_tien_con_lai),
      subtitle: "VNĐ",
      description: "Số tiền chưa thu",
      icon: AlertCircle,
      gradient: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200",
      iconBg: "bg-amber-100",
      textColor: "text-amber-700",
    }
  ];

  // Handlers

  const refreshContracts = async () => {
    await fetchContracts();
  };

  const deleteContract = async (maHopDong: string) => {
    setContracts((prev) => prev.filter((c) => (c.MaHD || c.ma_hop_dong) !== maHopDong));
  };

  return {
    breadcrumbItems,
    // state and setters expected by page.tsx
    state: {
      currentPage: safeCurrentPage,
      searchTerm,
      selectedloai_hop_dong: "",
      selectedAsset: "",
      selectedTimeRange,
      selectedStatus,
      isAddModalOpen: false,
      isDetailModalOpen: false,
    },
    setSearchTerm,
    setSelectedStatus,
    setSelectedTimeRange,
      setCurrentPage,
      setSortBy,
      setSortDir,
    // data
    summaryCards,
    paginatedContracts,
    startIndex,
    itemsPerPage,
    totalPages,
    countAllItems,
      hasNextPage,
      loading,
      error,
    // actions
    refreshContracts,
    deleteContract,
  };
}
