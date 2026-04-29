// useTaskBoard Hook
// React hook for real-time task management with WebSocket updates

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth-context';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Task {
  id: string;
  text: string;
  status: 'todo' | 'in_progress' | 'done';
  nodeId: string;
  authorId: string;
  authorName: string;
  roomId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UseTaskBoardOptions {
  roomId: string;
  autoConnect?: boolean;
}

export interface UseTaskBoardReturn {
  tasks: Task[];
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
  fetchTasks: () => Promise<void>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  getTasksByStatus: (status: Task['status']) => Task[];
  getTaskByNodeId: (nodeId: string) => Task | null;
}

// Per-room WebSocket singleton
const roomWsMap = new Map<string, WebSocket>();
const roomRefCountMap = new Map<string, number>();

export function useTaskBoard(options: UseTaskBoardOptions): UseTaskBoardReturn {
  const { roomId, autoConnect = true } = options;
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectAttemptsRef = useRef(0);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/tasks/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data = await response.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err) {
      const e = err as Error;
      setError(e);
      console.error('[useTaskBoard] Failed to fetch tasks:', e);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Update task status
  const updateTaskStatus = useCallback(async (taskId: string, status: Task['status']) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Optimistically update local state
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      
      console.log('[useTaskBoard] Task updated:', data.task);
    } catch (err) {
      const e = err as Error;
      console.error('[useTaskBoard] Failed to update task:', e);
      throw e;
    }
  }, []);

  // Get tasks by status
  const getTasksByStatus = useCallback((status: Task['status']): Task[] => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  // Get task by node ID
  const getTaskByNodeId = useCallback((nodeId: string): Task | null => {
    return tasks.find(t => t.nodeId === nodeId) ?? null;
  }, [tasks]);

  // Connect to WebSocket for real-time updates
  const connect = useCallback(() => {
    // Reuse existing connection
    const existingWs = roomWsMap.get(roomId);
    if (existingWs?.readyState === WebSocket.OPEN) {
      setIsConnected(true);
      return;
    }
    if (existingWs?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const getToken = async (): Promise<string> => {
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
      return localStorage.getItem('auth_token') ?? '';
    };

    getToken().then((token) => {
      // Guard against race condition
      const raceWs = roomWsMap.get(roomId);
      if (raceWs?.readyState === WebSocket.OPEN || raceWs?.readyState === WebSocket.CONNECTING) {
        return;
      }

      try {
        const url = `${WS_URL}/ws?token=${encodeURIComponent(token)}&roomId=${encodeURIComponent(roomId)}`;
        const ws = new WebSocket(url);
        roomWsMap.set(roomId, ws);

        ws.onopen = () => {
          console.log('[useTaskBoard] WebSocket connected');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('[useTaskBoard] WebSocket message:', message);

            if (message.type === 'task:created') {
              // Add new task to list
              setTasks(prev => {
                // Avoid duplicates
                if (prev.find(t => t.id === message.task.id)) {
                  return prev;
                }
                return [message.task, ...prev];
              });
              console.log('[useTaskBoard] Task created:', message.task);
            } else if (message.type === 'task:updated') {
              // Update existing task
              setTasks(prev =>
                prev.map(t => t.id === message.task.id ? { ...t, ...message.task } : t)
              );
              console.log('[useTaskBoard] Task updated:', message.task);
            } else if (message.type === 'task:deleted') {
              // Remove task
              setTasks(prev => prev.filter(t => t.id !== message.taskId));
              console.log('[useTaskBoard] Task deleted:', message.taskId);
            }
          } catch (error) {
            console.error('[useTaskBoard] Message parse error:', error);
          }
        };

        ws.onclose = () => {
          console.log('[useTaskBoard] WebSocket disconnected');
          setIsConnected(false);
          
          // Remove from map if this is still the current ws
          if (roomWsMap.get(roomId) === ws) {
            roomWsMap.delete(roomId);
          }

          // Only reconnect if there are still consumers
          const refCount = roomRefCountMap.get(roomId) ?? 0;
          if (refCount <= 0) return;

          // Exponential backoff reconnect
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
            console.log(`[useTaskBoard] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
            reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
          } else {
            console.warn('[useTaskBoard] Max reconnect attempts reached');
          }
        };

        ws.onerror = (error) => {
          console.error('[useTaskBoard] WebSocket error:', error);
        };
      } catch (error) {
        console.error('[useTaskBoard] Connection error:', error);
      }
    });
  }, [roomId]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    const ws = roomWsMap.get(roomId);
    if (ws) {
      ws.close();
      roomWsMap.delete(roomId);
    }
    setIsConnected(false);
  }, [roomId]);

  // Setup: increment ref count, fetch tasks, connect WebSocket
  useEffect(() => {
    // Increment ref count
    roomRefCountMap.set(roomId, (roomRefCountMap.get(roomId) ?? 0) + 1);

    // Initial fetch
    fetchTasks();

    // Auto-connect WebSocket
    if (autoConnect) {
      connect();
    }

    return () => {
      // Decrement ref count
      const count = (roomRefCountMap.get(roomId) ?? 1) - 1;
      roomRefCountMap.set(roomId, count);

      if (count <= 0) {
        roomRefCountMap.delete(roomId);
        disconnect();
      }
    };
  }, [roomId, autoConnect, fetchTasks, connect, disconnect]);

  return {
    tasks,
    isLoading,
    isConnected,
    error,
    fetchTasks,
    updateTaskStatus,
    getTasksByStatus,
    getTaskByNodeId,
  };
}
