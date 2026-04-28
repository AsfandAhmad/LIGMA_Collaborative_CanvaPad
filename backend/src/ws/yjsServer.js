// Yjs WebSocket Server
// Manages CRDT document synchronization using y-websocket
// Handles real-time collaborative canvas editing with automatic conflict resolution
//
// Requirements: 1.1, 1.4, 1.5

const WebSocket = require('ws');
const Y = require('yjs');
const rbacService = require('../services/rbacService');
const eventService = require('../services/eventService');
const intentService = require('../services/intentService');
const { decodeYjsUpdate, getEventType } = require('../utils/crdt');
const { parseWsQuery, broadcastToRoomMap, safeCloseWs } = require('../utils/wsUtils');
const { AuthenticationError } = require('../utils/errors');
const { isValidYjsMessage } = require('../utils/validation');

// In-memory storage for Y.Doc instances per room
// Map<roomId, Y.Doc>
const ydocs = new Map();

// Track WebSocket connections per room with user context
// Map<roomId, Map<WebSocket, {userId, userRole}>>
const roomConnections = new Map();

/**
 * Initialize Yjs WebSocket server on /yjs path (legacy function for backward compatibility)
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

  wss.on('connection', handleYjsConnection);

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
 * Check RBAC permissions for all mutations in an update BEFORE applying.
 * Returns true if all mutations are allowed, false otherwise.
 * 
 * Requirements: 1.6, 2.1-2.6
 * @param {Array<Object>} mutations - Array of decoded mutations
 * @param {string} userId - User identifier
 * @param {string} roomId - Room identifier
 * @returns {Promise<boolean>} True if all mutations allowed
 */
async function checkYjsMutations(mutations, userId, roomId, accessToken) {
  for (const mutation of mutations) {
    if (!mutation.nodeId) continue;

    const canMutate = await rbacService.canMutate(
      userId,
      mutation.nodeId,
      mutation.operation,
      accessToken
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
      return false;
    }
  }
  return true;
}

/**
 * Log events and classify intent for mutations (called AFTER update is applied and RBAC passed).
 * 
 * Requirements: 2.1-2.6, 13.1-13.6, 15.1-15.6
 * @param {Array<Object>} mutations - Array of decoded mutations
 * @param {string} roomId - Room identifier
 * @param {string} userId - User identifier
 */
async function logYjsMutations(mutations, roomId, userId) {
  for (const mutation of mutations) {
    if (!mutation.nodeId) continue;

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
}

/**
 * Authenticate WebSocket connection using JWT
 * Requirements: 1.2, 1.3
 */
async function authenticateYjsConnection(ws, req) {
  try {
    const { user, roomId, token } = await parseWsQuery(req);
    
    ws.userId = user.id;
    ws.userRole = user.role;
    ws.roomId = roomId;
    ws.accessToken = token;

    console.log(`Yjs connection authenticated: User ${ws.userId} (${ws.userRole}) joined room ${roomId}`);
    return true;
  } catch (error) {
    console.error('Yjs authentication failed:', error.message);
    safeCloseWs(ws, 1008, error.message);
    return false;
  }
}

/**
 * Handle WebSocket connection lifecycle (exported for use in index.js)
 * Requirements: 1.2, 1.3, 1.6, 13.1-13.6
 * @param {WebSocket} ws - WebSocket connection
 * @param {http.IncomingMessage} req - HTTP request
 */
async function handleYjsConnection(ws, req) {
  const authenticated = await authenticateYjsConnection(ws, req);
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
        // Send binary Yjs update message (messageType = 0, syncMessageType = 2 for incremental update)
        const message = Buffer.concat([
          Buffer.from([0, 2]), // messageType: 0 = sync, syncMessageType: 2 = Update
          Buffer.from(update)
        ]);
        
        broadcastToRoomMap(connections, message, origin?.ws);
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
  ws.on('message', async (data) => {
    try {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      // Validate binary message
      const validation = isValidYjsMessage(buffer);
      if (!validation.valid) {
        console.warn(`Invalid Yjs message from user ${userId}:`, validation.error);
        return;
      }

      const messageType = buffer[0];

      // messageType 0 = sync protocol
      if (messageType === 0) {
        if (buffer.length < 2) return;
        
        const syncMessageType = buffer[1];
        const payload = buffer.subarray(2);

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
          
          // CRITICAL FIX: Decode and check RBAC BEFORE applying update
          const mutations = decodeYjsUpdate(update, prevStateUpdate);
          const allowed = await checkYjsMutations(mutations, userId, roomId, ws.accessToken);
          
          if (!allowed) {
            // RBAC violation - do NOT apply update, do NOT broadcast
            console.warn(`Rejected SyncStep2 update from user ${userId} due to RBAC violation`);
            return;
          }
          
          // Apply update with origin to track who made the change
          Y.applyUpdate(ydoc, update, { userId, ws });
          
          // Log events and classify intent (mutations already decoded)
          logYjsMutations(mutations, roomId, userId).catch(err => 
            console.error('Error logging mutations:', err)
          );

        } else if (syncMessageType === 2) {
          // Update: Client sends incremental update
          const update = new Uint8Array(payload);
          
          // Capture state BEFORE applying update
          const prevStateUpdate = Y.encodeStateAsUpdate(ydoc);
          
          // CRITICAL FIX: Decode and check RBAC BEFORE applying update
          const mutations = decodeYjsUpdate(update, prevStateUpdate);
          const allowed = await checkYjsMutations(mutations, userId, roomId, ws.accessToken);
          
          if (!allowed) {
            // RBAC violation - do NOT apply update, do NOT broadcast
            console.warn(`Rejected incremental update from user ${userId} due to RBAC violation`);
            return;
          }
          
          // Apply update with origin
          Y.applyUpdate(ydoc, update, { userId, ws });
          
          // Log events and classify intent (mutations already decoded)
          logYjsMutations(mutations, roomId, userId).catch(err => 
            console.error('Error logging mutations:', err)
          );
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
        
        const docToDestroy = ydocs.get(roomId);
        if (docToDestroy) {
          docToDestroy.destroy();
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

/**
 * Handle WebSocket connection lifecycle (legacy function name for backward compatibility)
 * Requirements: 1.2, 1.3, 1.6, 13.1-13.6
 */
function handleConnection(ws, req) {
  return handleYjsConnection(ws, req);
}

module.exports = {
  initYjsServer,
  handleYjsConnection,
  getYDoc,
  authenticateYjsConnection,
  checkYjsMutations,
  logYjsMutations,
  ydocs, // Export for testing
};
