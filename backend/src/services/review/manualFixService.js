const prisma = require('../../config/prisma.js');

// ─────────────────────────────────────────────────────────────────────────────
// Supported editable fields and their validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The set of rawData fields that may be manually corrected via this service.
 * Matches the normalised CSV column names used by the anomaly detection pipeline.
 */
const EDITABLE_FIELDS = ['amount', 'date', 'currency', 'participants'];

/**
 * Per-field validation rules.
 * Each entry is: { validate(value) → true | string }
 * Returning a string means validation failed with that message.
 */
const FIELD_VALIDATORS = {
  amount: (value) => {
    const n = Number(String(value).trim().replace(/,/g, ''));
    if (isNaN(n))    return `"amount" must be a valid number. Received: ${JSON.stringify(value)}`;
    if (n <= 0)      return `"amount" must be greater than zero. Received: ${value}`;
    return true;
  },

  date: (value) => {
    const str = String(value).trim();
    if (!str)        return '"date" must not be empty.';
    const d = new Date(str);
    if (isNaN(d.getTime())) return `"date" must be a valid date string. Received: ${JSON.stringify(value)}`;
    return true;
  },

  currency: (value) => {
    const str = String(value).trim().toUpperCase();
    if (!str)        return '"currency" must not be empty.';
    // Loose check: 3-letter ISO 4217 code
    if (!/^[A-Z]{3}$/.test(str)) return `"currency" must be a 3-letter ISO 4217 code (e.g. USD, INR). Received: ${JSON.stringify(value)}`;
    return true;
  },

  participants: (value) => {
    // Accepts a non-empty string (comma-separated names) or a non-empty array of strings
    if (Array.isArray(value)) {
      if (value.length === 0) return '"participants" array must not be empty.';
      const invalid = value.filter(p => typeof p !== 'string' || !p.trim());
      if (invalid.length > 0) return '"participants" array entries must be non-empty strings.';
      return true;
    }
    const str = String(value).trim();
    if (!str) return '"participants" must not be empty.';
    return true;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises a field name to lowercase with no whitespace (matches the
 * anomaly detection pipeline's normaliseKey convention).
 * @param {string} key
 * @returns {string}
 */
function normaliseKey(key) {
  return String(key).trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Validates a map of { fieldName → newValue } corrections.
 * Throws a 400 error listing all validation failures.
 *
 * @param {Object} corrections
 */
function validateCorrections(corrections) {
  if (!corrections || typeof corrections !== 'object' || Array.isArray(corrections)) {
    const error = new Error('"corrections" must be a non-empty plain object.');
    error.statusCode = 400;
    throw error;
  }

  const keys = Object.keys(corrections);
  if (keys.length === 0) {
    const error = new Error('"corrections" must contain at least one field to fix.');
    error.statusCode = 400;
    throw error;
  }

  const unsupported = keys.filter(k => !EDITABLE_FIELDS.includes(normaliseKey(k)));
  if (unsupported.length > 0) {
    const error = new Error(
      `Unsupported field(s): ${unsupported.map(f => JSON.stringify(f)).join(', ')}. ` +
      `Editable fields are: ${EDITABLE_FIELDS.join(', ')}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const validationErrors = [];
  for (const [key, value] of Object.entries(corrections)) {
    const normKey = normaliseKey(key);
    const result  = FIELD_VALIDATORS[normKey](value);
    if (result !== true) validationErrors.push(result);
  }

  if (validationErrors.length > 0) {
    const error = new Error(`Validation failed:\n  • ${validationErrors.join('\n  • ')}`);
    error.statusCode = 422;
    throw error;
  }
}

/**
 * Normalises correction values before storage.
 * - amount      → stored as string (keeps decimal formatting)
 * - date        → stored as ISO-8601 date string (YYYY-MM-DD)
 * - currency    → stored as uppercase 3-letter code
 * - participants → stored as comma-joined string (if array was given)
 *
 * @param {Object} corrections  Raw { field: value } map
 * @returns {Object}            Normalised map
 */
function normaliseValues(corrections) {
  const out = {};
  for (const [key, value] of Object.entries(corrections)) {
    const normKey = normaliseKey(key);
    switch (normKey) {
      case 'amount':
        out[normKey] = String(Number(String(value).replace(/,/g, '')));
        break;
      case 'date':
        out[normKey] = new Date(String(value).trim()).toISOString().split('T')[0];
        break;
      case 'currency':
        out[normKey] = String(value).trim().toUpperCase();
        break;
      case 'participants':
        out[normKey] = Array.isArray(value)
          ? value.map(p => String(p).trim()).join(', ')
          : String(value).trim();
        break;
      default:
        out[normKey] = value;
    }
  }
  return out;
}

/**
 * Rebuilds the rawData object, applying corrections over the existing data.
 * Writes a __fixHistory__ array into the rawData to preserve the audit trail
 * (original value + corrected value per field per edit).
 *
 * @param {Object} existingRawData  Current record.rawData
 * @param {Object} normalisedFix    Normalised corrections map
 * @param {number} reviewerId
 * @param {string|null} notes
 * @returns {{ updatedRawData: Object, fieldAuditTrail: Object[] }}
 */
function buildUpdatedRawData(existingRawData, normalisedFix, reviewerId, notes) {
  const base   = (typeof existingRawData === 'object' && existingRawData !== null) ? existingRawData : {};
  const history = Array.isArray(base.__fixHistory__) ? [...base.__fixHistory__] : [];

  const fieldAuditTrail = [];

  for (const [field, correctedValue] of Object.entries(normalisedFix)) {
    const originalValue = base[field] !== undefined ? base[field] : null;

    const entry = {
      field,
      originalValue,
      correctedValue,
      reviewedById: reviewerId,
      fixedAt: new Date().toISOString(),
      notes: notes || null
    };

    history.push(entry);
    fieldAuditTrail.push(entry);
  }

  const updatedRawData = {
    ...base,
    ...normalisedFix,
    __fixHistory__: history
  };

  return { updatedRawData, fieldAuditTrail };
}

/**
 * Re-evaluates ImportRecord status and ImportSession completion after a fix.
 * Runs inside a transaction context `tx`.
 *
 * @param {object} tx
 * @param {number} recordId
 * @param {number} sessionId
 */
async function reconcileStatuses(tx, recordId, sessionId) {
  const anomalies    = await tx.importAnomaly.findMany({ where: { importRecordId: recordId } });
  const openAnomalies = anomalies.filter(a => a.status === 'OPEN');

  let newRecordStatus;
  if (openAnomalies.length > 0) {
    const hasHigh = openAnomalies.some(a => ['HIGH', 'CRITICAL'].includes(a.severity));
    newRecordStatus = hasHigh ? 'INVALID' : 'REVIEW_REQUIRED';
  } else {
    const hasRejected = anomalies.some(a => a.reviewDecision === 'REJECTED');
    newRecordStatus = hasRejected ? 'INVALID' : 'VALID';
  }

  await tx.importRecord.update({ where: { id: recordId }, data: { status: newRecordStatus } });

  const sessionAnomalies = await tx.importAnomaly.findMany({ where: { importSessionId: sessionId } });
  const hasOpenInSession  = sessionAnomalies.some(a => a.status === 'OPEN');
  await tx.importSession.update({
    where: { id: sessionId },
    data:  { status: hasOpenInSession ? 'REVIEW_REQUIRED' : 'COMPLETED' }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies manual field corrections to an ImportRecord, stores an audit trail
 * of original vs corrected values inside rawData.__fixHistory__, and resolves
 * all associated OPEN anomalies with reviewDecision = MANUAL_FIX.
 *
 * @param {Object} options
 * @param {number|string} options.recordId      - ID of the ImportRecord to fix
 * @param {number|string} options.reviewerId    - ID of the reviewing user
 * @param {Object}        options.corrections   - Map of { fieldName → newValue }
 *   Supported fields: amount | date | currency | participants
 * @param {string}        [options.notes]       - Optional reviewer notes
 * @param {number[]|null} [options.anomalyIds]  - Specific anomaly IDs to resolve.
 *   If omitted, ALL open anomalies on the record are resolved.
 *
 * @returns {Promise<{
 *   record:          Object,   // Updated ImportRecord
 *   fieldAuditTrail: Object[], // Per-field { field, originalValue, correctedValue, fixedAt }
 *   resolvedAnomalies: Object[]
 * }>}
 */
async function applyManualFix({ recordId, reviewerId, corrections, notes, anomalyIds }) {
  // ── Input validation ──────────────────────────────────────────────────────
  const parsedRecordId   = parseInt(recordId,   10);
  const parsedReviewerId = parseInt(reviewerId, 10);

  if (isNaN(parsedRecordId) || isNaN(parsedReviewerId)) {
    const error = new Error('Invalid recordId or reviewerId provided.');
    error.statusCode = 400;
    throw error;
  }

  validateCorrections(corrections);

  // ── Verify reviewer ───────────────────────────────────────────────────────
  const reviewer = await prisma.user.findUnique({ where: { id: parsedReviewerId } });
  if (!reviewer) {
    const error = new Error(`Reviewer with ID ${parsedReviewerId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // ── Load the record ───────────────────────────────────────────────────────
  const record = await prisma.importRecord.findUnique({ where: { id: parsedRecordId } });
  if (!record) {
    const error = new Error(`ImportRecord with ID ${parsedRecordId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const sessionId = record.importSessionId;

  // ── Determine which anomalies to resolve ─────────────────────────────────
  const anomalyFilter = { importRecordId: parsedRecordId, status: 'OPEN' };
  if (Array.isArray(anomalyIds) && anomalyIds.length > 0) {
    const parsedIds = anomalyIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    anomalyFilter.id = { in: parsedIds };
  }
  const openAnomalies = await prisma.importAnomaly.findMany({ where: anomalyFilter });

  // ── Build updated rawData with audit trail ────────────────────────────────
  const normalisedFix = normaliseValues(corrections);
  const { updatedRawData, fieldAuditTrail } = buildUpdatedRawData(
    record.rawData,
    normalisedFix,
    parsedReviewerId,
    notes || null
  );

  const resolutionTimestamp = new Date();
  const resolutionNoteText  = notes ? notes.trim() : null;

  // ── Atomic write ──────────────────────────────────────────────────────────
  return await prisma.$transaction(async (tx) => {
    // 1. Apply corrected rawData to the record
    const updatedRecord = await tx.importRecord.update({
      where: { id: parsedRecordId },
      data:  { rawData: updatedRawData }
    });

    // 2. Resolve all targeted open anomalies as MANUAL_FIX
    const fieldsFixed = Object.keys(normalisedFix).join(', ');
    const anomalyNote = `[MANUAL_FIX] Fields corrected: ${fieldsFixed}.${resolutionNoteText ? ` Notes: ${resolutionNoteText}` : ''}`;

    const resolvedAnomalies = await Promise.all(
      openAnomalies.map(anomaly =>
        tx.importAnomaly.update({
          where: { id: anomaly.id },
          data: {
            status:          'FIXED',
            reviewDecision:  'MANUAL_FIX',
            reviewedById:    parsedReviewerId,
            reviewedAt:      resolutionTimestamp,
            resolutionNotes: anomalyNote
          }
        })
      )
    );

    // 3. Re-derive ImportRecord status and ImportSession completion
    await reconcileStatuses(tx, parsedRecordId, sessionId);

    // Re-fetch to get the final reconciled status
    const finalRecord = await tx.importRecord.findUnique({ where: { id: parsedRecordId } });

    return {
      record:            finalRecord,
      fieldAuditTrail,
      resolvedAnomalies
    };
  });
}

/**
 * Corrects the amount field on an ImportRecord.
 *
 * @param {number|string} recordId
 * @param {number|string} reviewerId
 * @param {number|string} newAmount
 * @param {string}        [notes]
 * @param {number[]}      [anomalyIds]
 */
async function fixAmount(recordId, reviewerId, newAmount, notes, anomalyIds) {
  return applyManualFix({ recordId, reviewerId, corrections: { amount: newAmount }, notes, anomalyIds });
}

/**
 * Corrects the date field on an ImportRecord.
 *
 * @param {number|string} recordId
 * @param {number|string} reviewerId
 * @param {string}        newDate    - Parseable date string
 * @param {string}        [notes]
 * @param {number[]}      [anomalyIds]
 */
async function fixDate(recordId, reviewerId, newDate, notes, anomalyIds) {
  return applyManualFix({ recordId, reviewerId, corrections: { date: newDate }, notes, anomalyIds });
}

/**
 * Corrects the currency field on an ImportRecord.
 *
 * @param {number|string} recordId
 * @param {number|string} reviewerId
 * @param {string}        newCurrency  - 3-letter ISO 4217 code
 * @param {string}        [notes]
 * @param {number[]}      [anomalyIds]
 */
async function fixCurrency(recordId, reviewerId, newCurrency, notes, anomalyIds) {
  return applyManualFix({ recordId, reviewerId, corrections: { currency: newCurrency }, notes, anomalyIds });
}

/**
 * Corrects the participants field on an ImportRecord.
 *
 * @param {number|string}      recordId
 * @param {number|string}      reviewerId
 * @param {string[]|string}    newParticipants  - Array or comma-separated string
 * @param {string}             [notes]
 * @param {number[]}           [anomalyIds]
 */
async function fixParticipants(recordId, reviewerId, newParticipants, notes, anomalyIds) {
  return applyManualFix({ recordId, reviewerId, corrections: { participants: newParticipants }, notes, anomalyIds });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Core function — accepts any combination of editable fields
  applyManualFix,

  // Single-field convenience helpers
  fixAmount,
  fixDate,
  fixCurrency,
  fixParticipants,

  // Constants exported for callers to enumerate allowed fields without magic strings
  EDITABLE_FIELDS,
  FIELD_VALIDATORS
};
