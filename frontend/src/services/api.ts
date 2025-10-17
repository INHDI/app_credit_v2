import { API_CONFIG, API_HEADERS, createApiUrl } from '@/config/config';

// API Service for managing API calls
export class ApiService {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    params?: Record<string, string>
  ): Promise<T> {
    const url = createApiUrl(endpoint, params);
    
    const response = await fetch(url, {
      headers: {
        ...API_HEADERS.JSON_ACCEPT,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // No Phai Thu API
  static async getNoPhaiThu(time: string = 'today') {
    return this.request(API_CONFIG.ENDPOINTS.NO_PHAI_THU, {}, { time });
  }

  // Tin Chap API
  static async getTinChap(params?: Record<string, string>) {
    return this.request(API_CONFIG.ENDPOINTS.TIN_CHAP, {}, params);
  }

  static async createTinChap(data: any) {
    return this.request(API_CONFIG.ENDPOINTS.TIN_CHAP, {
      method: 'POST',
      headers: API_HEADERS.JSON,
      body: JSON.stringify(data),
    });
  }

  // Tra Gop API
  static async getTraGop(params?: Record<string, string>) {
    return this.request(API_CONFIG.ENDPOINTS.TRA_GOP, {}, params);
  }

  static async createTraGop(data: any) {
    return this.request(API_CONFIG.ENDPOINTS.TRA_GOP, {
      method: 'POST',
      headers: API_HEADERS.JSON,
      body: JSON.stringify(data),
    });
  }

  // Dashboard API
  static async getDashboard(timePeriod: string = 'all') {
    return this.request(API_CONFIG.ENDPOINTS.DASHBOARD, {}, { time_period: timePeriod });
  }

  // Lich Su API
  static async getLichSu(params?: Record<string, string>) {
    return this.request(API_CONFIG.ENDPOINTS.LICH_SU, {}, params);
  }
}

export default ApiService;
