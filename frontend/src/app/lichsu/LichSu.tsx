"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DateRangeFilter from "./DateRangeFilter";
import StatisticsTable from "./StatisticsTable";
import StatisticsChart from "./StatisticsChart";
import SearchFilter from "./SearchFilter";
import LichSuTable from "./LichSuTable";
import LichSuPagination from "./LichSuPagination";
import { fetchLichSu, LichSuData } from "@/services/lichsuApi";
import { formatDateForInput, formatDateForAPI } from "@/lib/utils";
import { useMemo } from "react";
import { useWebSocketEvents } from "@/hooks/useWebSocket";
import { WebSocketEventType } from "@/types/websocket";

export default function LichSu() {
  const [lichSuData, setLichSuData] = useState<LichSuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states - initialize with current month (1st to last day of month)
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [fromDate, setFromDate] = useState(formatDateForInput(firstDayOfMonth));
  const [toDate, setToDate] = useState(formatDateForInput(lastDayOfMonth));
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch data function
  const loadLichSuData = useCallback(async (tuNgay?: string, denNgay?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchLichSu(tuNgay, denNgay);
      
      if (response.success) {
        setLichSuData(response.data);
        console.log('🔄 LichSu data refreshed');
      } else {
        setError(response.message || 'Không thể tải dữ liệu');
      }
    } catch (err) {
      setError('Lỗi kết nối đến server');
      console.error('LichSu fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data on mount
  useEffect(() => {
    // Load with current month filter
    const tuNgay = formatDateForAPI(firstDayOfMonth);
    const denNgay = formatDateForAPI(lastDayOfMonth);
    loadLichSuData(tuNgay, denNgay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to WebSocket events for real-time updates
  useWebSocketEvents(
    [
      WebSocketEventType.LICH_SU_TRA_LAI_CREATED,
      WebSocketEventType.LICH_SU_TRA_LAI_UPDATED,
      WebSocketEventType.LICH_SU_TRA_LAI_DELETED,
      WebSocketEventType.TIN_CHAP_CREATED,
      WebSocketEventType.TIN_CHAP_UPDATED,
      WebSocketEventType.TRA_GOP_CREATED,
      WebSocketEventType.TRA_GOP_UPDATED,
    ],
    (data, message) => {
      console.log('📡 LichSu page received WebSocket event:', message.type);
      // Refresh with current date filter
      const tuNgay = formatDateForAPI(new Date(fromDate));
      const denNgay = formatDateForAPI(new Date(toDate));
      loadLichSuData(tuNgay, denNgay);
    }
  );

  // Handle search button click
  const handleSearch = () => {
    if (!fromDate || !toDate) {
      setError('Vui lòng chọn cả từ ngày và đến ngày');
      return;
    }

    // Convert from YYYY-MM-DD to DD-MM-YYYY for API
    const tuNgay = formatDateForAPI(new Date(fromDate));
    const denNgay = formatDateForAPI(new Date(toDate));
    
    // Reset to page 1 when searching
    setCurrentPage(1);
    loadLichSuData(tuNgay, denNgay);
  };

  // Handle reset to default date range (current month)
  const handleReset = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setFromDate(formatDateForInput(firstDayOfMonth));
    setToDate(formatDateForInput(lastDayOfMonth));
    setCurrentPage(1);
  };

  // Filter by search term
  const filteredDetails = useMemo(() => {
    if (!lichSuData?.details) return [];
    if (!searchTerm.trim()) return lichSuData.details;
    
    const lowerSearch = searchTerm.toLowerCase().trim();
    return lichSuData.details.filter(item => 
      item.ma_hd.toLowerCase().includes(lowerSearch) ||
      item.ho_ten.toLowerCase().includes(lowerSearch)
    );
  }, [lichSuData?.details, searchTerm]);

  // Pagination calculations
  const paginatedDetails = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDetails.slice(startIndex, endIndex);
  }, [filteredDetails, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredDetails.length / itemsPerPage);
  }, [filteredDetails.length, itemsPerPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const countAllItems = filteredDetails.length;

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6" suppressHydrationWarning>
        <PageHeader
          title="Lịch sử"
          description="Thống kê và chi tiết lịch sử trả lãi"
          breadcrumbs={[
            { label: "Trang chủ", href: "/" },
            { label: "Lịch sử" }
          ]}
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
  if (error && !lichSuData) {
    return (
      <div className="space-y-4 md:space-y-6" suppressHydrationWarning>
        <PageHeader
          title="Lịch sử"
          description="Thống kê và chi tiết lịch sử trả lãi"
          breadcrumbs={[
            { label: "Trang chủ", href: "/" },
            { label: "Lịch sử" }
          ]}
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
        title="Lịch sử"
        description={`Thống kê và chi tiết lịch sử trả lãi - Tổng ${lichSuData?.total_records || 0} bản ghi`}
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Lịch sử" }
        ]}
      />

      {/* Date Range Filter */}
      <DateRangeFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Error message if any during search */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      

      {/* Statistics Chart */}
      {lichSuData && (
        <StatisticsChart statistics={lichSuData.statistics} />
      )}

      {/* Statistics Table */}
      {lichSuData && (
        <StatisticsTable statistics={lichSuData.statistics} />
      )}

      {/* Search Filter */}
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Details Table with Pagination */}
      {lichSuData && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <LichSuTable details={paginatedDetails} startIndex={startIndex} />
          {filteredDetails.length > 0 ? (
            <LichSuPagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              itemsPerPage={itemsPerPage}
              countAllItems={countAllItems}
            />
          ) : (
            <div className="p-6 text-center text-slate-500">
              {searchTerm ? (
                <>Không tìm thấy kết quả cho <span className="font-semibold text-blue-600">"{searchTerm}"</span></>
              ) : (
                <>Không có dữ liệu</>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

