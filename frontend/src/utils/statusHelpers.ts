export function getDuePriority(status: string): number {
  if (status === 'Đến hạn') return 0;
  if (status === 'Chưa đến hạn') return 1;
  if (status === 'Quá hạn') return 2;
  if (status === 'Quá kỳ đóng lãi') return 3;
  return 4;
}

export function getPayStatusClass(status: string): string {
  if (status === 'Đóng đủ' || status === 'Đã tất toán') return 'bg-green-100 text-green-700';
  if (status === 'Thanh toán một phần') return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

export function getDueStatusClass(status: string): string {
  if (status === 'Đến hạn') return 'bg-indigo-100 text-indigo-700';
  if (status === 'Chưa đến hạn') return 'bg-slate-100 text-slate-700';
  if (status === 'Quá kỳ đóng lãi') return 'bg-rose-100 text-rose-700';
  if (status === 'Quá hạn') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

export function getRowHighlightClass(status: string): string {
  if (status === 'Quá hạn' || status === 'Quá kỳ đóng lãi') return 'bg-red-50/30';
  return '';
}
/**
 * Get CSS classes for status styling (text color + background color)
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'da_thanh_toan':
      return 'text-green-600 bg-green-100';  // Đóng đủ
    case 'thanh_toan_mot_phan':
      return 'text-amber-600 bg-amber-100';
    case 'tra_xong_lai':
      return 'text-blue-600 bg-blue-100';
    case 'den_han_tra_lai':
      return 'text-blue-600 bg-blue-100';    // Đến hạn
    case 'qua_han_tra_lai':
      return 'text-red-600 bg-red-100';      // Nợ quá hạn
    case 'da_tat_toan':
      return 'text-emerald-600 bg-emerald-100'; // Hoàn thành
    case 'chua_thanh_toan':
    default:
      return 'text-red-600 bg-red-100';
  }
};