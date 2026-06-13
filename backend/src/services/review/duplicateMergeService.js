const prisma = require('../../config/prisma.js');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported merge action strategies.
 * @enum {string}
 */
const MERGE_ACTION = {
  /** Keep the original record as-is; discard the duplicate. */
  KEEP_ORIGINAL: 'KEEP_ORIGINAL',
  /** Promote the duplicate to become the authoritative record; discard the original. */
  KEEP_DUPLICATE: 'KEEP_DUPLICATE',
  /** Deep-merge both records' rawData, with the duplicate's fields taking precedence. */
  MERGE: 'MERGE',
  /** Leave both records unchanged; resolve the anomaly without altering any record. */
  SKIP: 'SKIP'
};

const VALID_ACTIONS = Object.values(MERGE_ACTION);

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads and validates an ImportRecord, throwing a typed error if not found.
 *
 * @param {object} tx    - Prisma transaction client (or prisma directly)
 * @param {number} id    - Record ID to fetch
 * @param {string} label - Human-readable label used in error messages ('originalRecord' | 'duplicateRecord')
 * @returns {Promise<Object>} The ImportRecord row
 */
async function fetchRecord(tx, id, label) {
  const record = await tx.importRecord.findUnique({ where: { id } });
  if (!record) {
    const error = new Error(`${label} with ID ${id} not found.`);
    error.statusCode = 404;
    throw error;
  }
  return record;
}

/**
 * Deep-merges two rawData JSON objects.
 * The duplicate's fields overwrite the original's on key conflicts.
 *
 * @param {Object} originalData
 * @param {Object} duplicateData
 * @returns {Object} Merged data
 */
function mergeRawData(originalData, duplicateData) {
  const orig = (typeof originalData === 'object' && originalData !== null) ? originalData : {};
  const dupl = (typeof duplicateData === 'object' && duplicateData !== null) ? duplicateData : {};
  return { ...orig, ...dupl };
}

/**
 * Updates record status and re-evaluates parent session completion.
 * Run inside a transaction context.
 *
 * @param {object} tx       - Prisma transaction client
 * @param {number} recordId - Record whose status to recalculate
 * @param {number} sessionId
 */
async function reconcileStatuses(tx, recordId, sessionId) {
  // Re-evaluate record status from its open anomalies
  const anomalies = await tx.importAnomaly.findMany({
    where: { importRecordId: recordId }
  });

  const openAnomalies = anomalies.filter(a => a.status === 'OPEN');
  let newRecordStatus;

  if (openAnomalies.length > 0) {
    const hasHigh = openAnomalies.some(a => ['HIGH', 'CRITICAL'].includes(a.severity));
    newRecordStatus = hasHigh ? 'INVALID' : 'REVIEW_REQUIRED';
  } else {
    // Only REJECTED decisions render a record invalid.
    // MERGED means this record's duplicate was discarded — the record itself is intact (VALID).
    const hasRejected = anomalies.some(a => a.reviewDecision === 'REJECTED');
    newRecordStatus = hasRejected ? 'INVALID' : 'VALID';
  }

  await tx.importRecord.update({
    where: { id: recordId },
    data: { status: newRecordStatus }
  });

  // Re-evaluate session completion
  const sessionAnomalies = await tx.importAnomaly.findMany({
    where: { importSessionId: sessionId }
  });

  const hasOpenSessionAnomalies = sessionAnomalies.some(a => a.status === 'OPEN');
  await tx.importSession.update({
    where: { id: sessionId },
    data: { status: hasOpenSessionAnomalies ? 'REVIEW_REQUIRED' : 'COMPLETED' }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a pair of duplicate ImportRecords using a chosen strategy.
 *
 * The function performs all writes atomically inside a Prisma transaction and
 * re-evaluates the statuses of both records plus their parent ImportSession.
 *
 * @param {Object} options
 * @param {number|string} options.originalRecordId  - ID of the authoritative (first-seen) record
 * @param {number|string} options.duplicateRecordId - ID of the duplicate record
 * @param {string}        options.action            - One of KEEP_ORIGINAL | KEEP_DUPLICATE | MERGE | SKIP
 * @param {number|string} options.reviewerId        - ID of the user performing the review
 * @param {string}        [options.notes]           - Optional reviewer notes stored on resolved anomalies
 *
 * @returns {Promise<{
 *   action: string,
 *   survivingRecord: Object,
 *   discardedRecord: Object|null,
 *   resolvedAnomalies: Object[]
 * }>}
 */
async function resolveDuplicates({ originalRecordId, duplicateRecordId, action, reviewerId, notes }) {
  // ── Input validation ──────────────────────────────────────────────────────
  const parsedOriginalId   = parseInt(originalRecordId, 10);
  const parsedDuplicateId  = parseInt(duplicateRecordId, 10);
  const parsedReviewerId   = parseInt(reviewerId, 10);

  if (isNaN(parsedOriginalId) || isNaN(parsedDuplicateId) || isNaN(parsedReviewerId)) {
    const error = new Error('Invalid originalRecordId, duplicateRecordId, or reviewerId provided.');
    error.statusCode = 400;
    throw error;
  }

  if (parsedOriginalId === parsedDuplicateId) {
    const error = new Error('originalRecordId and duplicateRecordId must be different records.');
    error.statusCode = 400;
    throw error;
  }

  if (!VALID_ACTIONS.includes(action)) {
    const error = new Error(
      `Invalid action "${action}". Must be one of: ${VALID_ACTIONS.join(', ')}.`
    );
    error.statusCode = 400;
    throw error;
  }

  // ── Verify reviewer ───────────────────────────────────────────────────────
  const reviewer = await prisma.user.findUnique({ where: { id: parsedReviewerId } });
  if (!reviewer) {
    const error = new Error(`Reviewer with ID ${parsedReviewerId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // ── Load records (outside transaction to surface 404 early) ───────────────
  const [originalRecord, duplicateRecord] = await Promise.all([
    fetchRecord(prisma, parsedOriginalId,  'originalRecord'),
    fetchRecord(prisma, parsedDuplicateId, 'duplicateRecord')
  ]);

  // Both records must belong to the same import session
  if (originalRecord.importSessionId !== duplicateRecord.importSessionId) {
    const error = new Error(
      'originalRecord and duplicateRecord must belong to the same ImportSession.'
    );
    error.statusCode = 422;
    throw error;
  }

  const sessionId = originalRecord.importSessionId;

  // ── Find all open DUPLICATE_ROW anomalies linking these two records ────────
  const relatedAnomalies = await prisma.importAnomaly.findMany({
    where: {
      importSessionId: sessionId,
      anomalyType: 'DUPLICATE_ROW',
      status: 'OPEN',
      importRecordId: { in: [parsedOriginalId, parsedDuplicateId] }
    }
  });

  const resolutionTimestamp = new Date();
  const resolutionNotes     = notes ? notes.trim() : null;

  // ── Execute strategy inside a transaction ─────────────────────────────────
  return await prisma.$transaction(async (tx) => {
    let survivingRecord;
    let discardedRecord = null;

    switch (action) {
      // ── KEEP_ORIGINAL ─────────────────────────────────────────────────────
      // Retain originalRecord as-is; mark duplicateRecord as INVALID.
      case MERGE_ACTION.KEEP_ORIGINAL: {
        await tx.importRecord.update({
          where: { id: parsedDuplicateId },
          data: { status: 'INVALID' }
        });

        survivingRecord = await tx.importRecord.findUnique({ where: { id: parsedOriginalId } });
        discardedRecord = await tx.importRecord.findUnique({ where: { id: parsedDuplicateId } });
        break;
      }

      // ── KEEP_DUPLICATE ────────────────────────────────────────────────────
      // Promote duplicateRecord; mark originalRecord as INVALID.
      case MERGE_ACTION.KEEP_DUPLICATE: {
        await tx.importRecord.update({
          where: { id: parsedOriginalId },
          data: { status: 'INVALID' }
        });

        survivingRecord = await tx.importRecord.findUnique({ where: { id: parsedDuplicateId } });
        discardedRecord = await tx.importRecord.findUnique({ where: { id: parsedOriginalId } });
        break;
      }

      // ── MERGE ─────────────────────────────────────────────────────────────
      // Deep-merge both rawData objects into the originalRecord (duplicate's
      // fields win on conflict); mark duplicateRecord as INVALID.
      case MERGE_ACTION.MERGE: {
        const mergedData = mergeRawData(originalRecord.rawData, duplicateRecord.rawData);

        await tx.importRecord.update({
          where: { id: parsedOriginalId },
          data: { rawData: mergedData, status: 'REVIEW_REQUIRED' }
        });

        await tx.importRecord.update({
          where: { id: parsedDuplicateId },
          data: { status: 'INVALID' }
        });

        survivingRecord = await tx.importRecord.findUnique({ where: { id: parsedOriginalId } });
        discardedRecord = await tx.importRecord.findUnique({ where: { id: parsedDuplicateId } });
        break;
      }

      // ── SKIP ──────────────────────────────────────────────────────────────
      // Leave both records unchanged; just resolve the anomalies.
      case MERGE_ACTION.SKIP: {
        survivingRecord = originalRecord;
        discardedRecord = null;
        break;
      }

      default: {
        const error = new Error(`Unhandled action: ${action}`);
        error.statusCode = 500;
        throw error;
      }
    }

    // ── Resolve all related DUPLICATE_ROW anomalies ────────────────────────
    const reviewDecision = action === MERGE_ACTION.SKIP ? 'APPROVED' : 'MERGED';
    const anomalyNotePrefix = `[${action}]${resolutionNotes ? ` ${resolutionNotes}` : ''}`;

    const resolvedAnomalies = await Promise.all(
      relatedAnomalies.map(anomaly =>
        tx.importAnomaly.update({
          where: { id: anomaly.id },
          data: {
            status: 'FIXED',
            reviewDecision,
            reviewedById: parsedReviewerId,
            reviewedAt:   resolutionTimestamp,
            resolutionNotes: `${anomalyNotePrefix} — originalRecord: ${parsedOriginalId}, duplicateRecord: ${parsedDuplicateId}.`
          }
        })
      )
    );

    // ── Re-evaluate statuses for both records and the session ──────────────
    // The surviving record's status is re-derived from its remaining anomalies.
    // The discarded record stays INVALID (explicit decision) — we only reconcile
    // it when it was not explicitly invalidated (i.e., SKIP action).
    const discardedId = action === MERGE_ACTION.KEEP_ORIGINAL  ? parsedDuplicateId
                      : action === MERGE_ACTION.KEEP_DUPLICATE ? parsedOriginalId
                      : action === MERGE_ACTION.MERGE          ? parsedDuplicateId
                      : null; // SKIP — nothing was explicitly discarded

    const survivingId = action === MERGE_ACTION.KEEP_DUPLICATE ? parsedDuplicateId : parsedOriginalId;

    await reconcileStatuses(tx, survivingId, sessionId);
    if (discardedId !== null) {
      // Force discarded record to remain INVALID without anomaly-driven override
      await tx.importRecord.update({ where: { id: discardedId }, data: { status: 'INVALID' } });
      // Still need to re-evaluate session after the above write
      const sessionAnomalies = await tx.importAnomaly.findMany({ where: { importSessionId: sessionId } });
      const hasOpen = sessionAnomalies.some(a => a.status === 'OPEN');
      await tx.importSession.update({ where: { id: sessionId }, data: { status: hasOpen ? 'REVIEW_REQUIRED' : 'COMPLETED' } });
    }

    return {
      action,
      survivingRecord,
      discardedRecord,
      resolvedAnomalies
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience wrappers (thin aliases over resolveDuplicates)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keeps the original record and discards the duplicate.
 *
 * @param {number|string} originalRecordId
 * @param {number|string} duplicateRecordId
 * @param {number|string} reviewerId
 * @param {string}        [notes]
 */
async function keepOriginal(originalRecordId, duplicateRecordId, reviewerId, notes) {
  return resolveDuplicates({
    originalRecordId,
    duplicateRecordId,
    action: MERGE_ACTION.KEEP_ORIGINAL,
    reviewerId,
    notes
  });
}

/**
 * Promotes the duplicate record and discards the original.
 *
 * @param {number|string} originalRecordId
 * @param {number|string} duplicateRecordId
 * @param {number|string} reviewerId
 * @param {string}        [notes]
 */
async function keepDuplicate(originalRecordId, duplicateRecordId, reviewerId, notes) {
  return resolveDuplicates({
    originalRecordId,
    duplicateRecordId,
    action: MERGE_ACTION.KEEP_DUPLICATE,
    reviewerId,
    notes
  });
}

/**
 * Deep-merges both records into the original, discarding the duplicate.
 *
 * @param {number|string} originalRecordId
 * @param {number|string} duplicateRecordId
 * @param {number|string} reviewerId
 * @param {string}        [notes]
 */
async function mergeRecords(originalRecordId, duplicateRecordId, reviewerId, notes) {
  return resolveDuplicates({
    originalRecordId,
    duplicateRecordId,
    action: MERGE_ACTION.MERGE,
    reviewerId,
    notes
  });
}

/**
 * Skips resolution — leaves both records intact but resolves the anomaly.
 *
 * @param {number|string} originalRecordId
 * @param {number|string} duplicateRecordId
 * @param {number|string} reviewerId
 * @param {string}        [notes]
 */
async function skipDuplicate(originalRecordId, duplicateRecordId, reviewerId, notes) {
  return resolveDuplicates({
    originalRecordId,
    duplicateRecordId,
    action: MERGE_ACTION.SKIP,
    reviewerId,
    notes
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Core resolver (accepts any action)
  resolveDuplicates,

  // Convenience wrappers
  keepOriginal,
  keepDuplicate,
  mergeRecords,
  skipDuplicate,

  // Constants (exported so callers can reference action names without magic strings)
  MERGE_ACTION
};
