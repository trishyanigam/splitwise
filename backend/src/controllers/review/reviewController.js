const prisma = require('../../config/prisma.js');
const anomalyReviewService = require('../../services/review/anomalyReviewService.js');
const duplicateMergeService = require('../../services/review/duplicateMergeService.js');

/**
 * Helper to fetch the anomaly and verify the current user has permission to review it.
 * (i.e., they uploaded the parent import session).
 * Throws an error with appropriate statusCode if validation fails.
 * 
 * @param {number} anomalyId 
 * @param {number} userId 
 * @returns {Promise<Object>} The anomaly record with included importSession
 */
async function verifyAnomalyAccess(anomalyId, userId) {
  const anomaly = await prisma.importAnomaly.findUnique({
    where: { id: anomalyId },
    include: {
      importSession: {
        select: { uploadedById: true }
      }
    }
  });

  if (!anomaly) {
    const error = new Error('Anomaly not found.');
    error.statusCode = 404;
    throw error;
  }

  if (anomaly.importSession.uploadedById !== userId) {
    const error = new Error('Access denied. You do not have permission to review this anomaly.');
    error.statusCode = 403;
    throw error;
  }

  return anomaly;
}

/**
 * Approves an anomaly and updates the record status.
 * Body: { notes: string }
 */
const approveAnomaly = async (req, res, next) => {
  try {
    const anomalyId = parseInt(req.params.anomalyId, 10);
    if (isNaN(anomalyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid anomalyId parameter is required.'
      });
    }

    const { notes } = req.body;

    // 1. Verify that the anomaly exists and the user owns the session
    await verifyAnomalyAccess(anomalyId, req.user.id);

    // 2. Call the service to approve the anomaly
    const updated = await anomalyReviewService.approveAnomaly(anomalyId, req.user.id, notes);

    return res.status(200).json({
      success: true,
      message: 'Anomaly approved successfully.',
      anomaly: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rejects an anomaly and marks the record as invalid.
 * Body: { notes: string }
 */
const rejectAnomaly = async (req, res, next) => {
  try {
    const anomalyId = parseInt(req.params.anomalyId, 10);
    if (isNaN(anomalyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid anomalyId parameter is required.'
      });
    }

    const { notes } = req.body;

    // 1. Verify access permissions
    await verifyAnomalyAccess(anomalyId, req.user.id);

    // 2. Call service to reject anomaly
    const updated = await anomalyReviewService.rejectAnomaly(anomalyId, req.user.id, notes);

    return res.status(200).json({
      success: true,
      message: 'Anomaly rejected successfully.',
      anomaly: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates raw data fields of the record and marks the anomaly as fixed.
 * Body: { notes: string, fixedData: Object }
 */
const manualFixAnomaly = async (req, res, next) => {
  try {
    const anomalyId = parseInt(req.params.anomalyId, 10);
    if (isNaN(anomalyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid anomalyId parameter is required.'
      });
    }

    const { notes, fixedData } = req.body;
    if (!fixedData || typeof fixedData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a "fixedData" object containing fields to update.'
      });
    }

    // 1. Verify access permissions
    await verifyAnomalyAccess(anomalyId, req.user.id);

    // 2. Call service to manually fix anomaly
    const updated = await anomalyReviewService.manualFixAnomaly(anomalyId, req.user.id, notes, fixedData);

    return res.status(200).json({
      success: true,
      message: 'Anomaly manually fixed successfully.',
      anomaly: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marks duplicate record as invalid and logs merge details.
 * Body: { notes: string, targetRecordId: number }
 */
const mergeDuplicateAnomaly = async (req, res, next) => {
  try {
    const anomalyId = parseInt(req.params.anomalyId, 10);
    if (isNaN(anomalyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid anomalyId parameter is required.'
      });
    }

    const { notes, targetRecordId } = req.body;
    if (targetRecordId === undefined || targetRecordId === null) {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a "targetRecordId" of the primary record to merge into.'
      });
    }

    const parsedTargetRecordId = parseInt(targetRecordId, 10);
    if (isNaN(parsedTargetRecordId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid targetRecordId must be a number.'
      });
    }

    // 1. Verify access permissions
    await verifyAnomalyAccess(anomalyId, req.user.id);

    // 2. Call service to merge duplicate anomaly
    const updated = await anomalyReviewService.mergeDuplicateAnomaly(anomalyId, req.user.id, notes, parsedTargetRecordId);

    return res.status(200).json({
      success: true,
      message: 'Anomaly merged successfully.',
      anomaly: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolves a duplicate record pair using the duplicateMergeService.
 * Body: { originalRecordId: number, duplicateRecordId: number, action: string, notes?: string }
 */
const resolveDuplicates = async (req, res, next) => {
  try {
    const { originalRecordId, duplicateRecordId, action, notes } = req.body;

    if (!originalRecordId || !duplicateRecordId || !action) {
      return res.status(400).json({
        success: false,
        message: 'Request body must include "originalRecordId", "duplicateRecordId", and "action".'
      });
    }

    const result = await duplicateMergeService.resolveDuplicates({
      originalRecordId,
      duplicateRecordId,
      action,
      reviewerId: req.user.id,
      notes
    });

    return res.status(200).json({
      success: true,
      message: `Duplicate resolved using ${action}.`,
      result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  approveAnomaly,
  rejectAnomaly,
  manualFixAnomaly,
  mergeDuplicateAnomaly,
  resolveDuplicates
};
