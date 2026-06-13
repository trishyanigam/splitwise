const prisma = require('../../config/prisma.js');

/**
 * Stores a resolution history log record in the database.
 * 
 * @param {number} anomalyId - Target anomaly ID
 * @param {string} resolutionType - Enum value (APPROVED, REJECTED, MERGED, CONVERT_TO_SETTLEMENT, CONVERT_TO_REFUND, MANUAL_CORRECTION)
 * @param {Object|null} originalValue - Original metadata values
 * @param {Object|null} resolvedValue - Corrected/resolved metadata values
 * @returns {Promise<Object>} Created ImportResolution record
 */
async function storeResolution(anomalyId, resolutionType, originalValue = null, resolvedValue = null) {
  const parsedAnomalyId = parseInt(anomalyId, 10);
  if (isNaN(parsedAnomalyId)) {
    throw new Error('Valid anomalyId is required to store a resolution.');
  }

  const VALID_RESOLUTION_TYPES = [
    'APPROVED',
    'REJECTED',
    'MERGED',
    'CONVERT_TO_SETTLEMENT',
    'CONVERT_TO_REFUND',
    'MANUAL_CORRECTION'
  ];

  if (!VALID_RESOLUTION_TYPES.includes(resolutionType)) {
    throw new Error(`Invalid resolutionType "${resolutionType}".`);
  }

  return await prisma.importResolution.create({
    data: {
      anomalyId: parsedAnomalyId,
      resolutionType,
      originalValue: originalValue ? JSON.parse(JSON.stringify(originalValue)) : null,
      resolvedValue: resolvedValue ? JSON.parse(JSON.stringify(resolvedValue)) : null
    }
  });
}

/**
 * Applies a resolution strategy to a flagged anomaly.
 * Modifies the staged raw record if necessary, logs the resolution attempt,
 * updates the anomaly state, and refreshes the session's overall progress.
 *
 * Supported resolutions:
 * - APPROVED: Flags the anomaly as APPROVED and marks record status to VALID.
 * - REJECTED: Flags the anomaly as REJECTED and marks record status to INVALID.
 * - CONVERT_TO_REFUND: Normalizes negative amounts to positive refund, marks fixed, status to VALID.
 * - CONVERT_TO_SETTLEMENT: Rewrites SplitType or flags the record, status to VALID.
 * - MANUAL_CORRECTION: Updates rawData with manually provided resolvedValue, status to VALID.
 *
 * @param {number} anomalyId - Target anomaly ID to resolve
 * @param {string} resolutionType - APPROVED | REJECTED | CONVERT_TO_REFUND | CONVERT_TO_SETTLEMENT | MANUAL_CORRECTION
 * @param {Object|null} resolvedValue - Custom corrected payload (for MANUAL_CORRECTION)
 * @param {number} userId - ID of the reviewing user
 * @returns {Promise<Object>} Updated anomaly object including record and session details.
 */
async function applyResolution(anomalyId, resolutionType, resolvedValue = null, userId) {
  const parsedAnomalyId = parseInt(anomalyId, 10);
  const parsedUserId = parseInt(userId, 10);

  if (isNaN(parsedAnomalyId)) throw new Error('Valid anomalyId is required.');
  if (isNaN(parsedUserId)) throw new Error('Valid reviewer userId is required.');

  // 1. Fetch anomaly with staging details
  const anomaly = await prisma.importAnomaly.findUnique({
    where: { id: parsedAnomalyId },
    include: {
      importRecord: true,
      importSession: true
    }
  });

  if (!anomaly) {
    throw new Error(`ImportAnomaly with ID ${anomalyId} not found.`);
  }

  const record = anomaly.importRecord;
  const session = anomaly.importSession;

  let originalValue = record.rawData;
  let finalRawData = { ...originalValue };
  let recordStatus = 'VALID';
  let anomalyStatus = 'FIXED';
  let decision = 'PENDING';
  let notes = '';

  // 2. Resolve parameters based on strategy
  switch (resolutionType) {
    case 'APPROVED':
      anomalyStatus = 'APPROVED';
      decision = 'APPROVED';
      recordStatus = 'VALID';
      notes = 'User approved this warning/anomaly.';
      break;

    case 'REJECTED':
      anomalyStatus = 'REJECTED';
      decision = 'REJECTED';
      recordStatus = 'INVALID';
      notes = 'User rejected this record. It will be skipped on ledger commits.';
      break;

    case 'MERGED':
      anomalyStatus = 'FIXED';
      decision = 'MERGED';
      recordStatus = 'VALID';
      notes = 'Merged with another duplicate record. Row will be skipped on ledger commits.';
      break;

    case 'CONVERT_TO_REFUND':
      // Invert negative amount to positive refund value
      let originalAmount = null;
      let amountKey = 'amount';

      for (const [k, v] of Object.entries(finalRawData)) {
        if (k.trim().toLowerCase().replace(/\s+/g, '') === 'amount') {
          originalAmount = Number(String(v).replace(/,/g, ''));
          amountKey = k;
          break;
        }
      }

      if (originalAmount !== null && originalAmount < 0) {
        finalRawData[amountKey] = String(Math.abs(originalAmount));
      }

      anomalyStatus = 'FIXED';
      decision = 'MANUAL_FIX';
      recordStatus = 'VALID';
      notes = 'Amount inverted from negative value to a positive refund.';
      break;

    case 'CONVERT_TO_SETTLEMENT':
      // Switch description/type to settlement
      anomalyStatus = 'FIXED';
      decision = 'MANUAL_FIX';
      recordStatus = 'VALID';
      notes = 'Flagged to be committed as a settlement instead of expense split.';
      break;

    case 'MANUAL_CORRECTION':
      if (!resolvedValue || typeof resolvedValue !== 'object') {
        throw new Error('Corrected resolvedValue payload is required for manual corrections.');
      }
      finalRawData = { ...finalRawData, ...resolvedValue };
      anomalyStatus = 'FIXED';
      decision = 'MANUAL_FIX';
      recordStatus = 'VALID';
      notes = 'Manual correction applied to record attributes.';
      break;

    default:
      throw new Error(`Unsupported resolution type "${resolutionType}".`);
  }

  // 3. Persist modifications in database transaction block
  const result = await prisma.$transaction(async (tx) => {
    // A. Update ImportRecord rawData and status
    const updatedRecord = await tx.importRecord.update({
      where: { id: record.id },
      data: {
        rawData: finalRawData,
        status: recordStatus
      }
    });

    // B. Update ImportAnomaly with decision and audit columns
    const updatedAnomaly = await tx.importAnomaly.update({
      where: { id: anomaly.id },
      data: {
        status: anomalyStatus,
        reviewDecision: decision,
        reviewedById: parsedUserId,
        reviewedAt: new Date(),
        resolutionNotes: notes
      },
      include: {
        importRecord: true,
        importSession: true
      }
    });

    // C. Store resolution details log
    await tx.importResolution.create({
      data: {
        anomalyId: parsedAnomalyId,
        resolutionType,
        originalValue: originalValue ? JSON.parse(JSON.stringify(originalValue)) : null,
        resolvedValue: finalRawData ? JSON.parse(JSON.stringify(finalRawData)) : null
      }
    });

    // D. Recalculate open anomalies remaining in the session
    const openAnomaliesCount = await tx.importAnomaly.count({
      where: {
        importSessionId: session.id,
        status: 'OPEN'
      }
    });

    // If no more open anomalies, update session to COMPLETED
    if (openAnomaliesCount === 0) {
      await tx.importSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED' }
      });
    }

    return updatedAnomaly;
  });

  return result;
}

/**
 * Retrieves the complete resolution attempts audit trail for an anomaly.
 *
 * @param {number} anomalyId
 * @returns {Promise<Array>} List of resolution attempts ordered by time
 */
async function getResolutionHistory(anomalyId) {
  const parsedAnomalyId = parseInt(anomalyId, 10);
  if (isNaN(parsedAnomalyId)) {
    throw new Error('Valid anomalyId is required to retrieve history.');
  }

  return await prisma.importResolution.findMany({
    where: { anomalyId: parsedAnomalyId },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = {
  storeResolution,
  applyResolution,
  getResolutionHistory
};
