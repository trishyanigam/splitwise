const { Router } = require('express');
const {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
} = require('../controllers/group/groupController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router();

// Apply auth middleware to all group routes
router.use(authenticateToken);

// POST /api/groups - Creates a new group owned by the authenticated user
router.post('/', createGroup);

// GET /api/groups - Retrieves all groups owned by the authenticated user
router.get('/', getGroups);

// GET /api/groups/:id - Retrieves a specific group by ID (owner only)
router.get('/:id', getGroupById);

// PUT /api/groups/:id - Updates a specific group by ID (owner only)
router.put('/:id', updateGroup);

// DELETE /api/groups/:id - Deletes a specific group by ID (owner only)
router.delete('/:id', deleteGroup);

module.exports = router;
