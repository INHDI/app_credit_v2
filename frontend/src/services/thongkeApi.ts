import { API_HEADERS, ENV_CONFIG } from '@/config/config';
import { getAuthHeaders } from './authApi';

export type Granularity = "daily" | "weekly" | "monthly";
// ... (keep types)

// ...

export const fetchThongKe = async (
  granularity: Granularity,
  startDate: string, // DD-MM-YYYY
  endDate: string // DD-MM-YYYY
): Promise<ThongKeApiResponse> => {
  const url = new URL(`${ENV_CONFIG.API_BASE_URL}/lich-su/statistics`);
  url.searchParams.set('granularity', granularity);
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);

  const response = await fetch(url.toString(), {
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

