const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

/**
 * Generates a JWT token for a user
 * @param {number|string} userId - The unique identifier of the user
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Verifies a JWT token
 * @param {string} token - The token to check
 * @returns {object|null} Decoded payload including user id, or null if validation fails
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
