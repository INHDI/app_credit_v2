import { API_HEADERS, ENV_CONFIG } from '@/config/config';

export type Granularity = "daily" | "weekly" | "monthly";

export interface ThongKeMeta {
  granularity: Granularity;
  start_date: string;
  end_date: string;
  bucket_count: number;
}

export interface ThongKeSummary {
  total_disbursed: number;
  total_collected: number;
  total_interest: number;
  net_cash_flow: number;
  active_contracts: number;
  overdue_contracts: number;
  overdue_amount: number;
}

export interface BreakdownItem {
  disbursed: number;
  collected: number;
  interest: number;
}

export interface ThongKeBreakdown {
  tin_chap: BreakdownItem;
  tra_gop: BreakdownItem;
}

export interface TrendData {
  bucket: string;
  tong_tien_chi: number;
  tong_tien_thu: number;
  tong_tien_lai: number;
  breakdown: {
    tin_chap: number;
    tra_gop: number;
  };
}

export interface TopOutstandingContract {
  ma_hop_dong: string;
  amount: number;
  contract_type: "tin_chap" | "tra_gop";
  is_overdue: boolean;
}

export interface ThongKeData {
  meta: ThongKeMeta;
  summary: ThongKeSummary;
  breakdown: ThongKeBreakdown;
  trend: TrendData[];
  top_outstanding: TopOutstandingContract[];
}

export interface ThongKeApiResponse {
  success: boolean;
  data: ThongKeData;
  message: string;
  error: string | null;
}

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
    headers: API_HEADERS.JSON_ACCEPT,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

