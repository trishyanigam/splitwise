const { Router } = require('express');
const authRoutes = require('./authRoutes.js');
const groupRoutes = require('./groupRoutes.js');

const router = Router();

// Mount authentication routes under /auth
router.use('/auth', authRoutes);

// Mount group routes under /groups
router.use('/groups', groupRoutes);

module.exports = router;
