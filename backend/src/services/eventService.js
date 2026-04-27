// THE MOST IMPORTANT SERVICE
// insertEvent(type, payload, userId, roomId)
//   → INSERT INTO events (type, payload, user_id, room_id, timestamp)
//   → NEVER UPDATE, NEVER DELETE
// 
// replayEvents(roomId, sinceEventId)
//   → SELECT * FROM events WHERE room_id=? AND id > sinceEventId ORDER BY id
//   → Used for reconnection replay (missed events only)
//
// Event types: NODE_CREATED, NODE_MOVED, NODE_UPDATED, NODE_DELETED,
//              NODE_LOCKED, TASK_CREATED, USER_JOINED, USER_LEFT