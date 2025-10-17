import { API_CONFIG, ENV_CONFIG, API_HEADERS } from '@/config/config';

// API Response Types
export interface LichSuStatisticsByDate {
  ngay: string;              // "2025-01-01"
  so_nguoi_da_tra: number;   // Số người đã trả
  so_nguoi_chua_tra: number; // Số người chưa trả
}

export interface LichSuDetail {
  stt: number;               // Số thứ tự
  ngay: string;              // "2025-01-01"
  ma_hd: string;             // "TC001" hoặc "TG001"
  ho_ten: string;            // Họ tên khách hàng
  so_tien_thanh_toan: number;// Số tiền đã thanh toán
  loai_hop_dong: string;     // "Tín chấp" hoặc "Trả góp"
  trang_thai: string;        // "Đã thanh toán", "Chưa thanh toán", etc.
}

export interface LichSuData {
  statistics: LichSuStatisticsByDate[];
  details: LichSuDetail[];
  total_records: number;
}

export interface LichSuApiResponse {
  success: boolean;
  data: LichSuData;
  message: string;
  error: string | null;
}

// API Function to fetch history data
export const fetchLichSu = async (
  tuNgay?: string | null, 
  denNgay?: string | null
): Promise<LichSuApiResponse> => {
  const params = new URLSearchParams();
  
  if (tuNgay) {
    params.append('tu_ngay', tuNgay);
  }
  if (denNgay) {
    params.append('den_ngay', denNgay);
  }
  
  const queryString = params.toString();
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.LICH_SU}${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: API_HEADERS.JSON_ACCEPT,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

