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