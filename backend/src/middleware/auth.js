// Express middleware
// 1. Read Authorization: Bearer <token> header
// 2. Validate Supabase access token → req.user = { id, role }
// 3. If invalid → 401

const { getUserForToken } = require('../utils/supabase');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = await getUserForToken(token);

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: user.id,
      role: user.user_metadata?.role || 'Contributor',
      email: user.email,
      name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email,
    };
    req.accessToken = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = {
  authenticateToken,
};
