const { Router } = require('express');
const { resolveAnomaly, getResolutionHistory } = require('../controllers/import/resolutionController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router();

// POST /api/import/anomalies/:id/resolve - Applies a resolution to a specific anomaly
router.post('/anomalies/:id/resolve', authenticateToken, resolveAnomaly);

// GET /api/import/anomalies/:id/resolutions - Retrieves the resolution history for an anomaly
router.get('/anomalies/:id/resolutions', authenticateToken, getResolutionHistory);

module.exports = router;
