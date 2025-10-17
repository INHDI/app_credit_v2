"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { useTinChap } from "@/hooks/useTinChap";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import TinChapSummary from "./TinChapSummary";
import TinChapFilter from "./TinChapFilter";
import TinChapTable from "./TinChapTable";
import TinChapPagination from "./TinChapPagination";
import AddTinChapModal from "./AddTinChapModal";

export default function Page() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    console.log("TinChapPage");
  }, []);

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

  const headerActions = (
    <div className="flex items-center gap-3">
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
    </div>
  );
}


