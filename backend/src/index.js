// Entry point
// 1. Import app.js (Express app)
// 2. Import wsServer.js
// 3. Create HTTP server from Express app
// 4. Attach WebSocket server to same HTTP server on /ws path
// 5. Listen on PORT from .env
// Purpose: Single port serves both REST and WebSocket

require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initWebSocketServer } = require('./ws/wsServer');
const { initYjsServer } = require('./ws/yjsServer');

const PORT = process.env.PORT || 4000;

// Create HTTP server
const server = http.createServer(app);

// Initialize both WebSocket servers on the same HTTP server instance
// Raw WebSocket server for presence and events on /ws
initWebSocketServer(server);
console.log('✅ Raw WebSocket server initialized on /ws');

// Yjs WebSocket server for CRDT synchronization on /yjs
initYjsServer(server);
console.log('✅ Yjs WebSocket server initialized on /yjs');

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Raw WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`🔄 Yjs WebSocket available at ws://localhost:${PORT}/yjs`);
  console.log(`🔗 REST API available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
