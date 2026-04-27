// Handle incoming WebSocket messages
// Message format: { type, payload, nodeId, roomId, token }
//
// switch(message.type):
//   case "NODE_UPDATE":
//     1. rbacService.canMutate(userId, nodeId) → if false, send error back
//     2. eventService.insertEvent("NODE_UPDATED", payload, userId, roomId)
//     3. broadcast delta to all room clients (NOT full state)
//     4. intentService.classifyNodeIntent(payload.text) [async, non-blocking]
//
//   case "NODE_CREATE": → insert + broadcast
//   case "NODE_DELETE": → insert DELETE event + broadcast
//   case "CURSOR_MOVE": → broadcast ONLY (don't persist cursor positions)
//
// CRITICAL: RBAC check happens HERE before every mutation

const jwt = require('jsonwebtoken');
const eventService = require('../services/eventService');
const rbacService = require('../services/rbacService');
const intentService = require('../services/intentService');

/**
 * Handle WebSocket message
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Parsed message
 * @param {Function} broadcast - Function to broadcast to room
 */
async function handleMessage(ws, message, broadcast) {
  try {
    const { type, payload, nodeId, roomId, token } = message;

    // Verify JWT token
    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return sendError(ws, 'Invalid token');
    }

    // Handle different message types
    switch (type) {
      case 'NODE_CREATE':
        await handleNodeCreate(ws, user, payload, roomId, broadcast);
        break;

      case 'NODE_UPDATE':
        await handleNodeUpdate(ws, user, nodeId, payload, roomId, broadcast);
        break;

      case 'NODE_DELETE':
        await handleNodeDelete(ws, user, nodeId, roomId, broadcast);
        break;

      case 'NODE_MOVE':
        await handleNodeMove(ws, user, nodeId, payload, roomId, broadcast);
        break;

      case 'CURSOR_MOVE':
        // Broadcast cursor position without persisting
        broadcast(roomId, {
          type: 'CURSOR_MOVE',
          userId: user.id,
          payload,
        }, ws);
        break;

      default:
        sendError(ws, `Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('WebSocket message handler error:', error);
    sendError(ws, 'Internal server error');
  }
}

/**
 * Handle node creation
 */
async function handleNodeCreate(ws, user, payload, roomId, broadcast) {
  try {
    // Viewers cannot create nodes
    if (user.role === 'Viewer') {
      return sendError(ws, 'Viewers cannot create nodes');
    }

    const nodeId = payload.nodeId || generateNodeId();
    const event = await eventService.insertEvent(
      'NODE_CREATED',
      { ...payload, nodeId },
      user.id,
      roomId
    );

    // Broadcast to all clients in room
    broadcast(roomId, {
      type: 'NODE_CREATED',
      event,
      payload: { ...payload, nodeId },
    });

    // Classify intent asynchronously (non-blocking)
    if (payload.text) {
      intentService.classifyNodeIntent(payload.text, nodeId, roomId, user.id)
        .catch(err => console.error('Intent classification error:', err));
    }
  } catch (error) {
    console.error('Node create error:', error);
    sendError(ws, 'Failed to create node');
  }
}

/**
 * Handle node update
 */
async function handleNodeUpdate(ws, user, nodeId, payload, roomId, broadcast) {
  try {
    // RBAC check - can user mutate this node?
    const canMutate = await rbacService.canMutate(user.id, nodeId, 'update');
    
    if (!canMutate) {
      return sendError(ws, 'You do not have permission to update this node');
    }

    const event = await eventService.insertEvent(
      'NODE_UPDATED',
      { ...payload, nodeId },
      user.id,
      roomId
    );

    // Broadcast delta to all clients
    broadcast(roomId, {
      type: 'NODE_UPDATED',
      event,
      nodeId,
      payload,
    });

    // Classify intent if text was updated (async, non-blocking)
    if (payload.text) {
      intentService.classifyNodeIntent(payload.text, nodeId, roomId, user.id)
        .catch(err => console.error('Intent classification error:', err));
    }
  } catch (error) {
    console.error('Node update error:', error);
    sendError(ws, 'Failed to update node');
  }
}

/**
 * Handle node deletion
 */
async function handleNodeDelete(ws, user, nodeId, roomId, broadcast) {
  try {
    // RBAC check
    const canMutate = await rbacService.canMutate(user.id, nodeId, 'delete');
    
    if (!canMutate) {
      return sendError(ws, 'You do not have permission to delete this node');
    }

    const event = await eventService.insertEvent(
      'NODE_DELETED',
      { nodeId },
      user.id,
      roomId
    );

    // Broadcast deletion
    broadcast(roomId, {
      type: 'NODE_DELETED',
      event,
      nodeId,
    });
  } catch (error) {
    console.error('Node delete error:', error);
    sendError(ws, 'Failed to delete node');
  }
}

/**
 * Handle node move
 */
async function handleNodeMove(ws, user, nodeId, payload, roomId, broadcast) {
  try {
    // RBAC check
    const canMutate = await rbacService.canMutate(user.id, nodeId, 'update');
    
    if (!canMutate) {
      return sendError(ws, 'You do not have permission to move this node');
    }

    const event = await eventService.insertEvent(
      'NODE_MOVED',
      { nodeId, x: payload.x, y: payload.y },
      user.id,
      roomId
    );

    // Broadcast move
    broadcast(roomId, {
      type: 'NODE_MOVED',
      event,
      nodeId,
      payload,
    });
  } catch (error) {
    console.error('Node move error:', error);
    sendError(ws, 'Failed to move node');
  }
}

/**
 * Send error message to client
 */
function sendError(ws, message) {
  ws.send(JSON.stringify({
    type: 'ERROR',
    error: message,
  }));
}

/**
 * Generate unique node ID
 */
function generateNodeId() {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  handleMessage,
};
