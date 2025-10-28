'use client';

/**
 * useWebSocket Hook
 * Custom hook to easily subscribe to WebSocket events
 */
import { useEffect, useState, useCallback } from 'react';
import { useWebSocketContext } from '@/providers/WebSocketProvider';
import { WebSocketEventType, WebSocketEventListener, WebSocketStatus } from '@/types/websocket';

interface UseWebSocketOptions<T = unknown> {
  event?: WebSocketEventType | string;
  onMessage?: WebSocketEventListener<T>;
  enabled?: boolean;
}

interface UseWebSocketReturn<T = unknown> {
  data: T | null;
  status: WebSocketStatus;
  isConnected: boolean;
  lastMessage: unknown;
  subscribe: (event: WebSocketEventType | string, listener: WebSocketEventListener<T>) => () => void;
  unsubscribe: (event: WebSocketEventType | string, listener: WebSocketEventListener<T>) => void;
}

/**
 * Hook to use WebSocket with automatic subscription
 */
export function useWebSocket<T = unknown>(
  options: UseWebSocketOptions<T> = {}
): UseWebSocketReturn<T> {
  const { ws, status, isConnected, subscribe, unsubscribe } = useWebSocketContext();
  const [data, setData] = useState<T | null>(null);
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  const { event, onMessage, enabled = true } = options;

  useEffect(() => {
    if (!enabled || !event || !ws) {
      return;
    }

    console.log('[useWebSocket] Subscribing to event:', event);

    const listener: WebSocketEventListener<T> = (eventData, message) => {
      setData(eventData);
      setLastMessage(message);
      
      if (onMessage) {
        onMessage(eventData, message);
      }
    };

    const unsubscribeFn = subscribe(event, listener);

    return () => {
      console.log('[useWebSocket] Unsubscribing from event:', event);
      unsubscribeFn();
    };
  }, [event, enabled, ws, onMessage, subscribe]);

  return {
    data,
    status,
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe
  };
}

/**
 * Hook to subscribe to multiple WebSocket events
 */
export function useWebSocketEvents<T = unknown>(
  events: (WebSocketEventType | string)[],
  onMessage?: WebSocketEventListener<T>,
  enabled: boolean = true
): UseWebSocketReturn<T> {
  const { ws, status, isConnected, subscribe, unsubscribe } = useWebSocketContext();
  const [data, setData] = useState<T | null>(null);
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  useEffect(() => {
    if (!enabled || events.length === 0 || !ws) {
      return;
    }

    // console.log('[useWebSocketEvents] Subscribing to events:', events);

    const listener: WebSocketEventListener<T> = (eventData, message) => {
      setData(eventData);
      setLastMessage(message);
      
      if (onMessage) {
        onMessage(eventData, message);
      }
    };

    // Subscribe to all events
    const unsubscribeFns = events.map(event => subscribe(event, listener));

    return () => {
      // console.log('[useWebSocketEvents] Unsubscribing from events:', events);
      unsubscribeFns.forEach(fn => fn());
    };
  }, [events.join(','), enabled, ws, onMessage, subscribe]);

  return {
    data,
    status,
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe
  };
}

/**
 * Hook to subscribe to TinChap events
 */
export function useTinChapEvents<T = unknown>(
  onMessage?: WebSocketEventListener<T>,
  enabled: boolean = true
) {
  return useWebSocketEvents<T>(
    [
      WebSocketEventType.TIN_CHAP_CREATED,
      WebSocketEventType.TIN_CHAP_UPDATED,
      WebSocketEventType.TIN_CHAP_DELETED
    ],
    onMessage,
    enabled
  );
}

/**
 * Hook to subscribe to TraGop events
 */
export function useTraGopEvents<T = unknown>(
  onMessage?: WebSocketEventListener<T>,
  enabled: boolean = true
) {
  return useWebSocketEvents<T>(
    [
      WebSocketEventType.TRA_GOP_CREATED,
      WebSocketEventType.TRA_GOP_UPDATED,
      WebSocketEventType.TRA_GOP_DELETED
    ],
    onMessage,
    enabled
  );
}

/**
 * Hook to subscribe to Dashboard events
 */
export function useDashboardEvents<T = unknown>(
  onMessage?: WebSocketEventListener<T>,
  enabled: boolean = true
) {
  return useWebSocketEvents<T>(
    [
      WebSocketEventType.DASHBOARD_UPDATED,
      WebSocketEventType.NO_PHAI_THU_UPDATED,
      WebSocketEventType.TIN_CHAP_CREATED,
      WebSocketEventType.TIN_CHAP_UPDATED,
      WebSocketEventType.TIN_CHAP_DELETED,
      WebSocketEventType.TRA_GOP_CREATED,
      WebSocketEventType.TRA_GOP_UPDATED,
      WebSocketEventType.TRA_GOP_DELETED
    ],
    onMessage,
    enabled
  );
}

/**
 * Hook to get WebSocket connection status
 */
export function useWebSocketStatus() {
  const { status, isConnected } = useWebSocketContext();
  
  return {
    status,
    isConnected,
    isConnecting: status === WebSocketStatus.CONNECTING,
    isReconnecting: status === WebSocketStatus.RECONNECTING,
    isDisconnected: status === WebSocketStatus.DISCONNECTED,
    isError: status === WebSocketStatus.ERROR
  };
}

export default useWebSocket;

