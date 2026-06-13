const prisma = require('../../config/prisma.js');
const csvImportService = require('../../services/import/csvImportService.js');
const anomalyDetectionService = require('../../services/import/anomalyDetectionService.js');
const fs = require('fs');

/**
 * Controller endpoint to handle CSV file upload, parsing, and record staging.
 */
const uploadCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a valid CSV file.'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.'
      });
    }

    // 1. Create staging import session
    const session = await csvImportService.createImportSession(req.user.id, req.file.originalname);

    // 2. Parse the CSV file
    let rows;
    try {
      rows = await csvImportService.parseCsvFile(req.file.path);
    } catch (parseError) {
      // Update session status to FAILED in case of file corruptions/formatting errors
      await prisma.importSession.update({
        where: { id: session.id },
        data: { status: 'FAILED' }
      });
      // Delete temporary uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Failed to parse CSV file content: ' + parseError.message
      });
    }

    // 3. Store raw records in database staging table
    const summary = await csvImportService.saveImportRecords(session.id, rows);

    // 4. Run anomaly detection on staged records
    const anomalySummary = await anomalyDetectionService.detectAnomalies(session.id);

    // 5. Update session status based on anomaly detection results
    let finalStatus = 'COMPLETED';
    if (anomalySummary.totalAnomalies > 0) {
      finalStatus = 'REVIEW_REQUIRED';
    }
    await prisma.importSession.update({
      where: { id: session.id },
      data: { status: finalStatus }
    });

    // 6. Delete the temp uploaded file now that staging is successfully completed
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(201).json({
      success: true,
      message: anomalySummary.totalAnomalies > 0
        ? `CSV staged with ${anomalySummary.totalAnomalies} anomaly/anomalies requiring review.`
        : 'CSV uploaded and staged successfully with no anomalies.',
      session: {
        id: session.id,
        originalFileName: session.originalFileName,
        status: finalStatus,
        totalRows: summary.totalRows,
        createdAt: session.createdAt
      },
      anomalySummary: {
        totalAnomalies: anomalySummary.totalAnomalies,
        recordsWithAnomalies: anomalySummary.recordsWithAnomalies
      }
    });
  } catch (error) {
    // Cleanup temporary uploaded file on server errors
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('File cleanup error:', err);
      }
    }
    next(error);
  }
};

/**
 * Controller endpoint to retrieve details of a specific staging import session.
 */
const getImportSession = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId parameter is required.'
      });
    }

    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Import session not found.'
      });
    }

    // Authorization check: only the user who uploaded the session can view it
    if (session.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this import session.'
      });
    }

    return res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller endpoint to retrieve all staged import records for a session.
 */
const getImportRecords = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId parameter is required.'
      });
    }

    // Verify session existence and user authorization
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Import session not found.'
      });
    }

    if (session.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view records of this session.'
      });
    }

    const records = await prisma.importRecord.findMany({
      where: { importSessionId: sessionId },
      orderBy: { rowNumber: 'asc' }
    });

    return res.status(200).json({
      success: true,
      records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller endpoint to retrieve all anomalies for a staging import session.
 */
const getSessionAnomalies = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId parameter is required.'
      });
    }

    // Verify session and authorization
    const session = await prisma.importSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Import session not found.' });
    }
    if (session.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view anomalies for this session.'
      });
    }

    const anomalies = await anomalyDetectionService.getSessionAnomalies(sessionId);

    return res.status(200).json({
      success: true,
      sessionId,
      totalAnomalies: anomalies.length,
      anomalies
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller endpoint to update the status of a single anomaly.
 * Body: { status: 'APPROVED' | 'REJECTED' | 'FIXED' }
 */
const updateAnomalyStatus = async (req, res, next) => {
  try {
    const anomalyId = parseInt(req.params.anomalyId, 10);
    if (isNaN(anomalyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid anomalyId parameter is required.'
      });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a "status" field.'
      });
    }

    // Verify anomaly exists and caller owns the parent session
    const anomaly = await prisma.importAnomaly.findUnique({
      where: { id: anomalyId },
      include: { importSession: { select: { uploadedById: true } } }
    });
    if (!anomaly) {
      return res.status(404).json({ success: false, message: 'Anomaly not found.' });
    }
    if (anomaly.importSession.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to update this anomaly.'
      });
    }

    const updated = await anomalyDetectionService.updateAnomalyStatus(anomalyId, status);

    return res.status(200).json({
      success: true,
      message: `Anomaly status updated to "${status}".`,
      anomaly: updated
    });
  } catch (error) {
    if (error.message.startsWith('Invalid status')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  uploadCsv,
  getImportSession,
  getImportRecords,
  getSessionAnomalies,
  updateAnomalyStatus
};
