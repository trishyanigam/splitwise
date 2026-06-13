const { Router } = require('express');
const { getBalanceBreakdown, getExpenseTrace } = require('../controllers/audit/auditController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router();

// GET /api/groups/:groupId/audit/:userId - Retrieves the user's detailed balance breakdown and audit report
router.get('/:groupId/audit/:userId', authenticateToken, getBalanceBreakdown);

// GET /api/groups/expenses/:expenseId/trace - Retrieves the trace calculations for a specific expense
router.get('/expenses/:expenseId/trace', authenticateToken, getExpenseTrace);

module.exports = router;
