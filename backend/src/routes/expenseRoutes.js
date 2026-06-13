const { Router } = require('express');
const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require('../controllers/expense/expenseController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router({ mergeParams: true });

// Apply auth middleware to all expense routes
router.use(authenticateToken);

// POST /api/groups/:groupId/expenses - Creates a new expense
router.post('/', createExpense);

// GET /api/groups/:groupId/expenses - Retrieves all group expenses
router.get('/', getExpenses);

// GET /api/groups/:groupId/expenses/:expenseId - Retrieves a single expense by ID
router.get('/:expenseId', getExpenseById);

// PUT /api/groups/:groupId/expenses/:expenseId - Updates an expense
router.put('/:expenseId', updateExpense);

// DELETE /api/groups/:groupId/expenses/:expenseId - Deletes an expense
router.delete('/:expenseId', deleteExpense);

module.exports = router;
