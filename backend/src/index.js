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

const PORT = process.env.PORT || 4000;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
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
