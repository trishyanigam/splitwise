const prisma = require('../../config/prisma.js');
const resolutionService = require('../../services/policies/resolutionService.js');

/**
 * Controller endpoint to apply a resolution strategy to a flagged anomaly.
 * Route: POST /api/import/anomalies/:anomalyId/resolve
 * Body: { resolutionType: string, resolvedValue?: Object }
 */
const resolveAnomaly = async (req, res, next) => {
  try {
    const anomalyId = parseInt(req.params.anomalyId || req.params.id, 10);
    if (isNaN(anomalyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid anomalyId parameter is required.'
      });
    }

    const { resolutionType, resolvedValue } = req.body;
    if (!resolutionType) {
      return res.status(400).json({
        success: false,
        message: 'Resolution type is required.'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication is required.'
      });
    }

    // Authorization: Verify anomaly exists and belongs to a session uploaded by this user
    const anomaly = await prisma.importAnomaly.findUnique({
      where: { id: anomalyId },
      include: {
        importSession: {
          select: { uploadedById: true }
        }
      }
    });

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: 'Anomaly not found.'
      });
    }

    if (anomaly.importSession.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to resolve anomalies for this session.'
      });
    }

    // Apply resolution strategy via policy service
    const resolvedAnomaly = await resolutionService.applyResolution(
      anomalyId,
      resolutionType,
      resolvedValue,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: 'Resolution successfully applied to anomaly.',
      anomaly: {
        id: resolvedAnomaly.id,
        status: resolvedAnomaly.status,
        reviewDecision: resolvedAnomaly.reviewDecision,
        reviewedAt: resolvedAnomaly.reviewedAt,
        resolutionNotes: resolvedAnomaly.resolutionNotes,
        recordStatus: resolvedAnomaly.importRecord.status,
        sessionStatus: resolvedAnomaly.importSession.status
      }
    });
  } catch (error) {
    if (error.message.startsWith('Invalid resolutionType') || error.message.startsWith('Corrected resolvedValue')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Controller endpoint to retrieve the full audit log of resolutions applied to an anomaly.
 * Route: GET /api/import/anomalies/:anomalyId/history
 */
const getResolutionHistory = async (req, res, next) => {
  try {
    const anomalyId = parseInt(req.params.anomalyId || req.params.id, 10);
    if (isNaN(anomalyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid anomalyId parameter is required.'
      });
    }

    // Authorization: Verify anomaly belongs to this user
    const anomaly = await prisma.importAnomaly.findUnique({
      where: { id: anomalyId },
      include: {
        importSession: {
          select: { uploadedById: true }
        }
      }
    });

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: 'Anomaly not found.'
      });
    }

    if (anomaly.importSession.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view resolution history for this session.'
      });
    }

    const history = await resolutionService.getResolutionHistory(anomalyId);

    return res.status(200).json({
      success: true,
      anomalyId,
      history
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resolveAnomaly,
  getResolutionHistory
};
