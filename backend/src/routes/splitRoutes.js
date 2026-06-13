const { Router } = require('express');
const { previewSplit } = require('../controllers/split/splitController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router();

// Apply auth middleware to protect split preview API
router.use(authenticateToken);

// POST /api/splits/preview - Previews calculated splits
router.post('/preview', previewSplit);

module.exports = router;
