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

    const getToken = async (): Promise<string | null> => {
      try {
        const { supabase } = await import('../supabase');
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          localStorage.setItem('auth_token', data.session.access_token);
          return data.session.access_token;
        }
      } catch {
        // fall through
      }
      return localStorage.getItem('auth_token');
    };

    getToken().then((token) => {
      if (!token) {
        console.warn('[usePresence] No auth token — cursors disabled');
        return;
      }

      try {
        const url = `${WS_URL}/ws?token=${encodeURIComponent(token)}&roomId=${encodeURIComponent(roomId)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;
        globalWs = ws;

        ws.onopen = () => {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'CURSOR_MOVE') {
              const { userId, userName, userColor, x, y } = message.payload ?? message;
              awarenessRef.current?.updateCursor(userId ?? message.userId, {
                userName: userName ?? message.userName,
                userColor: userColor ?? message.color,
                x, y,
              });
            } else if (message.type === 'CURSOR_SNAPSHOT') {
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

        ws.onclose = () => {
          setIsConnected(false);
          awarenessRef.current?.clear();
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
            reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
          }
        };

        ws.onerror = () => {
          // Silently handle — onclose will fire next and handle reconnect
        };
      } catch (error) {
        console.warn('[usePresence] Connection error:', error);
      }
    });
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
