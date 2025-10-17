import { API_CONFIG, ENV_CONFIG, API_HEADERS } from '@/config/config';

// API Response Types based on the provided API response
export interface DashboardData {
  tong_hop_dong: number;
  tong_tien_da_thu: number;
  tong_tien_can_thu: number;
  no_phai_thu: number;
  loai_hinh_vay: {
    tin_chap: {
      so_hop_dong: number;
      tien_cho_vay: number;
      tien_da_thu: number;
      tien_no_can_tra: number;
    };
    tra_gop: {
      so_hop_dong: number;
      tien_cho_vay: number;
      tien_da_thu: number;
      tien_no_can_tra: number;
    };
  };
  ti_le_lai_thu: {
    da_thu: number;
    chua_thu: number;
  };
  ti_le_loi_nhuan: {
    tin_chap: number;
    tra_gop: number;
  };
}

export interface DashboardApiResponse {
  success: boolean;
  data: DashboardData;
  message: string;
  error: string | null;
}

// API Function to fetch dashboard data
export const fetchDashboardData = async (timePeriod: string = 'all'): Promise<DashboardApiResponse> => {
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.DASHBOARD}?time_period=${timePeriod}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: API_HEADERS.JSON_ACCEPT,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

