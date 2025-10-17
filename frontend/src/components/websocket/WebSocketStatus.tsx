'use client';

/**
 * WebSocket Status Indicator
 * Shows current WebSocket connection status
 */
import React from 'react';
import { useWebSocketStatus } from '@/hooks/useWebSocket';
import { WebSocketStatus } from '@/types/websocket';

const WebSocketStatusIndicator: React.FC = () => {
  const { status, isConnected } = useWebSocketStatus();

  const getStatusConfig = () => {
    switch (status) {
      case WebSocketStatus.CONNECTED:
        return {
          color: 'bg-green-500',
          text: 'Connected',
          icon: '✓',
          pulse: false
        };
      case WebSocketStatus.CONNECTING:
        return {
          color: 'bg-yellow-500',
          text: 'Connecting...',
          icon: '⟳',
          pulse: true
        };
      case WebSocketStatus.RECONNECTING:
        return {
          color: 'bg-orange-500',
          text: 'Reconnecting...',
          icon: '⟳',
          pulse: true
        };
      case WebSocketStatus.DISCONNECTED:
        return {
          color: 'bg-gray-500',
          text: 'Disconnected',
          icon: '○',
          pulse: false
        };
      case WebSocketStatus.ERROR:
        return {
          color: 'bg-red-500',
          text: 'Error',
          icon: '✕',
          pulse: false
        };
      default:
        return {
          color: 'bg-gray-500',
          text: 'Unknown',
          icon: '?',
          pulse: false
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
      <div className="relative flex items-center">
        <div
          className={`w-2 h-2 rounded-full ${config.color} ${
            config.pulse ? 'animate-pulse' : ''
          }`}
        />
        {config.pulse && (
          <div
            className={`absolute w-2 h-2 rounded-full ${config.color} opacity-75 animate-ping`}
          />
        )}
      </div>
      <span className="font-medium">{config.text}</span>
    </div>
  );
};

export default WebSocketStatusIndicator;

