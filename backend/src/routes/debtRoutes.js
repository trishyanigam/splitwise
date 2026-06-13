const { Router } = require('express');
const { getSimplifiedDebts } = require('../controllers/debt/debtController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router();

// GET /api/groups/:groupId/simplified-debts - Retrieves optimized/simplified debt transactions for a group
router.get('/:groupId/simplified-debts', authenticateToken, getSimplifiedDebts);

module.exports = router;
