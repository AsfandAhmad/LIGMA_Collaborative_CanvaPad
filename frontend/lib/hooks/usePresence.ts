// usePresence Hook
// React hook for tracking user presence and cursor positions via WebSocket

import { useState, useEffect, useCallback, useRef } from 'react';
import { Awareness, type UserCursor } from '../yjs/awareness';
import { useAuth } from '../auth-context';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

let globalAwareness: Awareness | null = null;
let globalWs: WebSocket | null = null;

export interface UsePresenceOptions {
  roomId: string;
  autoConnect?: boolean;
}

export interface UsePresenceReturn {
  cursors: UserCursor[];
  isConnected: boolean;
  updateCursor: (x: number, y: number) => void;
  connect: () => void;
  disconnect: () => void;
}

export function usePresence(options: UsePresenceOptions): UsePresenceReturn {
  const { roomId, autoConnect = true } = options;
  const { user } = useAuth();
  const [cursors, setCursors] = useState<UserCursor[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const awarenessRef = useRef<Awareness | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize awareness
  useEffect(() => {
    if (!globalAwareness) {
      globalAwareness = new Awareness();
    }
    awarenessRef.current = globalAwareness;

    if (user) {
      globalAwareness.setLocalUser(user.id);
    }

    // Subscribe to cursor changes
    const unsubscribe = globalAwareness.subscribe(() => {
      setCursors(globalAwareness!.getCursors());
    });

    // Cleanup stale cursors every 10 seconds
    const cleanupInterval = setInterval(() => {
      globalAwareness?.cleanupStaleCursors();
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [user]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!user) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('[usePresence] No auth token found');
      return;
    }

    try {
      const url = `${WS_URL}/ws?token=${encodeURIComponent(token)}&roomId=${encodeURIComponent(roomId)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      globalWs = ws;

      ws.onopen = () => {
        console.log(`[usePresence] Connected to room ${roomId}`);
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'CURSOR_MOVE') {
            const { userId, userName, userColor, x, y } = message.payload;
            awarenessRef.current?.updateCursor(userId, { userName, userColor, x, y });
          } else if (message.type === 'CURSOR_SNAPSHOT') {
            // Initial cursor positions from server
            message.cursors?.forEach((cursor: UserCursor) => {
              awarenessRef.current?.updateCursor(cursor.userId, {
                userName: cursor.userName,
                userColor: cursor.userColor,
                x: cursor.x,
                y: cursor.y,
              });
            });
          } else if (message.type === 'USER_LEFT') {
            awarenessRef.current?.removeCursor(message.userId);
          }
        } catch (error) {
          console.error('[usePresence] Message parse error:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`[usePresence] Disconnected from room ${roomId}`, event.code, event.reason);
        setIsConnected(false);
        awarenessRef.current?.clear();

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`[usePresence] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[usePresence] WebSocket error:', error);
      };

    } catch (error) {
      console.error('[usePresence] Connection error:', error);
    }
  }, [roomId, user]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      globalWs = null;
    }

    setIsConnected(false);
    awarenessRef.current?.clear();
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && user) {
      connect();
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive for other components
    };
  }, [autoConnect, user, connect]);

  // Update cursor position
  const updateCursor = useCallback((x: number, y: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!user) return;

    // Send cursor update to server
    wsRef.current.send(JSON.stringify({
      type: 'CURSOR_MOVE',
      payload: { x, y },
    }));
  }, [user]);

  return {
    cursors,
    isConnected,
    updateCursor,
    connect,
    disconnect,
  };
}
