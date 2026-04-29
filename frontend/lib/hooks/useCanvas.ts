// useCanvas Hook
// React hook for accessing and manipulating canvas data via Yjs

import { useState, useEffect, useCallback, useRef } from 'react';
import { SyncManager } from '../yjs/syncManager';
import type { CanvasNode } from '../../types/canvas';
import { useAuth } from '../auth-context';

let globalSyncManager: SyncManager | null = null;

export interface UseCanvasOptions {
  roomId: string;
  autoConnect?: boolean;
}

export interface UseCanvasReturn {
  nodes: CanvasNode[];
  isConnected: boolean;
  isSynced: boolean;
  status: 'connecting' | 'connected' | 'disconnected';
  addNode: (node: Omit<CanvasNode, 'id' | 'createdBy' | 'createdAt'>) => string;
  updateNode: (nodeId: string, updates: Partial<Omit<CanvasNode, 'id'>>) => void;
  deleteNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeContent: (nodeId: string, content: any) => void;
  updateNodeIntent: (nodeId: string, intent: CanvasNode['intent']) => void;
  setNodeLocked: (nodeId: string, locked: boolean) => void;
  updateTaskStatus: (nodeId: string, status: CanvasNode['taskStatus']) => void;
  getNode: (nodeId: string) => CanvasNode | null;
  connect: () => void;
  disconnect: () => void;
}

export function useCanvas(options: UseCanvasOptions): UseCanvasReturn {
  const { roomId, autoConnect = true } = options;
  const { user } = useAuth();
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const syncManagerRef = useRef<SyncManager | null>(null);

  // Initialize sync manager
  useEffect(() => {
    if (!globalSyncManager) {
      globalSyncManager = new SyncManager();
    }
    syncManagerRef.current = globalSyncManager;

    // Subscribe to changes
    const unsubscribe = globalSyncManager.subscribe(() => {
      if (globalSyncManager) {
        const newNodes = globalSyncManager.getNodes();
        console.log(`[useCanvas] Nodes updated, count: ${newNodes.length}`);
        setNodes(newNodes);
        setIsConnected(globalSyncManager.isConnected());
        setIsSynced(globalSyncManager.isSynced());
      }
    });

    // Initial state
    setNodes(globalSyncManager.getNodes());

    return () => {
      unsubscribe();
    };
  }, []);

  // Connect to backend
  const connect = useCallback(() => {
    if (!syncManagerRef.current || !user) {
      console.warn('[useCanvas] Cannot connect - missing syncManager or user');
      return;
    }

    console.log(`[useCanvas] Initiating connection for user: ${user.id}`);

    // Try Supabase session first (fresh token), fall back to localStorage
    const getToken = async (): Promise<string | null> => {
      try {
        // Dynamically import supabase to get fresh session token
        const { supabase } = await import('../supabase');
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          // Keep localStorage in sync
          localStorage.setItem('auth_token', data.session.access_token);
          console.log('[useCanvas] Using Supabase session token');
          return data.session.access_token;
        }
      } catch {
        // supabase not available, fall through to localStorage
      }
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('[useCanvas] Using localStorage token');
      }
      return token;
    };

    getToken().then(async (token) => {
      if (!token) {
        console.error('❌ [useCanvas] No auth token — canvas will work offline (no sync)');
        console.error('❌ Please log in to enable real-time sync');
        return;
      }
      
      console.log(`[useCanvas] Token found, connecting to room: ${roomId}`);
      
      // Connect is now async to load initial state
      await syncManagerRef.current?.connect(roomId, token, {
        onSync: (synced) => {
          console.log(`[useCanvas] Sync status changed: ${synced}`);
          setIsSynced(synced);
        },
        onStatus: (newStatus) => {
          console.log(`[useCanvas] Connection status changed: ${newStatus}`);
          setStatus(newStatus);
          setIsConnected(newStatus === 'connected');
        },
        onError: (error) => {
          console.error('❌ [useCanvas] Connection error:', error.message);
        },
      });
    });
  }, [roomId, user]);

  // Disconnect from backend
  const disconnect = useCallback(() => {
    if (!syncManagerRef.current) return;
    syncManagerRef.current.disconnect();
    setIsConnected(false);
    setIsSynced(false);
    setStatus('disconnected');
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

  // Add a new node
  const addNode = useCallback((node: Omit<CanvasNode, 'id' | 'createdBy' | 'createdAt'>): string => {
    if (!syncManagerRef.current) {
      console.error('[useCanvas] Cannot add node - syncManager not initialized');
      return '';
    }

    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullNode: Omit<CanvasNode, 'id'> = {
      ...node,
      createdBy: user?.id || 'local',
      createdAt: new Date().toISOString(),
    };

    console.log(`[useCanvas] Adding node:`, { nodeId, type: node.type, fullNode });
    syncManagerRef.current.setNode(nodeId, fullNode);
    console.log(`[useCanvas] Node added to Yjs, current node count: ${syncManagerRef.current.getNodes().length}`);
    return nodeId;
  }, [user]);

  // Update a node
  const updateNode = useCallback((nodeId: string, updates: Partial<Omit<CanvasNode, 'id'>>) => {
    if (!syncManagerRef.current) return;
    syncManagerRef.current.updateNode(nodeId, updates as Partial<CanvasNode>);
  }, []);

  // Delete a node
  const deleteNode = useCallback((nodeId: string) => {
    if (!syncManagerRef.current) return;
    syncManagerRef.current.deleteNode(nodeId);
  }, []);

  // Update node position
  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    if (!syncManagerRef.current) return;
    syncManagerRef.current.updateNodePosition(nodeId, position);
  }, []);

  // Update node content
  const updateNodeContent = useCallback((nodeId: string, content: any) => {
    if (!syncManagerRef.current) return;
    syncManagerRef.current.updateNodeContent(nodeId, content);
  }, []);

  // Update node intent
  const updateNodeIntent = useCallback((nodeId: string, intent: CanvasNode['intent']) => {
    if (!syncManagerRef.current) return;
    syncManagerRef.current.updateNodeIntent(nodeId, intent);
  }, []);

  // Set node locked
  const setNodeLocked = useCallback((nodeId: string, locked: boolean) => {
    if (!syncManagerRef.current) return;
    syncManagerRef.current.setNodeLocked(nodeId, locked);
  }, []);

  // Update task status
  const updateTaskStatus = useCallback((nodeId: string, status: CanvasNode['taskStatus']) => {
    if (!syncManagerRef.current) return;
    syncManagerRef.current.updateTaskStatus(nodeId, status);
  }, []);

  // Get a specific node
  const getNode = useCallback((nodeId: string): CanvasNode | null => {
    if (!syncManagerRef.current) return null;
    return syncManagerRef.current.getNode(nodeId);
  }, []);

  return {
    nodes,
    isConnected,
    isSynced,
    status,
    addNode,
    updateNode,
    deleteNode,
    updateNodePosition,
    updateNodeContent,
    updateNodeIntent,
    setNodeLocked,
    updateTaskStatus,
    getNode,
    connect,
    disconnect,
  };
}
