/**
 * WebSocket Utilities
 * Eliminates code duplication between wsServer.js and yjsServer.js
 */

const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const { AuthenticationError } = require('./errors');

/**
 * Parse and validate WebSocket connection query parameters
 * Extracts and verifies JWT token and roomId
 * 
 * @param {http.IncomingMessage} req - HTTP request
 * @returns {{ token: string, roomId: string, user: Object }}
 * @throws {AuthenticationError} If token or roomId is missing/invalid
 */
function parseWsQuery(req) {
  // Use modern URL API (consistent with yjsServer.js:242)
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const roomId = url.searchParams.get('roomId');

  if (!token) {
    throw new AuthenticationError('Token required');
  }
  
  if (!roomId) {
    throw new AuthenticationError('RoomId required');
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return { token, roomId, user };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Authentication failed');
  }
}

/**
 * Broadcast message to all clients in a room (Set variant)
 * Used by wsServer.js which stores rooms as Map<roomId, Set<WebSocket>>
 * 
 * @param {Set<WebSocket>} clients - Set of WebSocket connections
 * @param {Object|Buffer} message - Message to broadcast (will be stringified if Object)
 * @param {WebSocket} excludeWs - Optional WebSocket to exclude from broadcast
 */
function broadcastToRoomSet(clients, message, excludeWs = null) {
  if (!clients || clients.size === 0) {
    return;
  }

  const messageData = Buffer.isBuffer(message) ? message : JSON.stringify(message);

  clients.forEach((clientWs) => {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(messageData);
    }
  });
}

/**
 * Broadcast message to all clients in a room (Map variant)
 * Used by yjsServer.js which stores rooms as Map<roomId, Map<WebSocket, Object>>
 * 
 * @param {Map<WebSocket, Object>} roomConnections - Map of WebSocket connections
 * @param {Object|Buffer} message - Message to broadcast (will be stringified if Object)
 * @param {WebSocket} excludeWs - Optional WebSocket to exclude from broadcast
 */
function broadcastToRoomMap(roomConnections, message, excludeWs = null) {
  if (!roomConnections || roomConnections.size === 0) {
    return;
  }

  const messageData = Buffer.isBuffer(message) ? message : JSON.stringify(message);

  roomConnections.forEach((clientInfo, clientWs) => {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(messageData);
    }
  });
}

/**
 * Safely close WebSocket connection with state check
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @param {number} code - Close code (default: 1000 = normal closure)
 * @param {string} reason - Close reason
 */
function safeCloseWs(ws, code = 1000, reason = '') {
  if (!ws) return;
  
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    ws.close(code, reason);
  }
}

/**
 * Safely send message to WebSocket with state check
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object|Buffer} message - Message to send
 * @returns {boolean} True if sent successfully
 */
function safeSendWs(ws, message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    const data = Buffer.isBuffer(message) ? message : JSON.stringify(message);
    ws.send(data);
    return true;
  } catch (error) {
    console.error('Failed to send WebSocket message:', error);
    return false;
  }
}

module.exports = {
  parseWsQuery,
  broadcastToRoomSet,
  broadcastToRoomMap,
  safeCloseWs,
  safeSendWs,
};
