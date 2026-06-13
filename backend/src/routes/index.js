const { Router } = require('express');
const authRoutes = require('./authRoutes.js');
const groupRoutes = require('./groupRoutes.js');
const memberRoutes = require('./memberRoutes.js');
const expenseRoutes = require('./expenseRoutes.js');
const splitRoutes = require('./splitRoutes.js');
const settlementRoutes = require('./settlementRoutes.js');
const balanceRoutes = require('./balanceRoutes.js');

const router = Router();

// Mount authentication routes under /auth
router.use('/auth', authRoutes);

// Mount group routes under /groups
router.use('/groups', groupRoutes);

// Mount balance routes under /groups
router.use('/groups', balanceRoutes);

// Mount membership routes under /groups/:groupId/members
router.use('/groups/:groupId/members', memberRoutes);

// Mount expense routes under /groups/:groupId/expenses
router.use('/groups/:groupId/expenses', expenseRoutes);

// Mount settlement routes under /groups/:groupId/settlements
router.use('/groups/:groupId/settlements', settlementRoutes);

// Mount split calculation routes under /splits
router.use('/splits', splitRoutes);

module.exports = router;
