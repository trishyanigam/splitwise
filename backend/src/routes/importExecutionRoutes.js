const { Router } = require('express');
const { executeImport, getExecutionStatus, getReadinessStatus } = require('../controllers/import/importExecutionController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const router = Router();

// GET /api/import/:sessionId/readiness - Pre-flight check: is the session ready to execute?
router.get('/:sessionId/readiness', authenticateToken, getReadinessStatus);

// POST /api/import/:sessionId/execute - Commits approved staged records to the ledger
router.post('/:sessionId/execute', authenticateToken, executeImport);

// GET /api/import/:sessionId/execution - Retrieves execution progress and summary details
router.get('/:sessionId/execution', authenticateToken, getExecutionStatus);

module.exports = router;
