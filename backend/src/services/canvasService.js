// getCanvasState(roomId)
//   → replay all events for room → reconstruct current state
//   → return: { nodes: [], version: latestEventId }
// 
// This is how canvas state is rebuilt — from events, not a state table
// Called when a new user joins a room