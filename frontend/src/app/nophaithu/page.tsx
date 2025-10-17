"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import NoPhaiThuSummary from "./NoPhaiThuSummary";
import NoPhaiThuFilter from "./NoPhaiThuFilter";
import NoPhaiThuTable from "./NoPhaiThuTable";
import NoPhaiThuPagination from "./NoPhaiThuPagination";
import { formatCurrency } from "@/utils/formatters";
import ApiService from "@/services/api";

// Map API response item to table row shape
function mapApiItemToContract(item: any) {
  const maHD: string = item?.MaHD || '';
  const loaiHopDong = maHD.startsWith('TC') ? 'Tín chấp' : maHD.startsWith('TG') ? 'Trả góp' : 'Khác';
  const status: string = item?.TrangThaiNgayThanhToan || 'Không xác định';
  const statusColor = status === 'Đến hạn'
    ? 'bg-indigo-100 text-indigo-700'
    : status === 'Chưa đến hạn'
    ? 'bg-slate-100 text-slate-700'
    : status === 'Quá kỳ đóng lãi'
    ? 'bg-rose-100 text-rose-700'
    : status === 'Quá hạn'
    ? 'bg-red-100 text-red-700'
    : 'bg-blue-100 text-blue-700';

  // Theo kỳ/ngày hiển thị theo LaiSuat từ API
  const tienTheoKy = Number(item?.LaiSuat || 0);

  const tongNoChuaTra = Number(item?.LaiConLai || 0) + Number(item?.GocConLai || 0);

  return {
    id: `${maHD}`,
    ma_hop_dong: maHD,
    ten_khach_hang: item?.HoTen || '',
    loai_hop_dong: loaiHopDong,
    ngay_vay: item?.NgayVay || '',
    tong_tien_can_tra: item?.TongTienVayVaLai || 0,
    tien_can_tra_theo_ky: tienTheoKy,
    tongNoChuaTra: tongNoChuaTra,
    status,
    statusColor,
    raw: item,
  };
}

export default function NoPhaiThuPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayStatus, setSelectedPayStatus] = useState("all");
  const [selectedDueStatus, setSelectedDueStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const json = await ApiService.getNoPhaiThu('today');
        if (json?.success && Array.isArray(json.data)) {
          const mapped = json.data.map(mapApiItemToContract);
          setContracts(mapped);
        } else {
          setContracts([]);
        }
      } catch (e: any) {
        setError(e?.message || 'Tải nợ phải thu thất bại');
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.ma_hop_dong.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.ten_khach_hang.toLowerCase().includes(searchTerm.toLowerCase());

    // Derive today's pay/due status from raw.LichSuTraLai
    const list: any[] = Array.isArray(contract.raw?.LichSuTraLai) ? contract.raw.LichSuTraLai : [];
    const toDateOnly = (d: any): string => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const da = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    };
    const todayStr = toDateOnly(new Date());
    const todayRec = list.find((it: any) => toDateOnly(it.Ngay) === todayStr) || null;
    const payStatus: string = todayRec?.TrangThaiThanhToan || '';
    const dueStatus: string = todayRec?.TrangThaiNgayThanhToan || '';

    const matchesPay = selectedPayStatus === 'all' || payStatus === selectedPayStatus;
    const matchesDue = selectedDueStatus === 'all' || dueStatus === selectedDueStatus;

    return matchesSearch && matchesPay && matchesDue;
  });

  // Pagination
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContracts = filteredContracts.slice(startIndex, startIndex + itemsPerPage);

  // Summary cards
  const summaryCards = [
    {
      title: "Tổng hợp đồng",
      value: contracts.length.toString(),
      icon: "FileText",
      color: "blue"
    },
    {
      title: "Đến hạn",
      value: contracts.filter(c => c.status === 'Đến hạn').length.toString(),
      icon: "Clock",
      color: "indigo"
    },
    {
      title: "Nợ quá hạn",
      value: contracts.filter(c => c.status === 'Nợ quá hạn').length.toString(),
      icon: "AlertTriangle",
      color: "red"
    },
    {
      title: "Tổng nợ",
      value: formatCurrency(contracts.reduce((sum, c) => sum + c.tongNoChuaTra, 0)),
      icon: "DollarSign",
      color: "amber"
    }
  ];

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await ApiService.getNoPhaiThu('today');
      if (json?.success && Array.isArray(json.data)) {
        const mapped = json.data.map(mapApiItemToContract);
        setContracts(mapped);
      } else {
        setContracts([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Làm mới dữ liệu thất bại');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      <button 
        type="button" 
        onClick={handleRefresh}
        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg rounded-xl px-4 py-2 flex items-center gap-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Làm mới
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Nợ phải thu"
        description="Quản lý và theo dõi các khoản nợ phải thu từ khách hàng"
        breadcrumbs={[
          { label: "Trang chủ", href: "/" }, 
          { label: "Nợ phải thu" }
        ]}
        actions={headerActions}
      />
      
      <NoPhaiThuFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedPayStatus={selectedPayStatus}
        setSelectedPayStatus={setSelectedPayStatus}
        selectedDueStatus={selectedDueStatus}
        setSelectedDueStatus={setSelectedDueStatus}
      />
      
      <NoPhaiThuSummary summaryCards={summaryCards} />
      
      {error && (
        <div className="mx-6 my-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-600">Đang tải danh sách nợ phải thu...</div>
        ) : (
          <>
            <NoPhaiThuTable 
              contracts={paginatedContracts}
              startIndex={startIndex}
              itemsPerPage={itemsPerPage}
              onRefresh={handleRefresh}
            />
            <NoPhaiThuPagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              itemsPerPage={itemsPerPage}
              countAllItems={filteredContracts.length}
            />
          </>
        )}
      </div>
    </div>
  );
}