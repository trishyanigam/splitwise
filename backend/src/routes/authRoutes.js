const { Router } = require('express');
const { register, login, logout, getMe } = require('../controllers/authController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router();

// POST /api/auth/register - Handles user signup
router.post('/register', register);

// POST /api/auth/login - Handles user login
router.post('/login', login);

// POST /api/auth/logout - Handles user logout session cleanup
router.post('/logout', logout);

// GET /api/auth/me - Retrieves the active user context profile
router.get('/me', authenticateToken, getMe);

module.exports = router;
