const prisma = require('../../config/prisma.js');

/**
 * Re-evaluates and updates the status of the parent ImportRecord and ImportSession.
 * Assumed to run within a transaction context `tx`.
 * 
 * @param {object} tx - Prisma transaction client
 * @param {number} recordId 
 * @param {number} sessionId 
 */
async function updateParentStatuses(tx, recordId, sessionId) {
  // 1. Fetch all anomalies associated with this record
  const recordAnomalies = await tx.importAnomaly.findMany({
    where: { importRecordId: recordId }
  });

  const openAnomalies = recordAnomalies.filter(a => a.status === 'OPEN');
  let newRecordStatus = 'VALID';

  if (openAnomalies.length > 0) {
    // If there are still open anomalies, determine status by severity
    const hasHigh = openAnomalies.some(a => ['HIGH', 'CRITICAL'].includes(a.severity));
    newRecordStatus = hasHigh ? 'INVALID' : 'REVIEW_REQUIRED';
  } else {
    // If all anomalies are resolved, mark INVALID if any was rejected or merged
    const hasRejectedOrMerged = recordAnomalies.some(a => ['REJECTED', 'MERGED'].includes(a.reviewDecision));
    newRecordStatus = hasRejectedOrMerged ? 'INVALID' : 'VALID';
  }

  // Update the record status
  await tx.importRecord.update({
    where: { id: recordId },
    data: { status: newRecordStatus }
  });

  // 2. Fetch all anomalies associated with this session to determine session status
  const sessionAnomalies = await tx.importAnomaly.findMany({
    where: { importSessionId: sessionId }
  });

  const openSessionAnomalies = sessionAnomalies.filter(a => a.status === 'OPEN');
  const newSessionStatus = openSessionAnomalies.length === 0 ? 'COMPLETED' : 'REVIEW_REQUIRED';

  // Update the session status
  await tx.importSession.update({
    where: { id: sessionId },
    data: { status: newSessionStatus }
  });
}

/**
 * Approves an anomaly.
 * Marks the anomaly as APPROVED and updates the associated record's status.
 *
 * @param {number|string} anomalyId 
 * @param {number|string} reviewerId 
 * @param {string} [notes] 
 * @returns {Promise<Object>} Updated ImportAnomaly record
 */
async function approveAnomaly(anomalyId, reviewerId, notes) {
  const parsedAnomalyId = parseInt(anomalyId, 10);
  const parsedReviewerId = parseInt(reviewerId, 10);

  if (isNaN(parsedAnomalyId) || isNaN(parsedReviewerId)) {
    const error = new Error('Invalid anomalyId or reviewerId provided.');
    error.statusCode = 400;
    throw error;
  }

  // Verify reviewer exists
  const reviewerExists = await prisma.user.findUnique({
    where: { id: parsedReviewerId }
  });
  if (!reviewerExists) {
    const error = new Error(`Reviewer with ID ${parsedReviewerId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Verify anomaly exists
  const anomaly = await prisma.importAnomaly.findUnique({
    where: { id: parsedAnomalyId }
  });
  if (!anomaly) {
    const error = new Error(`Anomaly with ID ${parsedAnomalyId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updatedAnomaly = await tx.importAnomaly.update({
      where: { id: parsedAnomalyId },
      data: {
        status: 'APPROVED',
        reviewDecision: 'APPROVED',
        reviewedById: parsedReviewerId,
        reviewedAt: new Date(),
        resolutionNotes: notes || null
      }
    });

    await updateParentStatuses(tx, anomaly.importRecordId, anomaly.importSessionId);

    return updatedAnomaly;
  });
}

/**
 * Rejects an anomaly.
 * Marks the anomaly as REJECTED and updates the associated record's status.
 *
 * @param {number|string} anomalyId 
 * @param {number|string} reviewerId 
 * @param {string} [notes] 
 * @returns {Promise<Object>} Updated ImportAnomaly record
 */
async function rejectAnomaly(anomalyId, reviewerId, notes) {
  const parsedAnomalyId = parseInt(anomalyId, 10);
  const parsedReviewerId = parseInt(reviewerId, 10);

  if (isNaN(parsedAnomalyId) || isNaN(parsedReviewerId)) {
    const error = new Error('Invalid anomalyId or reviewerId provided.');
    error.statusCode = 400;
    throw error;
  }

  // Verify reviewer exists
  const reviewerExists = await prisma.user.findUnique({
    where: { id: parsedReviewerId }
  });
  if (!reviewerExists) {
    const error = new Error(`Reviewer with ID ${parsedReviewerId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Verify anomaly exists
  const anomaly = await prisma.importAnomaly.findUnique({
    where: { id: parsedAnomalyId }
  });
  if (!anomaly) {
    const error = new Error(`Anomaly with ID ${parsedAnomalyId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updatedAnomaly = await tx.importAnomaly.update({
      where: { id: parsedAnomalyId },
      data: {
        status: 'REJECTED',
        reviewDecision: 'REJECTED',
        reviewedById: parsedReviewerId,
        reviewedAt: new Date(),
        resolutionNotes: notes || null
      }
    });

    await updateParentStatuses(tx, anomaly.importRecordId, anomaly.importSessionId);

    return updatedAnomaly;
  });
}

/**
 * Resolves an anomaly via a manual fix.
 * Updates the anomaly status to FIXED, reviewDecision to MANUAL_FIX,
 * merges the fixedData into the parent ImportRecord's rawData JSON, and re-evaluates statuses.
 *
 * @param {number|string} anomalyId 
 * @param {number|string} reviewerId 
 * @param {string} [notes] 
 * @param {Object} fixedData - The corrected fields to merge into record.rawData
 * @returns {Promise<Object>} Updated ImportAnomaly record
 */
async function manualFixAnomaly(anomalyId, reviewerId, notes, fixedData) {
  const parsedAnomalyId = parseInt(anomalyId, 10);
  const parsedReviewerId = parseInt(reviewerId, 10);

  if (isNaN(parsedAnomalyId) || isNaN(parsedReviewerId)) {
    const error = new Error('Invalid anomalyId or reviewerId provided.');
    error.statusCode = 400;
    throw error;
  }

  if (!fixedData || typeof fixedData !== 'object') {
    const error = new Error('fixedData object is required for manual fix.');
    error.statusCode = 400;
    throw error;
  }

  // Verify reviewer exists
  const reviewerExists = await prisma.user.findUnique({
    where: { id: parsedReviewerId }
  });
  if (!reviewerExists) {
    const error = new Error(`Reviewer with ID ${parsedReviewerId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Verify anomaly exists
  const anomaly = await prisma.importAnomaly.findUnique({
    where: { id: parsedAnomalyId }
  });
  if (!anomaly) {
    const error = new Error(`Anomaly with ID ${parsedAnomalyId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Verify parent record exists
  const record = await prisma.importRecord.findUnique({
    where: { id: anomaly.importRecordId }
  });
  if (!record) {
    const error = new Error(`ImportRecord with ID ${anomaly.importRecordId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const updatedRawData = {
    ...(typeof record.rawData === 'object' && record.rawData !== null ? record.rawData : {}),
    ...fixedData
  };

  return await prisma.$transaction(async (tx) => {
    // 1. Update the parent record data
    await tx.importRecord.update({
      where: { id: anomaly.importRecordId },
      data: { rawData: updatedRawData }
    });

    // 2. Update the anomaly
    const updatedAnomaly = await tx.importAnomaly.update({
      where: { id: parsedAnomalyId },
      data: {
        status: 'FIXED',
        reviewDecision: 'MANUAL_FIX',
        reviewedById: parsedReviewerId,
        reviewedAt: new Date(),
        resolutionNotes: notes || null
      }
    });

    // 3. Update parent statuses
    await updateParentStatuses(tx, anomaly.importRecordId, anomaly.importSessionId);

    return updatedAnomaly;
  });
}

/**
 * Resolves a duplicate anomaly by merging it.
 * Marks the anomaly as FIXED, reviewDecision as MERGED,
 * links/notes the targetRecordId it was merged into, updates the duplicate record's status to INVALID,
 * and re-evaluates parent session status.
 *
 * @param {number|string} anomalyId 
 * @param {number|string} reviewerId 
 * @param {string} [notes] 
 * @param {number|string} targetRecordId - The ID of the primary record this duplicate is merged into
 * @returns {Promise<Object>} Updated ImportAnomaly record
 */
async function mergeDuplicateAnomaly(anomalyId, reviewerId, notes, targetRecordId) {
  const parsedAnomalyId = parseInt(anomalyId, 10);
  const parsedReviewerId = parseInt(reviewerId, 10);
  const parsedTargetRecordId = parseInt(targetRecordId, 10);

  if (isNaN(parsedAnomalyId) || isNaN(parsedReviewerId) || isNaN(parsedTargetRecordId)) {
    const error = new Error('Invalid anomalyId, reviewerId, or targetRecordId provided.');
    error.statusCode = 400;
    throw error;
  }

  // Verify reviewer exists
  const reviewerExists = await prisma.user.findUnique({
    where: { id: parsedReviewerId }
  });
  if (!reviewerExists) {
    const error = new Error(`Reviewer with ID ${parsedReviewerId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Verify anomaly exists
  const anomaly = await prisma.importAnomaly.findUnique({
    where: { id: parsedAnomalyId }
  });
  if (!anomaly) {
    const error = new Error(`Anomaly with ID ${parsedAnomalyId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Verify target record exists
  const targetRecord = await prisma.importRecord.findUnique({
    where: { id: parsedTargetRecordId }
  });
  if (!targetRecord) {
    const error = new Error(`Target ImportRecord with ID ${parsedTargetRecordId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const finalNotes = `Merged into record ID: ${parsedTargetRecordId}.${notes ? ` Notes: ${notes}` : ''}`;

  return await prisma.$transaction(async (tx) => {
    // 1. Update the anomaly
    const updatedAnomaly = await tx.importAnomaly.update({
      where: { id: parsedAnomalyId },
      data: {
        status: 'FIXED',
        reviewDecision: 'MERGED',
        reviewedById: parsedReviewerId,
        reviewedAt: new Date(),
        resolutionNotes: finalNotes
      }
    });

    // 2. Set the duplicate record status to INVALID so it isn't processed during final imports
    await tx.importRecord.update({
      where: { id: anomaly.importRecordId },
      data: { status: 'INVALID' }
    });

    // 3. Re-evaluate parent session status
    await updateParentStatuses(tx, anomaly.importRecordId, anomaly.importSessionId);

    return updatedAnomaly;
  });
}

module.exports = {
  approveAnomaly,
  rejectAnomaly,
  manualFixAnomaly,
  mergeDuplicateAnomaly
};
