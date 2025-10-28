/**
 * WebSocket Service
 * Manages WebSocket connection, reconnection, and event handling
 */
import { API_CONFIG, WS_CONFIG } from '@/config/config';
import {
  WebSocketEventType,
  WebSocketMessage,
  WebSocketStatus,
  WebSocketEventListener,
  WebSocketEventListeners,
  WebSocketServiceOptions
} from '@/types/websocket';

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private clientId: string;
  private status: WebSocketStatus = WebSocketStatus.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private pingInterval: number;
  // Use browser timer IDs (number) to avoid NodeJS namespace issues in the frontend
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private eventListeners: WebSocketEventListeners<unknown> = new Map();
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();

  constructor(options: WebSocketServiceOptions) {
    this.url = options.url;
    this.clientId = options.clientId;
    this.reconnectInterval = options.reconnectInterval || WS_CONFIG.RECONNECT_INTERVAL;
    this.maxReconnectAttempts = options.maxReconnectAttempts || WS_CONFIG.MAX_RECONNECT_ATTEMPTS;
    this.pingInterval = options.pingInterval || WS_CONFIG.PING_INTERVAL;

    if (options.autoConnect !== false) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log('[WebSocket] Already connected or connecting');
      return;
    }

    try {
      this.setStatus(WebSocketStatus.CONNECTING);
      const wsUrl = `${this.url}/${this.clientId}`;
      console.log('[WebSocket] Connecting to:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.setStatus(WebSocketStatus.ERROR);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    console.log('[WebSocket] Disconnecting...');
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    this.clearTimers();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus(WebSocketStatus.DISCONNECTED);
  }

  /**
   * Send message to server
   */
  send(message: Partial<WebSocketMessage<unknown>>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket] Cannot send message: not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      console.log('[WebSocket] Sent:', message.type);
    } catch (error) {
      console.error('[WebSocket] Send error:', error);
    }
  }

  /**
   * Subscribe to an event
   */
  on<T = unknown>(event: WebSocketEventType | string, listener: WebSocketEventListener<T>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set<WebSocketEventListener<unknown>>());
    }

    this.eventListeners.get(event)!.add(listener as WebSocketEventListener<unknown>);
    // console.log('[WebSocket] Subscribed to:', event);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  /**
   * Unsubscribe from an event
   */
  off<T = unknown>(event: WebSocketEventType | string, listener: WebSocketEventListener<T>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener as WebSocketEventListener<unknown>);

      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(listener: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(listener);
    // Immediately call with current status
    listener(this.status);

    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === WebSocketStatus.CONNECTED;
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('[WebSocket] ✅ Connected');
    this.reconnectAttempts = 0;
    this.setStatus(WebSocketStatus.CONNECTED);
    this.startPing();
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage<unknown> = JSON.parse(event.data);
      console.log('[WebSocket] 📨 Received:', message.type, message);

      // Emit to specific event listeners
      const listeners = this.eventListeners.get(message.type);
      if (listeners) {
        listeners.forEach(listener => {
          try {
            (listener as WebSocketEventListener<unknown>)(message.data, message);
          } catch (error) {
            console.error('[WebSocket] Listener error:', error);
          }
        });
      }

      // Handle special events
      if (message.type === WebSocketEventType.PONG) {
        // Pong received, connection is alive
      }
    } catch (error) {
      console.error('[WebSocket] Message parse error:', error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('[WebSocket] ❌ Error:', event);
    this.setStatus(WebSocketStatus.ERROR);
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.clearTimers();
    this.setStatus(WebSocketStatus.DISCONNECTED);
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.setStatus(WebSocketStatus.RECONNECTING);

    console.log(
      `[WebSocket] Reconnecting in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Start ping interval
   */
  private startPing(): void {
    this.clearPingTimer();

    this.pingTimer = window.setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: WebSocketEventType.PING,
          data: { timestamp: new Date().toISOString() }
        });
      }
    }, this.pingInterval);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearPingTimer();
    this.clearReconnectTimer();
  }

  /**
   * Clear ping timer
   */
  private clearPingTimer(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Set connection status and notify listeners
   */
  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status;

      this.statusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('[WebSocket] Status listener error:', error);
        }
      });
    }
  }
}

// Singleton instance
let websocketInstance: WebSocketService | null = null;

/**
 * Get WebSocket service instance
 */
export const getWebSocketService = (clientId?: string): WebSocketService => {
  if (!websocketInstance && clientId) {
    const wsUrl = `${API_CONFIG.WS_URL}${API_CONFIG.ENDPOINTS.WEBSOCKET}`;
    websocketInstance = new WebSocketService({
      url: wsUrl,
      clientId: clientId,
      autoConnect: true
    });
  }
  
  if (!websocketInstance) {
    throw new Error('WebSocket service not initialized. Provide clientId first.');
  }
  
  return websocketInstance;
};

/**
 * Initialize WebSocket service
 */
export const initWebSocketService = (clientId: string): WebSocketService => {
  const wsUrl = `${API_CONFIG.WS_URL}${API_CONFIG.ENDPOINTS.WEBSOCKET}`;
  websocketInstance = new WebSocketService({
    url: wsUrl,
    clientId: clientId,
    autoConnect: true
  });
  
  return websocketInstance;
};

/**
 * Disconnect and cleanup WebSocket service
 */
export const disconnectWebSocketService = (): void => {
  if (websocketInstance) {
    websocketInstance.disconnect();
    websocketInstance = null;
  }
};

export default WebSocketService;

