const { Router } = require('express');
const { register, login, logout, getMe, updateMe, getUsers } = require('../controllers/authController.js');
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

// PUT /api/auth/me - Updates the active user profile details
router.put('/me', authenticateToken, updateMe);

// GET /api/auth/users - Returns all registered users for member search dropdown
router.get('/users', authenticateToken, getUsers);

module.exports = router;
