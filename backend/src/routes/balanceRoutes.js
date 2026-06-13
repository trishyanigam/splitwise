const { Router } = require('express');
const { 
  getGroupBalances, 
  getUserBalanceInGroup,
  getUserBalanceSummary 
} = require('../controllers/balance/balanceController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router();

// GET /api/groups/balances/summary - Retrieves overall balance summary for the user across all groups
router.get('/balances/summary', authenticateToken, getUserBalanceSummary);

// GET /api/groups/:groupId/balances - Retrieves all balances and simplified debts for a group
router.get('/:groupId/balances', authenticateToken, getGroupBalances);

// GET /api/groups/:groupId/balances/user/:userId - Retrieves calculated balance for a specific user in a group
router.get('/:groupId/balances/user/:userId', authenticateToken, getUserBalanceInGroup);

module.exports = router;
