'use client';

/**
 * WebSocket Provider
 * Provides WebSocket context to the entire app
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initWebSocketService, disconnectWebSocketService } from '@/services/websocket';
import WebSocketService from '@/services/websocket';
import { WebSocketStatus, WebSocketEventType, WebSocketEventListener } from '@/types/websocket';

interface WebSocketContextValue {
  ws: WebSocketService | null;
  status: WebSocketStatus;
  isConnected: boolean;
  subscribe: <T = any>(event: WebSocketEventType | string, listener: WebSocketEventListener<T>) => () => void;
  unsubscribe: <T = any>(event: WebSocketEventType | string, listener: WebSocketEventListener<T>) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
  clientId?: string;
  enabled?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  clientId,
  enabled = true 
}) => {
  const [ws, setWs] = useState<WebSocketService | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>(WebSocketStatus.DISCONNECTED);

  // Initialize WebSocket
  useEffect(() => {
    if (!enabled) {
      console.log('[WebSocketProvider] WebSocket disabled');
      return;
    }

    // Generate client ID if not provided
    const finalClientId = clientId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[WebSocketProvider] Initializing WebSocket with clientId:', finalClientId);
    
    try {
      const websocketService = initWebSocketService(finalClientId);
      setWs(websocketService);
      
      // Subscribe to status changes
      const unsubscribe = websocketService.onStatusChange((newStatus) => {
        setStatus(newStatus);
      });
      
      return () => {
        console.log('[WebSocketProvider] Cleaning up WebSocket');
        unsubscribe();
        disconnectWebSocketService();
        setWs(null);
      };
    } catch (error) {
      console.error('[WebSocketProvider] Initialization error:', error);
    }
  }, [clientId, enabled]);

  // Subscribe to event
  const subscribe = useCallback(<T = any>(
    event: WebSocketEventType | string, 
    listener: WebSocketEventListener<T>
  ) => {
    if (!ws) {
      console.warn('[WebSocketProvider] Cannot subscribe: WebSocket not initialized');
      return () => {};
    }
    return ws.on(event, listener);
  }, [ws]);

  // Unsubscribe from event
  const unsubscribe = useCallback(<T = any>(
    event: WebSocketEventType | string, 
    listener: WebSocketEventListener<T>
  ) => {
    if (!ws) {
      console.warn('[WebSocketProvider] Cannot unsubscribe: WebSocket not initialized');
      return;
    }
    ws.off(event, listener);
  }, [ws]);

  const value: WebSocketContextValue = {
    ws,
    status,
    isConnected: status === WebSocketStatus.CONNECTED,
    subscribe,
    unsubscribe
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to use WebSocket context
 */
export const useWebSocketContext = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  
  return context;
};

export default WebSocketProvider;

