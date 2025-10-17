// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://10.15.7.22:8088',
  WS_URL: 'ws://10.15.7.22:8088',
  ENDPOINTS: {
    TIN_CHAP: '/tin-chap',
    TRA_GOP: '/tra-gop',
    LICH_SU_TRA_LAI: '/lich-su-tra-lai',
    DASHBOARD: '/dashboard',
    LICH_SU: '/lich-su',
    NO_PHAI_THU: '/no-phai-thu',
    WEBSOCKET: '/ws'
  }
} as const;

// API Headers
export const API_HEADERS = {
  JSON: {
    'accept': 'application/json',
    'Content-Type': 'application/json'
  },
  JSON_ACCEPT: {
    'accept': 'application/json'
  }
} as const;

// Environment Configuration
export const ENV_CONFIG = {
  API_BASE_URL: API_CONFIG.BASE_URL,
  IS_DEVELOPMENT: true,
  IS_PRODUCTION: false
} as const;

// WebSocket Configuration
export const WS_CONFIG = {
  RECONNECT_INTERVAL: 3000, // 3 seconds
  MAX_RECONNECT_ATTEMPTS: 10,
  PING_INTERVAL: 30000, // 30 seconds
  PONG_TIMEOUT: 5000 // 5 seconds
} as const;

// Helper function to create API URLs
export const createApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  const baseUrl = ENV_CONFIG.API_BASE_URL;
  const url = new URL(endpoint, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  return url.toString();
};
