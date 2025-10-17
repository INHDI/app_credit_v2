import { API_CONFIG, ENV_CONFIG, API_HEADERS } from '@/config/config';

export interface BasicApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string | null;
  error?: string | null;
}

// POST /lich-su-tra-lai/pay/{stt}?so_tien={amount}
export async function payInterestByRecord(stt: number | string, amount: number): Promise<BasicApiResponse> {
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.LICH_SU_TRA_LAI}/pay/${stt}?so_tien=${amount}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: API_HEADERS.JSON_ACCEPT,
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return await resp.json();
}

// POST /lich-su-tra-lai/pay-full/{MaHD}
export async function payFullByContract(maHD: string): Promise<BasicApiResponse> {
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.LICH_SU_TRA_LAI}/pay-full/${maHD}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: API_HEADERS.JSON_ACCEPT,
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return await resp.json();
}

// PUT /tin-chap/tra-goc/{MaHD}?so_tien_tra_goc={amount}
export async function payPrincipalTinChap(maHD: string, amount: number): Promise<BasicApiResponse> {
  const base = `${ENV_CONFIG.API_BASE_URL}`;
  const url = `${base}/tin-chap/tra-goc/${maHD}?so_tien_tra_goc=${amount}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: API_HEADERS.JSON_ACCEPT,
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return await resp.json();
}


