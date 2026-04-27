// Setup WebSocket server (ws library)
// On connection:
//   1. Parse JWT from query param (?token=...)
//   2. Verify token → get userId, role
//   3. Add client to room map: rooms[roomId].add(client)
//   4. Send missed events: replayEvents(roomId, client.lastEventId)
//   5. Register message handler: wsHandler(client, message)
//   6. On close: remove from room, broadcast USER_LEFT