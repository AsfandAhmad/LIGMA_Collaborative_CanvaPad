// Yjs WebSocket Server
// Manages CRDT document synchronization using y-websocket
// Handles real-time collaborative canvas editing with automatic conflict resolution
//
// Requirements: 1.1, 1.4, 1.5

const WebSocket = require('ws');
const Y = require('yjs');
const jwt = require('jsonwebtoken');
const rbacService = require('../services/rbacService');
const eventService = require('../services/eventService');
const intentService = require('../services/intentService');

// In-memory storage for Y.Doc instances per room
// Map<roomId, Y.Doc>
const ydocs = new Map();

// Track WebSocket connections per room with user context
// Map<roomId, Map<WebSocket, {userId, userRole}>>
const roomConnections = new Map();

/**
 * Initialize Yjs WebSocket server on /yjs path
 * @param {http.Server} server - HTTP server instance
 * @returns {WebSocket.Server} Yjs WebSocket server instance
 */
function initYjsServer(server) {
  const wss = new WebSocket.Server({ noServer: true });

  console.log('Yjs WebSocket server initialized on /yjs');

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/yjs') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, req) => {
    handleConnection(ws, req);
  });

  return wss;
}

/**
 * Get or create Y.Doc instance for a room
 * @param {string} roomId - Room identifier
 * @returns {Y.Doc} Yjs document instance
 */
function getYDoc(roomId) {
  if (!ydocs.has(roomId)) {
    const ydoc = new Y.Doc();
    ydocs.set(roomId, ydoc);
    console.log(`Created new Y.Doc for room: ${roomId}`);
  }
  return ydocs.get(roomId);
}

/**
 * Get event type for CRDT mutation
 * Requirements: 2.3
 * @param {Object} mutation - Mutation object with operation type
 * @returns {string} Event type
 */
function getEventType(mutation) {
  switch (mutation.operation) {
    case 'create': return 'CRDT_NODE_CREATED';
    case 'update': return 'CRDT_NODE_UPDATED';
    case 'delete': return 'CRDT_NODE_DELETED';
    case 'move':   return 'CRDT_NODE_MOVED';
    default:       return 'CRDT_NODE_UPDATED';
  }
}

/**
 * Decode Y.Doc binary update to extract node changes.
 * Seeds a temp doc with prevStateUpdate (state BEFORE the update), then applies
 * the update so the observer fires for exactly what changed.
 *
 * Requirements: 13.1, 13.2
 * @param {Uint8Array} update - Binary CRDT update (the delta)
 * @param {Uint8Array|null} prevStateUpdate - Full encoded state of ydoc BEFORE this update
 * @returns {Array<Object>} Array of mutations: [{ nodeId, operation, payload, previousValues }]
 */
function decodeYjsUpdate(update, prevStateUpdate) {
  const mutations = [];

  try {
    const tempDoc = new Y.Doc();
    const tempMap = tempDoc.getMap('nodes');

    // Seed the temp doc with the state that existed BEFORE this update
    if (prevStateUpdate && prevStateUpdate.length > 0) {
      Y.applyUpdate(tempDoc, prevStateUpdate);
    }

    const observer = (event) => {
      event.changes.keys.forEach((change, nodeId) => {
        let operation;
        let payload;
        let previousValues = null;

        if (change.action === 'add') {
          const currentValue = tempMap.get(nodeId);
          operation = 'create';
          payload = { nodeId, ...(currentValue || {}) };

        } else if (change.action === 'delete') {
          operation = 'delete';
          previousValues = change.oldValue;
          payload = { nodeId };

        } else if (change.action === 'update') {
          previousValues = change.oldValue;
          const currentValue = tempMap.get(nodeId);

          if (previousValues && currentValue) {
            const allKeys = new Set([
              ...Object.keys(previousValues),
              ...Object.keys(currentValue),
            ]);
            const changedProps = [...allKeys].filter(
              (key) =>
                JSON.stringify(currentValue[key]) !==
                JSON.stringify(previousValues[key])
            );
            operation =
              changedProps.length > 0 &&
              changedProps.every((k) => k === 'x' || k === 'y')
                ? 'move'
                : 'update';
          } else {
            operation = 'update';
          }
          payload = { nodeId, ...(currentValue || {}) };
        }

        if (operation) {
          mutations.push({ nodeId, operation, payload, previousValues });
        }
      });
    };

    tempMap.observe(observer);
    Y.applyUpdate(tempDoc, update);
    tempMap.unobserve(observer);
    tempDoc.destroy();

  } catch (error) {
    console.error('Error decoding Yjs update:', error);
  }

  return mutations;
}

/**
 * Handle Y.Doc update event with RBAC integration, event logging, and intent classification.
 * The caller must pass prevStateUpdate (encoded state BEFORE the update was applied).
 *
 * Requirements: 1.6, 2.1-2.6, 13.1-13.6, 15.1-15.6
 * @param {Uint8Array} update - Binary CRDT update
 * @param {Uint8Array|null} prevStateUpdate - Encoded ydoc state before this update
 * @param {Y.Doc} ydoc - Yjs document (post-update state)
 * @param {string} roomId - Room identifier
 * @param {string} userId - User identifier
 */
async function handleYjsUpdate(update, prevStateUpdate, ydoc, roomId, userId) {
  try {
    const mutations = decodeYjsUpdate(update, prevStateUpdate);

    for (const mutation of mutations) {
      if (!mutation.nodeId) continue;

      const canMutate = await rbacService.canMutate(
        userId,
        mutation.nodeId,
        mutation.operation
      );

      if (!canMutate) {
        console.warn(
          `RBAC violation: User ${userId} cannot ${mutation.operation} node ${mutation.nodeId}`
        );
        await eventService.insertEvent(
          'RBAC_VIOLATION',
          { userId, nodeId: mutation.nodeId, operation: mutation.operation, reason: 'Insufficient permissions' },
          userId,
          roomId
        );
        return;
      }

      // Build event payload
      const eventType = getEventType(mutation);
      const eventPayload = { nodeId: mutation.nodeId, ...mutation.payload };

      if (mutation.operation === 'update' && mutation.previousValues) {
        eventPayload.previousValues = mutation.previousValues;
      }
      if (mutation.operation === 'delete' && mutation.previousValues) {
        eventPayload.deletedNode = mutation.previousValues;
      }

      // Non-blocking event log insertion
      eventService.insertEvent(eventType, eventPayload, userId, roomId)
        .catch((error) => {
          console.error('Event log insertion failed:', {
            userId,
            nodeId: mutation.nodeId,
            operation: mutation.operation,
            reason: error.message,
          });
        });

      // Non-blocking intent classification for text changes
      if (mutation.payload && mutation.payload.text) {
        intentService
          .classifyNodeIntent(mutation.payload.text, mutation.nodeId, roomId, userId)
          .catch((error) => {
            console.error('Intent classification failed:', {
              userId,
              nodeId: mutation.nodeId,
              reason: error.message,
            });
          });
      }
    }
  } catch (error) {
    console.error('Yjs update handler error:', error);
  }
}

/**
 * Authenticate WebSocket connection using JWT
 * Requirements: 1.2, 1.3
 */
function authenticateYjsConnection(ws, req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const roomId = url.searchParams.get('roomId');

    if (!token) {
      console.warn('Yjs connection rejected: No token provided');
      ws.close(1008, 'Token required');
      return false;
    }
    if (!roomId) {
      console.warn('Yjs connection rejected: No roomId provided');
      ws.close(1008, 'RoomId required');
      return false;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ws.userId = decoded.id;
    ws.userRole = decoded.role;
    ws.roomId = roomId;

    console.log(`Yjs connection authenticated: User ${ws.userId} (${ws.userRole}) joined room ${roomId}`);
    return true;
  } catch (error) {
    console.error('Yjs authentication failed:', error.message);
    ws.close(1008, 'Invalid token');
    return false;
  }
}

/**
 * Handle WebSocket connection lifecycle
 * Requirements: 1.2, 1.3, 1.6, 13.1-13.6
 */
function handleConnection(ws, req) {
  const authenticated = authenticateYjsConnection(ws, req);
  if (!authenticated) return;

  const { roomId, userId } = ws;
  const ydoc = getYDoc(roomId);

  // Track connection
  if (!roomConnections.has(roomId)) {
    roomConnections.set(roomId, new Map());
  }
  roomConnections.get(roomId).set(ws, { userId, userRole: ws.userRole });

  // Attach update handler once per Y.Doc
  if (!ydoc._updateHandlerAttached) {
    ydoc.on('update', (update, origin) => {
      // Broadcast update to all other clients in the room
      const connections = roomConnections.get(roomId);
      if (connections) {
        connections.forEach((clientInfo, clientWs) => {
          // Don't send to the client that originated the update
          const isOriginator = origin && origin.ws && origin.ws === clientWs;
          
          if (!isOriginator && clientWs.readyState === WebSocket.OPEN) {
            // Send binary Yjs update message (messageType = 0, syncMessageType = 2 for incremental update)
            const message = Buffer.concat([
              Buffer.from([0, 2]), // messageType: 0 = sync, syncMessageType: 2 = Update
              Buffer.from(update)
            ]);
            clientWs.send(message);
          }
        });
      }

      // Handle event logging and RBAC is done in ws.on('message') with correct prevStateUpdate
      // This handler only broadcasts to avoid duplicate RBAC checks and event logging
    });
    ydoc._updateHandlerAttached = true;
  }

  // Send initial sync: SyncStep1 (state vector)
  const stateVector = Y.encodeStateVector(ydoc);
  const syncStep1Message = Buffer.concat([
    Buffer.from([0, 0]), // messageType: 0 = sync, syncMessageType: 0 = SyncStep1
    Buffer.from(stateVector)
  ]);
  ws.send(syncStep1Message);

  // Handle incoming Yjs binary messages
  ws.on('message', (data) => {
    try {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      if (buffer.length === 0) return;

      const messageType = buffer[0];

      // messageType 0 = sync protocol
      if (messageType === 0) {
        if (buffer.length < 2) return;
        
        const syncMessageType = buffer[1];
        const payload = buffer.slice(2);

        if (syncMessageType === 0) {
          // SyncStep1: Client sends state vector, we respond with missing updates
          const stateVector = new Uint8Array(payload);
          const update = Y.encodeStateAsUpdate(ydoc, stateVector);
          
          const syncStep2Message = Buffer.concat([
            Buffer.from([0, 1]), // messageType: 0 = sync, syncMessageType: 1 = SyncStep2
            Buffer.from(update)
          ]);
          ws.send(syncStep2Message);

        } else if (syncMessageType === 1) {
          // SyncStep2: Client sends missing updates
          const update = new Uint8Array(payload);
          
          // Capture state BEFORE applying update
          const prevStateUpdate = Y.encodeStateAsUpdate(ydoc);
          
          // Apply update with origin to track who made the change
          Y.applyUpdate(ydoc, update, { userId, ws });
          
          // Handle RBAC and event logging with prevStateUpdate
          handleYjsUpdate(update, prevStateUpdate, ydoc, roomId, userId);

        } else if (syncMessageType === 2) {
          // Update: Client sends incremental update
          const update = new Uint8Array(payload);
          
          // Capture state BEFORE applying update
          const prevStateUpdate = Y.encodeStateAsUpdate(ydoc);
          
          // Apply update with origin
          Y.applyUpdate(ydoc, update, { userId, ws });
          
          // Handle RBAC and event logging with prevStateUpdate
          handleYjsUpdate(update, prevStateUpdate, ydoc, roomId, userId);
        }
      }
      // messageType 1 = awareness protocol (not implemented yet)
      
    } catch (error) {
      console.error('Yjs message handler error:', error);
    }
  });

  ws.on('close', () => {
    const connections = roomConnections.get(roomId);
    if (connections) {
      connections.delete(ws);
      
      // Clean up Y.Doc if no more connections (FIX ISSUE 5: Memory leak)
      if (connections.size === 0) {
        roomConnections.delete(roomId);
        
        const ydoc = ydocs.get(roomId);
        if (ydoc) {
          ydoc.destroy();
          ydocs.delete(roomId);
          console.log(`Cleaned up Y.Doc for empty room: ${roomId}`);
        }
      }
    }
    console.log(`User ${userId} disconnected from room ${roomId}`);
  });

  // Handle WebSocket errors to prevent process crashes
  ws.on('error', (error) => {
    console.error(`Yjs WebSocket error for user ${userId} in room ${roomId}:`, error);
  });

  console.log(`Yjs connection established for room: ${roomId}`);
}

module.exports = {
  initYjsServer,
  getYDoc,
  authenticateYjsConnection,
  handleYjsUpdate,
  decodeYjsUpdate,
  getEventType,
  ydocs, // Export for testing
};
