const { Router } = require('express');
const { authenticateToken } = require('../middleware/authMiddleware.js');
const {
  approveAnomaly,
  rejectAnomaly,
  manualFixAnomaly,
  mergeDuplicateAnomaly,
  resolveDuplicates
} = require('../controllers/review/reviewController.js');

const router = Router();

// POST /api/review/anomalies/:anomalyId/approve
// Approves an anomaly and cascades record/session status updates
router.post('/anomalies/:anomalyId/approve', authenticateToken, approveAnomaly);

// POST /api/review/anomalies/:anomalyId/reject
// Rejects an anomaly and marks the parent record as invalid
router.post('/anomalies/:anomalyId/reject', authenticateToken, rejectAnomaly);

// POST /api/review/anomalies/:anomalyId/manual-fix
// Applies a manual data correction to the parent record and marks anomaly as fixed
router.post('/anomalies/:anomalyId/manual-fix', authenticateToken, manualFixAnomaly);

// POST /api/review/anomalies/:anomalyId/merge
// Merges a duplicate anomaly into a target record and marks the duplicate as invalid
router.post('/anomalies/:anomalyId/merge', authenticateToken, mergeDuplicateAnomaly);

// POST /api/review/duplicates/resolve
// Resolves a duplicate record pair using a chosen strategy (KEEP_ORIGINAL | KEEP_DUPLICATE | MERGE | SKIP)
router.post('/duplicates/resolve', authenticateToken, resolveDuplicates);

module.exports = router;
