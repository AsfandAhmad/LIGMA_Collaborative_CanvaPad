// useCanvas Hook
// React hook for accessing and manipulating canvas data via Yjs

import { useState, useEffect, useCallback, useRef } from 'react';
import { SyncManager, type CanvasNode } from '../yjs/syncManager';
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
        setNodes(globalSyncManager.getNodes());
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
    if (!syncManagerRef.current || !user) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('[useCanvas] No auth token found');
      return;
    }

    syncManagerRef.current.connect(roomId, token, {
      onSync: (synced) => {
        setIsSynced(synced);
        console.log(`[useCanvas] Sync status: ${synced}`);
      },
      onStatus: (newStatus) => {
        setStatus(newStatus);
        setIsConnected(newStatus === 'connected');
        console.log(`[useCanvas] Connection status: ${newStatus}`);
      },
      onError: (error) => {
        console.error('[useCanvas] Error:', error);
      },
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
    if (!syncManagerRef.current || !user) return '';

    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullNode: Omit<CanvasNode, 'id'> = {
      ...node,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    syncManagerRef.current.setNode(nodeId, fullNode);
    return nodeId;
  }, [user]);

  // Update a node
  const updateNode = useCallback((nodeId: string, updates: Partial<Omit<CanvasNode, 'id'>>) => {
    if (!syncManagerRef.current) return;

    const existingNode = syncManagerRef.current.getNode(nodeId);
    if (!existingNode) return;

    const updatedNode = { ...existingNode, ...updates };
    delete (updatedNode as any).id; // Remove id from the update
    syncManagerRef.current.setNode(nodeId, updatedNode);
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
