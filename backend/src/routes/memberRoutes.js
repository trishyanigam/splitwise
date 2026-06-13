const { Router } = require('express');
const {
  addMember,
  removeMember,
  getMembers,
  getMembershipHistory,
} = require('../controllers/group/memberController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router({ mergeParams: true });

// Apply auth middleware to all membership routes
router.use(authenticateToken);

// POST /api/groups/:groupId/members - Adds a user to the group members list
router.post('/', addMember);

// PUT /api/groups/:groupId/members/:memberId/leave - Marks a user as having left the group (updates leftAt)
router.put('/:memberId/leave', removeMember);

// GET /api/groups/:groupId/members - Retrieves all active group members
router.get('/', getMembers);

// GET /api/groups/:groupId/members/history - Retrieves full membership trace logs
router.get('/history', getMembershipHistory);

module.exports = router;
