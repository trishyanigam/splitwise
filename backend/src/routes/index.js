const { Router } = require('express');
const authRoutes = require('./authRoutes.js');
const groupRoutes = require('./groupRoutes.js');
const memberRoutes = require('./memberRoutes.js');
const expenseRoutes = require('./expenseRoutes.js');
const splitRoutes = require('./splitRoutes.js');

const router = Router();

// Mount authentication routes under /auth
router.use('/auth', authRoutes);

// Mount group routes under /groups
router.use('/groups', groupRoutes);

// Mount membership routes under /groups/:groupId/members
router.use('/groups/:groupId/members', memberRoutes);

// Mount expense routes under /groups/:groupId/expenses
router.use('/groups/:groupId/expenses', expenseRoutes);

// Mount split calculation routes under /splits
router.use('/splits', splitRoutes);

module.exports = router;
