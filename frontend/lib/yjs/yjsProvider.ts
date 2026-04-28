// Yjs WebSocket Provider
// Connects to backend /yjs endpoint for real-time CRDT synchronization

import * as Y from 'yjs';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

export interface YjsProviderOptions {
  roomId: string;
  token: string;
  onSync?: (synced: boolean) => void;
  onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void;
  onError?: (error: Error) => void;
}

export class YjsProvider {
  private ws: WebSocket | null = null;
  private doc: Y.Doc;
  private roomId: string;
  private token: string;
  private synced: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onSync?: (synced: boolean) => void;
  private onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void;
  private onError?: (error: Error) => void;

  constructor(doc: Y.Doc, options: YjsProviderOptions) {
    this.doc = doc;
    this.roomId = options.roomId;
    this.token = options.token;
    this.onSync = options.onSync;
    this.onStatus = options.onStatus;
    this.onError = options.onError;

    this.connect();
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.onStatus?.('connecting');

    try {
      const url = `${WS_URL}/yjs?token=${encodeURIComponent(this.token)}&roomId=${encodeURIComponent(this.roomId)}`;
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log(`[YjsProvider] Connected to room ${this.roomId}`);
        this.reconnectAttempts = 0;
        this.onStatus?.('connected');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(new Uint8Array(event.data));
      };

      this.ws.onclose = (event) => {
        console.log(`[YjsProvider] Disconnected from room ${this.roomId}`, event.code, event.reason);
        this.onStatus?.('disconnected');
        this.synced = false;
        this.onSync?.(false);

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          console.log(`[YjsProvider] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          this.reconnectTimeout = setTimeout(() => this.connect(), delay);
        } else {
          this.onError?.(new Error('Max reconnection attempts reached'));
        }
      };

      this.ws.onerror = (error) => {
        console.error('[YjsProvider] WebSocket error:', error);
        this.onError?.(new Error('WebSocket connection error'));
      };

      // Listen to local document updates and send to server
      this.doc.on('update', this.handleLocalUpdate);

    } catch (error) {
      console.error('[YjsProvider] Connection error:', error);
      this.onError?.(error as Error);
    }
  }

  private handleMessage = (message: Uint8Array) => {
    if (message.length < 2) return;

    const messageType = message[0];

    // messageType 0 = sync protocol
    if (messageType === 0) {
      const syncMessageType = message[1];
      const payload = message.subarray(2);

      if (syncMessageType === 0) {
        // SyncStep1: Server sends state vector, we respond with our state
        const stateVector = payload;
        const update = Y.encodeStateAsUpdate(this.doc, stateVector);
        this.sendSyncStep2(update);

      } else if (syncMessageType === 1) {
        // SyncStep2: Server sends missing updates
        Y.applyUpdate(this.doc, payload, this);
        
        if (!this.synced) {
          this.synced = true;
          this.onSync?.(true);
          console.log(`[YjsProvider] Initial sync complete for room ${this.roomId}`);
        }

      } else if (syncMessageType === 2) {
        // Update: Server sends incremental update
        Y.applyUpdate(this.doc, payload, this);
      }
    }
  };

  private handleLocalUpdate = (update: Uint8Array, origin: any) => {
    // Don't send updates that came from the server
    if (origin === this) return;

    // Send update to server
    this.sendUpdate(update);
  };

  private sendSyncStep1() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const stateVector = Y.encodeStateVector(this.doc);
    const message = new Uint8Array(2 + stateVector.length);
    message[0] = 0; // messageType: sync
    message[1] = 0; // syncMessageType: SyncStep1
    message.set(stateVector, 2);
    this.ws.send(message);
  }

  private sendSyncStep2(update: Uint8Array) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = new Uint8Array(2 + update.length);
    message[0] = 0; // messageType: sync
    message[1] = 1; // syncMessageType: SyncStep2
    message.set(update, 2);
    this.ws.send(message);
  }

  private sendUpdate(update: Uint8Array) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = new Uint8Array(2 + update.length);
    message[0] = 0; // messageType: sync
    message[1] = 2; // syncMessageType: Update
    message.set(update, 2);
    this.ws.send(message);
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.doc.off('update', this.handleLocalUpdate);

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.synced = false;
    this.onSync?.(false);
  }

  public isSynced(): boolean {
    return this.synced;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
