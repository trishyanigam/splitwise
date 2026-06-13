const { verifyToken } = require('../utils/jwt.js');

/**
 * Middleware to authenticate requests using JWT tokens
 * Reads Bearer token from the Authorization header
 * Verifies JWT token and attaches userId to req.user
 * Returns 401 status when token is missing or invalid
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Optional cookie fallback to keep compatibility with web flows
  if (!token && req.cookies) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid or expired token.',
    });
  }

  // Attach userId to req.user (attaching both id and userId for cross compatibility)
  req.user = {
    userId: decoded.id,
    id: decoded.id,
  };

  next();
};

module.exports = {
  authenticateToken,
};
