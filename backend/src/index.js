// Entry point
// 1. Import app.js (Express app)
// 2. Import wsServer.js
// 3. Create HTTP server from Express app
// 4. Attach WebSocket server to same HTTP server on /ws path
// 5. Listen on PORT from .env
// Purpose: Single port serves both REST and WebSocket