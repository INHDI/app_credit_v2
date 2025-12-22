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

import { ApiService } from './api';

// ... interfaces retain ...

// API Function to fetch dashboard data
export const fetchDashboardData = async (timePeriod: string = 'all'): Promise<DashboardApiResponse> => {
  try {
    const response = await ApiService.getDashboard(timePeriod);
    // ApiService returns the full response object matching ApiResponse shape
    // Check if the response matches DashboardApiResponse structure or adapt it

    // Assuming ApiService.getDashboard returns ApiResponse<DashboardData>
    return response as unknown as DashboardApiResponse;
  } catch (error) {
    console.error('Fetch dashboard error:', error);
    return {
      success: false,
      data: null as any,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: 'API_ERROR'
    };
  }
};

