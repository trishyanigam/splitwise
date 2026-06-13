const { Router } = require('express');
const {
  createSettlement,
  getSettlements,
  getSettlementById,
  deleteSettlement
} = require('../controllers/settlement/settlementController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router({ mergeParams: true });

// Apply auth middleware to protect settlement routes
router.use(authenticateToken);

// POST /api/groups/:groupId/settlements - Creates a new settlement record
router.post('/', createSettlement);

// GET /api/groups/:groupId/settlements - Retrieves all settlements inside a group
router.get('/', getSettlements);

// GET /api/groups/:groupId/settlements/:id - Retrieves details of a specific settlement
router.get('/:id', getSettlementById);

// DELETE /api/groups/:groupId/settlements/:id - Deletes a specific settlement record
router.delete('/:id', deleteSettlement);

module.exports = router;
