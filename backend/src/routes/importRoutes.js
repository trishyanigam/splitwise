const { Router } = require('express');
const { uploadCsv, getImportSession, getImportRecords } = require('../controllers/import/importController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');
const upload = require('../config/upload.js');

const router = Router();

// POST /api/import/upload - Uploads a CSV, parses it, and stages the records
router.post('/upload', authenticateToken, upload.single('file'), uploadCsv);

// GET /api/import/:sessionId - Retrieves details of a staging import session
router.get('/:sessionId', authenticateToken, getImportSession);

// GET /api/import/:sessionId/records - Retrieves all staged records for a session
router.get('/:sessionId/records', authenticateToken, getImportRecords);

module.exports = router;
