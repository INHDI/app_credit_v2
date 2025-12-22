import { API_CONFIG, ENV_CONFIG, API_HEADERS } from '@/config/config';
import { getAuthHeaders } from './authApi';

// API Response Types
// ... (keep types as is)

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
    headers: {
      ...API_HEADERS.JSON_ACCEPT,
      ...getAuthHeaders()
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

