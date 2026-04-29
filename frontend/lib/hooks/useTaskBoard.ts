import { useState, useEffect, useCallback } from 'react';
import { tasksApi, Task } from '../api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

export function useTaskBoard(roomId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Fetch initial tasks
  const fetchTasks = useCallback(async () => {
    if (!roomId) return;
    
    try {
      setLoading(true);
      setError(null);
      const fetchedTasks = await tasksApi.getTasks(roomId);
      setTasks(fetchedTasks);
    } catch (err: any) {
      console.error('[useTaskBoard] Failed to fetch tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!roomId || typeof roomId !== 'string') {
      console.warn('[useTaskBoard] Invalid roomId:', roomId);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    console.log('[useTaskBoard] Connecting to WebSocket with roomId:', roomId);
    // Backend allows connections without token (guest mode)
    const wsUrl = token 
      ? `${WS_URL}/ws?roomId=${roomId}&token=${token}`
      : `${WS_URL}/ws?roomId=${roomId}`;
    
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[useTaskBoard] WebSocket connected');
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        console.log('[useTaskBoard] Received message:', message.type);

        switch (message.type) {
          case 'task:created':
            setTasks((prev) => {
              // Avoid duplicates
              if (prev.find((t) => t.id === message.task.id)) {
                return prev;
              }
              return [message.task, ...prev];
            });
            break;

          case 'task:updated':
            setTasks((prev) =>
              prev.map((t) =>
                t.id === message.task.id ? { ...t, ...message.task } : t
              )
            );
            break;

          case 'task:deleted':
            setTasks((prev) => prev.filter((t) => t.id !== message.taskId));
            break;
        }
      } catch (err) {
        console.error('[useTaskBoard] Failed to parse WebSocket message:', err);
      }
    };

    websocket.onerror = (err) => {
      console.error('[useTaskBoard] WebSocket error:', err);
    };

    websocket.onclose = () => {
      console.log('[useTaskBoard] WebSocket disconnected');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [roomId]);

  // Update task status
  const updateTaskStatus = useCallback(async (taskId: string, status: Task['status']) => {
    try {
      await tasksApi.updateTaskStatus(taskId, status);
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
    } catch (err) {
      console.error('[useTaskBoard] Failed to update task status:', err);
      throw err;
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    updateTaskStatus,
    setTasks,
    ws, // Expose WebSocket for role sync
  };
}
