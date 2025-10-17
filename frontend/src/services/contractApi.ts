import { API_CONFIG, API_HEADERS, ENV_CONFIG } from '@/config/config';

// API Response Types
export interface ContractCreateResponse {
  success: boolean;
  data: {
    MaHD: string;
    HoTen: string;
    NgayVay: string;
    SoTienVay: number;
    KyDong: number;
    LaiSuat: number;
    TrangThai: string;
    SoLanTra?: number; // Only for TraGop
  };
  message: string;
  error: string | null;
}

export interface LichSuTraLaiResponse {
  success: boolean;
  data: {
    success: boolean;
    message: string;
    records_created: number;
    loai_hop_dong: string;
    so_tien_moi_ky: number;
  };
  message: string;
  error: string | null;
}

// Transform frontend data to backend format
export const transformTinChapToBackend = (data: any) => {
  return {
    HoTen: data.ho_ten,
    NgayVay: data.ngay_vay.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD
    SoTienVay: data.so_tien_vay,
    KyDong: data.ky_dong,
    LaiSuat: data.lai_suat
  };
};

export const transformTraGopToBackend = (data: any) => {
  return {
    HoTen: data.ho_ten,
    NgayVay: data.ngay_vay.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD
    SoTienVay: data.so_tien_vay,
    KyDong: data.ky_dong,
    SoLanTra: data.so_lan_tra,
    LaiSuat: data.lai_suat
  };
};

// API Functions
export const createTinChapContract = async (data: any): Promise<ContractCreateResponse> => {
  const response = await fetch(`${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.TIN_CHAP}`, {
    method: 'POST',
    headers: API_HEADERS.JSON,
    body: JSON.stringify(transformTinChapToBackend(data))
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

export const createTraGopContract = async (data: any): Promise<ContractCreateResponse> => {
  const response = await fetch(`${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.TRA_GOP}`, {
    method: 'POST',
    headers: API_HEADERS.JSON,
    body: JSON.stringify(transformTraGopToBackend(data))
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

export const createLichSuTraLai = async (maHD: string): Promise<LichSuTraLaiResponse> => {
  const response = await fetch(`${ENV_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.LICH_SU_TRA_LAI}?ma_hd=${maHD}`, {
    method: 'POST',
    headers: API_HEADERS.JSON_ACCEPT
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

// Combined workflow for creating contract with payment history
export const createContractWithPaymentHistory = async (
  contractType: 'tin-chap' | 'tra-gop',
  data: any
): Promise<{ contractResponse: ContractCreateResponse; paymentResponse: LichSuTraLaiResponse }> => {
  // Step 1: Create contract
  const contractResponse = contractType === 'tin-chap' 
    ? await createTinChapContract(data)
    : await createTraGopContract(data);

  if (!contractResponse.success) {
    throw new Error(contractResponse.message || 'Failed to create contract');
  }

  // Step 2: Create payment history
  const maHD = contractResponse.data.MaHD;
  const paymentResponse = await createLichSuTraLai(maHD);

  if (!paymentResponse.success) {
    throw new Error(paymentResponse.message || 'Failed to create payment history');
  }

  return { contractResponse, paymentResponse };
};
