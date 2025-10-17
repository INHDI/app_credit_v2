import { API_CONFIG, ENV_CONFIG, API_HEADERS } from '@/config/config';

export interface BasicApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string | null;
  error?: string | null;
}

export async function deleteTinChapContract(maHD: string): Promise<BasicApiResponse> {
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.TIN_CHAP}/${maHD}`;
  const resp = await fetch(url, { method: 'DELETE', headers: API_HEADERS.JSON_ACCEPT });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

export async function deleteTraGopContract(maHD: string): Promise<BasicApiResponse> {
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.TRA_GOP}/${maHD}`;
  const resp = await fetch(url, { method: 'DELETE', headers: API_HEADERS.JSON_ACCEPT });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

export async function deletePaymentHistoryByContract(maHD: string): Promise<BasicApiResponse> {
  const base = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.LICH_SU_TRA_LAI}`;
  const url = `${base}/contract/${maHD}`;
  const resp = await fetch(url, { method: 'DELETE', headers: API_HEADERS.JSON_ACCEPT });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}


