// Yjs Sync Manager
// Manages Y.Doc state and provides typed access to canvas data

import * as Y from 'yjs';
import { YjsProvider } from './yjsProvider';

export interface CanvasNode {
  id: string;
  type: 'sticky' | 'text' | 'shape' | 'image';
  content: any;
  position: { x: number; y: number };
  rotation?: number;
  intent?: 'action' | 'decision' | 'question' | 'reference';
  locked?: boolean;
  createdBy: string;
  createdAt: string;
  color?: string;
  taskStatus?: 'backlog' | 'todo' | 'in_progress' | 'done';
  assignee?: string;
}

export class SyncManager {
  private doc: Y.Doc;
  private provider: YjsProvider | null = null;
  private nodesMap: Y.Map<any>;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.doc = new Y.Doc();
    this.nodesMap = this.doc.getMap('nodes');

    // Listen to changes and notify subscribers
    this.nodesMap.observe(() => {
      this.notifyListeners();
    });
  }

  /**
   * Connect to backend Yjs server
   */
  public connect(roomId: string, token: string, callbacks?: {
    onSync?: (synced: boolean) => void;
    onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void;
    onError?: (error: Error) => void;
  }) {
    if (this.provider) {
      this.provider.disconnect();
    }

    this.provider = new YjsProvider(this.doc, {
      roomId,
      token,
      ...callbacks,
    });
  }

  /**
   * Disconnect from backend
   */
  public disconnect() {
    if (this.provider) {
      this.provider.disconnect();
      this.provider = null;
    }
  }

  /**
   * Get all canvas nodes
   */
  public getNodes(): CanvasNode[] {
    const nodes: CanvasNode[] = [];
    this.nodesMap.forEach((value, key) => {
      nodes.push({ id: key, ...value });
    });
    return nodes;
  }

  /**
   * Get a specific node by ID
   */
  public getNode(nodeId: string): CanvasNode | null {
    const node = this.nodesMap.get(nodeId);
    return node ? { id: nodeId, ...node } : null;
  }

  /**
   * Add or update a node
   */
  public setNode(nodeId: string, node: Omit<CanvasNode, 'id'>) {
    this.nodesMap.set(nodeId, node);
  }

  /**
   * Delete a node
   */
  public deleteNode(nodeId: string) {
    this.nodesMap.delete(nodeId);
  }

  /**
   * Update node position
   */
  public updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    const node = this.nodesMap.get(nodeId);
    if (node) {
      this.nodesMap.set(nodeId, { ...node, position });
    }
  }

  /**
   * Update node content
   */
  public updateNodeContent(nodeId: string, content: any) {
    const node = this.nodesMap.get(nodeId);
    if (node) {
      this.nodesMap.set(nodeId, { ...node, content });
    }
  }

  /**
   * Update node intent (AI classification)
   */
  public updateNodeIntent(nodeId: string, intent: CanvasNode['intent']) {
    const node = this.nodesMap.get(nodeId);
    if (node) {
      this.nodesMap.set(nodeId, { ...node, intent });
    }
  }

  /**
   * Lock/unlock a node
   */
  public setNodeLocked(nodeId: string, locked: boolean) {
    const node = this.nodesMap.get(nodeId);
    if (node) {
      this.nodesMap.set(nodeId, { ...node, locked });
    }
  }

  /**
   * Update task status
   */
  public updateTaskStatus(nodeId: string, status: CanvasNode['taskStatus']) {
    const node = this.nodesMap.get(nodeId);
    if (node) {
      this.nodesMap.set(nodeId, { ...node, taskStatus: status });
    }
  }

  /**
   * Subscribe to changes
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Check if synced with server
   */
  public isSynced(): boolean {
    return this.provider?.isSynced() ?? false;
  }

  /**
   * Check if connected to server
   */
  public isConnected(): boolean {
    return this.provider?.isConnected() ?? false;
  }

  /**
   * Get the underlying Y.Doc (for advanced use)
   */
  public getDoc(): Y.Doc {
    return this.doc;
  }

  /**
   * Destroy the sync manager
   */
  public destroy() {
    this.disconnect();
    this.listeners.clear();
    this.doc.destroy();
  }
}
