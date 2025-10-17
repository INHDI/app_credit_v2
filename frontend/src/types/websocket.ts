/**
 * WebSocket Event Types and Interfaces
 */

// WebSocket Event Types (matching backend)
export enum WebSocketEventType {
  // Connection events
  CONNECTION_ESTABLISHED = 'connection_established',
  CONNECTION_CLOSED = 'connection_closed',
  
  // TinChap events
  TIN_CHAP_CREATED = 'tin_chap_created',
  TIN_CHAP_UPDATED = 'tin_chap_updated',
  TIN_CHAP_DELETED = 'tin_chap_deleted',
  
  // TraGop events
  TRA_GOP_CREATED = 'tra_gop_created',
  TRA_GOP_UPDATED = 'tra_gop_updated',
  TRA_GOP_DELETED = 'tra_gop_deleted',
  
  // LichSuTraLai events
  LICH_SU_TRA_LAI_CREATED = 'lich_su_tra_lai_created',
  LICH_SU_TRA_LAI_UPDATED = 'lich_su_tra_lai_updated',
  LICH_SU_TRA_LAI_DELETED = 'lich_su_tra_lai_deleted',
  
  // Dashboard events
  DASHBOARD_UPDATED = 'dashboard_updated',
  NO_PHAI_THU_UPDATED = 'no_phai_thu_updated',
  
  // System events
  SYSTEM_NOTIFICATION = 'system_notification',
  ERROR = 'error',
  
  // Client messages
  PING = 'ping',
  PONG = 'pong',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  GET_STATUS = 'get_status'
}

// WebSocket Message Interface
export interface WebSocketMessage<T = any> {
  type: WebSocketEventType | string;
  data: T;
  message?: string;
  timestamp?: string;
  client_id?: string;
}

// WebSocket Connection Status
export enum WebSocketStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Event Listener Type
export type WebSocketEventListener<T = any> = (data: T, message: WebSocketMessage<T>) => void;

// Event Listeners Map
export type WebSocketEventListeners = Map<
  WebSocketEventType | string,
  Set<WebSocketEventListener>
>;

// WebSocket Service Options
export interface WebSocketServiceOptions {
  url: string;
  clientId: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  autoConnect?: boolean;
}

