"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { useTinChap } from "@/hooks/useTinChap";
import { useEffect, useState } from "react";
import { Plus, Download } from "lucide-react";
import TinChapSummary from "./TinChapSummary";
import TinChapFilter from "./TinChapFilter";
import TinChapTable from "./TinChapTable";
import TinChapPagination from "./TinChapPagination";
import AddTinChapModal from "./AddTinChapModal";
import { useTinChapEvents } from "@/hooks/useWebSocket";
import { ExportService } from "@/services/exportApi";
import ExportModal from "@/components/ui/ExportModal";

export default function Page() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    console.log("TinChapPage");
  }, []);

  // Subscribe to WebSocket events for real-time updates
  useTinChapEvents((data, message) => {
    console.log('📡 TinChap WebSocket event received:', message.type);
    // Auto-refresh list when data changes
    refreshContracts();
  });

  const {
    breadcrumbItems,
    state,
    setSearchTerm,
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
    loading: listLoading,
    error: listError,
    refreshContracts,
    deleteContract,
  } = useTinChap();

  const handleAddContract = async (data: any) => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('New Tin Chap contract:', data);

      setSuccess('Tạo hợp đồng tín chấp thành công!');

      // Refresh contracts list
      await refreshContracts();

      // Close modal after a short delay
      setTimeout(() => {
        setIsAddModalOpen(false);
        setSuccess(null);
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tạo hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  // Extract unique debtors from contracts
  const debtors = Object.values(
    paginatedContracts.reduce((acc: any, contract: any) => {
      const name = contract.HoTen;
      if (!acc[name]) {
        acc[name] = { name, count: 0 };
      }
      acc[name].count += 1;
      return acc;
    }, {})
  );

  const handleExport = async (selectedNames: string[]) => {
    try {
      setExporting(true);
      await ExportService.exportTinChap({
        ho_ten_list: selectedNames.length > 0 ? selectedNames.join(',') : undefined,
      });
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message || 'Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setIsExportModalOpen(true)}
        disabled={exporting}
        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg rounded-xl px-4 py-2 flex items-center gap-2 disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        Xuất Excel
      </button>
      <button
        type="button"
        onClick={() => setIsAddModalOpen(true)}
        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg rounded-xl px-4 py-2 flex items-center gap-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Thêm hợp đồng mới
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Quản lý Tín chấp"
        description="Theo dõi và quản lý các hợp đồng tín chấp một cách hiệu quả"
        breadcrumbs={breadcrumbItems}
        actions={headerActions}
      />
      <TinChapFilter
        searchTerm={state.searchTerm}
        setSearchTerm={setSearchTerm}
        selectedStatus={state.selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedTimeRange={state.selectedTimeRange}
        setSelectedTimeRange={setSelectedTimeRange}
      />
      <TinChapSummary summaryCards={summaryCards} />
      {listError && (
        <div className="mx-6 my-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{listError}</div>
      )}
      <TinChapTable
        contracts={paginatedContracts}
        startIndex={startIndex}
        itemsPerPage={itemsPerPage}
        onSettled={refreshContracts}
        onDelete={async (ma) => { await deleteContract(ma); await refreshContracts(); }}
      />
      <TinChapPagination
        currentPage={state.currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        itemsPerPage={itemsPerPage}
        countAllItems={countAllItems}
        hasNextPage={hasNextPage}
      />

      {/* Add Contract Modal */}
      <AddTinChapModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setError(null);
          setSuccess(null);
        }}
        onSave={handleAddContract}
        loading={loading}
        error={error}
        success={success}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        debtors={debtors as any[]}
        type="tinchap"
      />
    </div>
  );
}


