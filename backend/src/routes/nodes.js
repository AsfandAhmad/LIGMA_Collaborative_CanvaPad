// GET    /api/nodes/:nodeId        → get single node + its ACL
// PATCH  /api/nodes/:nodeId/lock   → Lead locks a node (inserts LOCK_NODE event)
// PATCH  /api/nodes/:nodeId/role   → assign role to node
// DELETE /api/nodes/:nodeId        → inserts DELETE event (never removes from DB)
// Server validates role before every mutation here