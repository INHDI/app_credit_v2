"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Plus } from "lucide-react";
import { useState } from "react";
import TraGopFilter from "./TraGopFilter";
import TraGopSummary from "./TraGopSummary";
import TraGopTable from "./TraGopTable";
import TraGopPagination from "./TraGopPagination";
import AddTraGopModal from "./AddTraGopModal";
import { useTraGop } from "@/hooks/useTraGop";

export default function Page() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    breadcrumbItems,
    state,
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
    loading: listLoading,
    error: listError,
    openDetailModal,
    refreshContracts,
    deleteContract,
  } = useTraGop();

  const handleAddContract = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('New Tra Gop contract:', data);
      
      setSuccess('Tạo hợp đồng trả góp thành công!');
      
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

  const headerActions = (
    <div className="flex items-center gap-3">
      <button 
        type="button" 
        onClick={() => setIsAddModalOpen(true)} 
        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg rounded-xl px-4 py-2 flex items-center gap-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Thêm hợp đồng trả góp
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Quản lý Trả góp"
        description="Theo dõi và quản lý các hợp đồng trả góp một cách hiệu quả"
        breadcrumbs={breadcrumbItems}
        actions={headerActions}
      />

      <TraGopFilter
        searchTerm={state.searchTerm}
        setSearchTerm={setSearchTerm}
        selectedloai_hop_dong={state.selectedloai_hop_dong}
        setSelectedloai_hop_dong={setSelectedloai_hop_dong}
        selectedStatus={state.selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedTimeRange={state.selectedTimeRange}
        setSelectedTimeRange={setSelectedTimeRange}
      />

      <TraGopSummary summaryCards={summaryCards} />
      {listError && (
        <div className="mx-6 my-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{listError}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <TraGopTable
          contracts={paginatedContracts}
          startIndex={startIndex}
          itemsPerPage={itemsPerPage}
          onViewDetails={openDetailModal}
          onSettled={refreshContracts}
          onDelete={async (ma) => { await deleteContract(ma); await refreshContracts(); }}
        />
        <TraGopPagination
          currentPage={state.currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          itemsPerPage={itemsPerPage}
          countAllItems={countAllItems}
        />
      </div>

      {/* Add Contract Modal */}
      <AddTraGopModal
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
    </div>
  );
}


