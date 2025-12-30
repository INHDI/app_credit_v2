import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, DollarSign, Calendar } from 'lucide-react';

interface Contract {
    MaHD: string;
    HoTen: string;
    NgayVay: string;
    SoTienVay: number;
    KyDong: number;
    LaiSuat: number;
    TrangThai: string;
    contract_type: 'tin_chap' | 'tra_gop';
    // Optional fields from API enrichment
    LaiDaTra?: number;
    GocConLai?: number;
    LaiConLai?: number;
    DaThanhToan?: number;
    ConLai?: number;
    SoLanTra?: number;
}

interface DebtorTableProps {
    contracts: Contract[];
    startIndex: number;
    onViewDetail: (contract: Contract) => void;
    onViewSchedule?: (contract: Contract) => void;
    onPay: (contract: Contract) => void;
}

export default function DebtorTable({ contracts, startIndex, onViewDetail, onViewSchedule, onPay }: DebtorTableProps) {
    const formatCurrency = (val: number | undefined) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const getStatusColor = (status: string) => {
        if (status?.includes('tất toán') || status?.includes('da_thanh_toan')) return 'bg-emerald-100 text-emerald-700';
        if (status?.includes('một phần')) return 'bg-blue-100 text-blue-700';
        if (status?.includes('Đóng đủ')) return 'bg-indigo-100 text-indigo-700';
        if (status?.includes('Chưa')) return 'bg-amber-100 text-amber-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <TooltipProvider>
            <div className="mb-6">
                {/* Desktop View */}
                <div className="overflow-x-auto hidden md:block rounded-xl border border-slate-200">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-slate-50 to-teal-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left p-4 font-semibold text-slate-700 text-sm">STT</th>
                                <th className="text-left p-4 font-semibold text-slate-700 text-sm">Mã hợp đồng</th>
                                <th className="text-left p-4 font-semibold text-slate-700 text-sm">Khách hàng</th>
                                <th className="text-left p-4 font-semibold text-slate-700 text-sm">Ngày vay</th>
                                <th className="text-right p-4 font-semibold text-slate-700 text-sm">Số tiền vay</th>
                                <th className="text-right p-4 font-semibold text-slate-700 text-sm">Đã trả</th>
                                <th className="text-right p-4 font-semibold text-slate-700 text-sm">Còn lại</th>
                                <th className="text-center p-4 font-semibold text-slate-700 text-sm">Trạng thái</th>
                                <th className="text-center p-4 font-semibold text-slate-700 text-sm">Chức năng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contracts.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-500">
                                        Không có hợp đồng nào
                                    </td>
                                </tr>
                            ) : contracts.map((contract, index) => {
                                // Logic to determine display values
                                const isTinChap = contract.contract_type === 'tin_chap';
                                const daTra = isTinChap ? (contract.LaiDaTra || 0) : (contract.DaThanhToan || contract.LaiDaTra || 0);
                                const conLai = isTinChap ? ((contract.GocConLai || 0) + (contract.LaiConLai || 0)) : (contract.ConLai || contract.GocConLai || 0);

                                return (
                                    <tr key={contract.MaHD} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-slate-600 font-medium">{startIndex + index + 1}</td>
                                        <td className="p-4">
                                            <div className="space-y-1">
                                                <div className="font-semibold text-slate-800 text-sm">{contract.MaHD}</div>
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                                                    {isTinChap ? 'Tín chấp' : 'Trả góp'}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-slate-800">{contract.HoTen}</div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {contract.NgayVay}
                                        </td>
                                        <td className="p-4 text-right font-bold text-slate-800 text-sm">
                                            {formatCurrency(contract.SoTienVay)}
                                        </td>
                                        <td className="p-4 text-right font-bold text-emerald-600 text-sm">
                                            {formatCurrency(daTra)}
                                        </td>
                                        <td className="p-4 text-right font-bold text-rose-600 text-sm">
                                            {formatCurrency(conLai)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <Badge className={`${getStatusColor(contract.TrangThai)} border-0 shadow-sm`}>
                                                {contract.TrangThai}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => onViewDetail(contract)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Xem chi tiết</TooltipContent>
                                                </Tooltip>

                                                {!isTinChap && onViewSchedule && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                                                onClick={() => onViewSchedule(contract)}
                                                            >
                                                                <Calendar className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Xem lịch trả</TooltipContent>
                                                    </Tooltip>
                                                )}

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            onClick={() => onPay(contract)}
                                                        >
                                                            <DollarSign className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Tất toán</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                    {contracts.map((contract, index) => {
                        const isTinChap = contract.contract_type === 'tin_chap';
                        const daTra = isTinChap ? (contract.LaiDaTra || 0) : (contract.DaThanhToan || contract.LaiDaTra || 0);
                        const conLai = isTinChap ? ((contract.GocConLai || 0) + (contract.LaiConLai || 0)) : (contract.ConLai || contract.GocConLai || 0);

                        return (
                            <div key={contract.MaHD} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-800">{contract.MaHD}</span>
                                            <Badge variant="secondary" className="text-[10px]">{isTinChap ? 'TC' : 'TG'}</Badge>
                                        </div>
                                        <div className="text-sm text-slate-500">{contract.HoTen}</div>
                                    </div>
                                    <Badge className={getStatusColor(contract.TrangThai)}>{contract.TrangThai}</Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase font-bold">Vay</p>
                                        <p className="font-bold text-slate-800">{formatCurrency(contract.SoTienVay)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-500 text-xs uppercase font-bold">Ngày vay</p>
                                        <p className="font-medium text-slate-700">{contract.NgayVay}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase font-bold">Đã trả</p>
                                        <p className="font-bold text-emerald-600">{formatCurrency(daTra)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-500 text-xs uppercase font-bold">Còn lại</p>
                                        <p className="font-bold text-rose-600">{formatCurrency(conLai)}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => onViewDetail(contract)}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Chi tiết
                                    </Button>
                                    {!isTinChap && onViewSchedule && (
                                        <Button
                                            variant="outline"
                                            className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                                            onClick={() => onViewSchedule(contract)}
                                        >
                                            <Calendar className="w-4 h-4 mr-2" />
                                            Lịch trả
                                        </Button>
                                    )}
                                    <Button
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => onPay(contract)}
                                    >
                                        <DollarSign className="w-4 h-4 mr-2" />
                                        Tất toán
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </TooltipProvider>
    );
}
