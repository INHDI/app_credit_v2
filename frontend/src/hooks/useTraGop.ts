import { useNavigation } from "@/hooks/useNavigation";
import { useMemo, useState, useEffect, useCallback } from "react";
import { FileText, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { API_CONFIG, ENV_CONFIG } from "@/config/config";

export interface CreditContract {
  // New API fields
  MaHD: string;
  HoTen: string;
  NgayVay: string;
  SoTienVay: number;
  KyDong: number;
  SoLanTra: number;
  LaiSuat: number;
  TrangThai: string;
  LichSuTraLai?: any[];
  DaThanhToan?: number;
  ConLai?: number;

  // Legacy fields used by existing UI (for backward compatibility)
  id?: string;
  ma_hop_dong?: string;
  ten_khach_hang?: string;
  customerInfo?: string;
  loai_hop_dong?: string;
  tong_tien_can_tra?: number;
  lai_suat?: string;
  kieu_lai_suat?: string;
  tien_da_tra?: string;
  tong_tien_con_lai?: string;
  tien_can_tra_theo_ky?: number;
  status?: string;
  statusColor?: string;
}

export interface SummaryCard {
  title: string;
  value: string;
  subtitle: string;
  description: string;
  icon: any;
  gradient: string;
  iconBg: string;
  textColor: string;
}

export function useTraGop() {
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
      label: "Trả góp",
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
  const [selectedloai_hop_dong, setSelectedloai_hop_dong] = useState<string>("all");

  const itemsPerPage = 10;
  const [sortBy, setSortBy] = useState<string>("NgayVay");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL(`${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.TRA_GOP}`);
      url.searchParams.set("page", String(currentPage));
      url.searchParams.set("page_size", String(itemsPerPage));
      url.searchParams.set("sort_by", sortBy);
      url.searchParams.set("sort_dir", sortDir);
      if (selectedStatus && selectedStatus !== "all") {
        url.searchParams.set("status", selectedStatus);
      }
      if (searchTerm.trim()) {
        url.searchParams.set("search", searchTerm.trim());
      }

      const resp = await fetch(url.toString(), { headers: { accept: "application/json" } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json?.success && Array.isArray(json.data)) {
        setContracts(json.data as CreditContract[]);
      } else {
        setContracts([]);
      }
    } catch (e: any) {
      setError(e?.message || "Fetch trả góp thất bại");
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortBy, sortDir, selectedStatus, searchTerm]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Derived
  const filteredContracts = useMemo(() => {
    // server-side filtering by search/status now
    return contracts;
  }, [contracts]);

  // Server-side pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContracts = filteredContracts;
  const countAllItems = startIndex + paginatedContracts.length;
  const totalPages = 0; // unknown
  const safeCurrentPage = currentPage;
  const hasNextPage = paginatedContracts.length === itemsPerPage;

  // Summary
  const summaryStats = useMemo(() => {
    const totalContracts = filteredContracts.length;
    const activeContracts = filteredContracts.filter((c) => (c.TrangThai || c.status) !== "Đã tất toán").length;
    const totaltong_tien_vay = filteredContracts.reduce((sum, c) => sum + (c.SoTienVay || c.tong_tien_can_tra || 0), 0);
    const totaltien_da_tra = filteredContracts.reduce((sum, c) => sum + (c.DaThanhToan || parseFloat(c.tien_da_tra || "0") || 0), 0);
    const totaltong_tien_con_lai = filteredContracts.reduce((sum, c) => sum + (c.ConLai || parseFloat(c.tong_tien_con_lai || "0") || 0), 0);
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
    },
  ];

  // Actions
  const openDetailModal = (contract: CreditContract) => {
    console.log("open detail", contract);
  };
  const refreshContracts = async () => {
    await fetchContracts();
  };
  const deleteContract = async (maHopDong: string) => {
    setContracts((prev) => prev.filter((c) => c.ma_hop_dong !== maHopDong));
  };

  return {
    breadcrumbItems,
    state: {
      currentPage: safeCurrentPage,
      searchTerm,
      selectedloai_hop_dong,
      selectedAsset: "",
      selectedTimeRange,
      selectedStatus,
      isAddModalOpen: false,
      isDetailModalOpen: false,
    },
    setSearchTerm,
    setSelectedloai_hop_dong,
    setSelectedStatus,
    setSelectedTimeRange,
    setCurrentPage,
    summaryCards,
    paginatedContracts,
    startIndex,
    itemsPerPage,
    totalPages,
    countAllItems,
    hasNextPage,
    loading,
    error,
    openDetailModal,
    refreshContracts,
    deleteContract,
  };
}


