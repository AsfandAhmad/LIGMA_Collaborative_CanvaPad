// Track active users per room
// rooms = Map<roomId, Map<userId, { cursor: {x,y}, name, color }>>
//
// updateCursor(roomId, userId, position) → update in-memory map
// broadcastPresence(roomId) → send all cursors to all clients in room
// getCursors(roomId) → return all active cursors
// Note: cursor positions are NOT stored in DB (ephemeral)