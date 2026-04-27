// canMutate(userId, nodeId, action)
//   → fetch node ACL from DB
//   → check user role against node's allowed roles
//   → return true/false
//
// Node ACL schema: { nodeId, allowedRoles: ["Lead", "Contributor"] }
// Viewers can NEVER mutate — enforced HERE on server
// This is called in wsHandler BEFORE applying any mutation

const prisma = require('../db/prisma');

/**
 * Check if user can mutate a node based on ACL
 * @param {string} userId - User ID
 * @param {string} nodeId - Node ID
 * @param {string} action - Action type (update, delete, lock, etc.)
 * @returns {Promise<boolean>}
 */
async function canMutate(userId, nodeId, action) {
  try {
    // Fetch user to get their role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // Viewers can NEVER mutate anything
    if (user.role === 'Viewer') {
      return false;
    }

    // Leads can do everything
    if (user.role === 'Lead') {
      return true;
    }

    // For Contributors, check node-specific ACL
    const nodeAcl = await prisma.nodeAcl.findUnique({
      where: { nodeId },
      select: { allowedRoles: true },
    });

    // If no ACL exists, default to allowing Contributors
    if (!nodeAcl) {
      return user.role === 'Contributor';
    }

    // Check if user's role is in the allowed roles
    return nodeAcl.allowedRoles.includes(user.role);
  } catch (error) {
    console.error('RBAC check error:', error);
    return false;
  }
}

/**
 * Set node ACL (allowed roles)
 * @param {string} nodeId - Node ID
 * @param {string} roomId - Room ID
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Promise<Object>}
 */
async function setNodeAcl(nodeId, roomId, allowedRoles) {
  return await prisma.nodeAcl.upsert({
    where: { nodeId },
    update: { allowedRoles },
    create: {
      nodeId,
      roomId,
      allowedRoles,
    },
  });
}

/**
 * Get node ACL
 * @param {string} nodeId - Node ID
 * @returns {Promise<Object|null>}
 */
async function getNodeAcl(nodeId) {
  return await prisma.nodeAcl.findUnique({
    where: { nodeId },
  });
}

/**
 * Check if user has specific role
 * @param {string} userId - User ID
 * @param {string} requiredRole - Required role (Lead, Contributor, Viewer)
 * @returns {Promise<boolean>}
 */
async function hasRole(userId, requiredRole) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user && user.role === requiredRole;
}

module.exports = {
  canMutate,
  setNodeAcl,
  getNodeAcl,
  hasRole,
};
