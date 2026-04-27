// Setup WebSocket server (ws library)
// On connection:
//   1. Parse JWT from query param (?token=...)
//   2. Verify token → get userId, role
//   3. Add client to room map: rooms[roomId].add(client)
//   4. Send missed events: replayEvents(roomId, client.lastEventId)
//   5. Register message handler: wsHandler(client, message)
//   6. On close: remove from room, broadcast USER_LEFT

const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
const { handleMessage } = require('./wsHandler');
const eventService = require('../services/eventService');

// Room management: roomId -> Set of WebSocket clients
const rooms = new Map();

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
  });

  wss.on('connection', async (ws, req) => {
    try {
      // Parse query parameters
      const params = url.parse(req.url, true).query;
      const token = params.token;
      const roomId = params.roomId;

      if (!token || !roomId) {
        ws.close(1008, 'Token and roomId required');
        return;
      }

      // Verify JWT token
      let user;
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        ws.close(1008, 'Invalid token');
        return;
      }

      // Attach user info to WebSocket
      ws.userId = user.id;
      ws.userRole = user.role;
      ws.roomId = roomId;

      // Add client to room
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      rooms.get(roomId).add(ws);

      console.log(`User ${user.id} (${user.role}) joined room ${roomId}`);

      // Send missed events if client provides lastEventId
      const lastEventId = parseInt(params.lastEventId) || 0;
      if (lastEventId > 0) {
        const missedEvents = await eventService.getEvents(roomId, lastEventId);
        ws.send(JSON.stringify({
          type: 'SYNC',
          events: missedEvents,
        }));
      }

      // Broadcast user joined
      broadcast(roomId, {
        type: 'USER_JOINED',
        userId: user.id,
        userName: user.name || user.email,
        role: user.role,
      }, ws);

      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await handleMessage(ws, message, broadcast);
        } catch (error) {
          console.error('Message parse error:', error);
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Invalid message format',
          }));
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`User ${user.id} left room ${roomId}`);
        
        // Remove from room
        if (rooms.has(roomId)) {
          rooms.get(roomId).delete(ws);
          
          // Clean up empty rooms
          if (rooms.get(roomId).size === 0) {
            rooms.delete(roomId);
          }
        }

        // Broadcast user left
        broadcast(roomId, {
          type: 'USER_LEFT',
          userId: user.id,
        });
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal server error');
    }
  });

  console.log('✅ WebSocket server initialized');
}

/**
 * Broadcast message to all clients in a room
 * @param {string} roomId - Room ID
 * @param {Object} message - Message to broadcast
 * @param {WebSocket} excludeWs - Optional: exclude this WebSocket from broadcast
 */
function broadcast(roomId, message, excludeWs = null) {
  if (!rooms.has(roomId)) {
    return;
  }

  const messageStr = JSON.stringify(message);
  
  rooms.get(roomId).forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

module.exports = {
  initWebSocketServer,
  broadcast,
};
