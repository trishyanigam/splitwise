const { Router } = require('express');
const authRoutes = require('./authRoutes.js');

const router = Router();

// Mount authentication routes under /auth
router.use('/auth', authRoutes);

module.exports = router;
