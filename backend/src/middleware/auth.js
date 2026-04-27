// Express middleware
// 1. Read Authorization: Bearer <token> header
// 2. jwt.verify(token, JWT_SECRET) → req.user = { id, role }
// 3. If invalid → 401

const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object with id, role, email
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  authenticateToken,
  generateToken,
};
