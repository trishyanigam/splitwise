const { Router } = require('express');
const { getImportReport, getSystemSummary } = require('../controllers/report/reportController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router();

// GET /api/reports/import/:sessionId - Retrieve import report for a specific session
router.get('/import/:sessionId', authenticateToken, getImportReport);

// GET /api/reports/system-summary - Retrieve a high-level system-wide aggregate summary
router.get('/system-summary', authenticateToken, getSystemSummary);

module.exports = router;
