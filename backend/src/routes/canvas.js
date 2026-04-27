// GET  /api/canvas/:roomId        → fetch full canvas state (replay all events)
// POST /api/canvas/:roomId/reset  → admin only, soft-reset (inserts RESET event)
// All mutations happen via WebSocket, NOT here