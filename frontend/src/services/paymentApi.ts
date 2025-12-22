import { API_CONFIG, ENV_CONFIG, API_HEADERS } from '@/config/config';
import { getAuthHeaders } from './authApi';

export interface BasicApiResponse<T = unknown> {
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
    headers: {
      ...API_HEADERS.JSON_ACCEPT,
      ...getAuthHeaders()
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return await resp.json();
}

// POST /lich-su-tra-lai/payHD/{maHD}?so_tien={amount}
export async function payInterestByContract(maHD: string, amount: number): Promise<BasicApiResponse> {
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.LICH_SU_TRA_LAI}/payHD/${maHD}?so_tien=${amount}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...API_HEADERS.JSON_ACCEPT,
      ...getAuthHeaders()
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return await resp.json();
}

// POST /lich-su-tra-lai/pay-full/{MaHD}
export async function payFullByContract(maHD: string, tienLai: number = 0): Promise<BasicApiResponse> {
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.LICH_SU_TRA_LAI}/pay-full/${maHD}?tien_lai=${tienLai}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...API_HEADERS.JSON_ACCEPT,
      ...getAuthHeaders()
    },
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
    headers: {
      ...API_HEADERS.JSON_ACCEPT,
      ...getAuthHeaders()
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return await resp.json();
}

// PUT /lich-su-tra-lai/{maHD}?tien_da_tra={amount}
export async function updatePaymentHistory(
  maHD: string,
  tienDaTra: number
): Promise<BasicApiResponse> {
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.LICH_SU_TRA_LAI}/${maHD}?tien_da_tra=${tienDaTra}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      ...API_HEADERS.JSON_ACCEPT,
      ...getAuthHeaders()
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return await resp.json();
}

// DELETE /lich-su-tra-lai/delete_thanh_toan?ma_hd={maHD}
export async function deletePaymentToday(maHD: string): Promise<BasicApiResponse> {
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.LICH_SU_TRA_LAI}/delete_thanh_toan?ma_hd=${encodeURIComponent(maHD)}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...API_HEADERS.JSON_ACCEPT,
      ...getAuthHeaders()
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return await resp.json();
}

// GET /lich-su-tra-lai/contract/{maHD}
export async function getPaymentHistoryByContract(maHD: string): Promise<BasicApiResponse<any[]>> {
  const url = `${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.LICH_SU_TRA_LAI}/contract/${maHD}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      ...API_HEADERS.JSON_ACCEPT,
      ...getAuthHeaders()
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return await resp.json();
}

