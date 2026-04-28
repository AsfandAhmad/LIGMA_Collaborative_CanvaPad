// Express middleware factory: requireRole("Lead")
// Checks req.user.role against allowed roles
// Used on REST routes like /nodes/:id/lock

const rbacService = require('../services/rbacService');

/**
 * Role-based access control middleware factory
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
}

/**
 * Node-level RBAC middleware
 * Checks if user can mutate a specific node based on node ACL
 * Requires nodeId in req.params
 */
function checkNodePermission(action = 'update') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const nodeId = req.params.nodeId || req.params.id;
    if (!nodeId) {
      return res.status(400).json({ error: 'Node ID required' });
    }

    try {
      const canMutate = await rbacService.canMutate(req.user.id, nodeId, action);
      
      if (!canMutate) {
        return res.status(403).json({ 
          error: 'You do not have permission to modify this node',
          nodeId,
          action,
        });
      }

      next();
    } catch (error) {
      console.error('RBAC check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

module.exports = {
  requireRole,
  checkNodePermission,
};
