/**
 * Định dạng số tiền thành chuỗi tiền tệ VNĐ
 */
export const formatCurrency = (amount: string | number): string => {
  const raw = typeof amount === 'string' ? amount : String(amount);
  const parsed = Number(raw.replace(/[^\d.-]/g, ''));
  if (Number.isNaN(parsed)) return '0';
  const roundedToThousands = Math.round(parsed / 1000) * 1000;
  return roundedToThousands.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

/**
 * Định dạng số thành chuỗi có dấu phẩy
 */
export const formatNumber = (num: string | number): string => {
  const raw = typeof num === 'string' ? num : String(num);
  const parsed = Number(raw.replace(/[^\d.-]/g, ''));
  if (Number.isNaN(parsed)) return '0';
  const roundedToThousands = Math.round(parsed / 1000) * 1000;
  return roundedToThousands.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

/**
 * Định dạng ngày thành chuỗi ngày/tháng/năm
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  } catch {
    return dateString;
  }
};
