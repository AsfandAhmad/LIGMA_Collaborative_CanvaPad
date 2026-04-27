// canMutate(userId, nodeId, action)
//   → fetch node ACL from DB
//   → check user role against node's allowed roles
//   → return true/false
//
// Node ACL schema: { nodeId, allowedRoles: ["Lead", "Contributor"] }
// Viewers can NEVER mutate — enforced HERE on server
// This is called in wsHandler BEFORE applying any mutation