const { Router } = require('express');
const authRoutes = require('./authRoutes.js');
const groupRoutes = require('./groupRoutes.js');
const memberRoutes = require('./memberRoutes.js');

const router = Router();

// Mount authentication routes under /auth
router.use('/auth', authRoutes);

// Mount group routes under /groups
router.use('/groups', groupRoutes);

// Mount membership routes under /groups/:groupId/members
router.use('/groups/:groupId/members', memberRoutes);

module.exports = router;
