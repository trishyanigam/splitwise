const prisma = require('../../config/prisma.js');

// ─────────────────────────────────────────────────────────────────────────────
// Shared Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise a rawData key to lowercase with whitespace stripped.
 * @param {string} key
 * @returns {string}
 */
function normaliseKey(key) {
  return key.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Build a lookup map of normalised keys → values for a raw row.
 * @param {Object} rawData
 * @returns {Object}  { normKey: value }
 */
function normalisedRow(rawData) {
  const map = {};
  for (const [k, v] of Object.entries(rawData)) {
    map[normaliseKey(k)] = v;
  }
  return map;
}

/**
 * Attempt to parse a date string. Returns null if unparseable.
 * @param {string} value
 * @returns {Date|null}
 */
function tryParseDate(value) {
  if (!value || !value.toString().trim()) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Attempt to parse a numeric amount string. Returns null if invalid.
 * @param {string|number} value
 * @returns {number|null}
 */
function tryParseAmount(value) {
  if (value === undefined || value === null || value.toString().trim() === '') return null;
  const n = Number(value.toString().trim().replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Anomaly Result Shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Factory for a partial anomaly payload (excludes importSessionId / importRecordId
 * which are added by the orchestrator).
 *
 * @param {string} anomalyType
 * @param {'HIGH'|'MEDIUM'|'LOW'} severity
 * @param {string} description
 * @param {string} suggestedAction
 * @returns {Object}
 */
function makeAnomaly(anomalyType, severity, description, suggestedAction) {
  return { anomalyType, severity, description, suggestedAction, status: 'OPEN' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector Interface
// ─────────────────────────────────────────────────────────────────────────────
//
// Every detector must implement:
//
//   detect(record, norm, context) → Array<AnomalyPayload>
//
// Parameters:
//   record  – raw Prisma ImportRecord row
//   norm    – normalised key→value map of record.rawData
//   context – shared mutable state passed to all detectors (e.g. seen fingerprints)
//
// Returns an array of zero or more anomaly partial payloads (makeAnomaly objects).
// The orchestrator stamps importSessionId / importRecordId onto each before saving.

// ─────────────────────────────────────────────────────────────────────────────
// Detector 1 – Missing Required Fields
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS = ['title', 'amount', 'date', 'paidby'];

class MissingFieldDetector {
  /**
   * @param {string[]} requiredFields - Normalised field keys that must be present.
   */
  constructor(requiredFields = REQUIRED_FIELDS) {
    this.requiredFields = requiredFields;
  }

  /**
   * @param {Object} record - Prisma ImportRecord
   * @param {Object} norm   - Normalised rawData map
   * @returns {Array}
   */
  detect(record, norm) {
    const anomalies = [];
    for (const field of this.requiredFields) {
      const val = norm[field];
      const isMissing = val === undefined || val === null || val.toString().trim() === '';
      if (isMissing) {
        anomalies.push(
          makeAnomaly(
            'MISSING_REQUIRED_FIELD',
            'HIGH',
            `Row ${record.rowNumber}: Required field "${field}" is missing or empty.`,
            `Provide a value for "${field}" before importing this row.`
          )
        );
      }
    }
    return anomalies;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector 2 – Invalid Date Format
// ─────────────────────────────────────────────────────────────────────────────

class InvalidDateDetector {
  /**
   * @param {Object} record
   * @param {Object} norm
   * @returns {Array}
   */
  detect(record, norm) {
    const anomalies = [];
    const dateVal = norm['date'];
    if (dateVal === undefined || dateVal === null || dateVal.toString().trim() === '') {
      return anomalies; // Missing field handled by MissingFieldDetector
    }

    const parsed = tryParseDate(dateVal);
    if (!parsed) {
      anomalies.push(
        makeAnomaly(
          'INVALID_DATE_FORMAT',
          'HIGH',
          `Row ${record.rowNumber}: Date value "${dateVal}" could not be parsed as a valid date.`,
          'Use a standard date format such as YYYY-MM-DD or DD/MM/YYYY.'
        )
      );
    }
    return anomalies;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector 3 – Future Date
// ─────────────────────────────────────────────────────────────────────────────

class FutureDateDetector {
  /**
   * @param {Object} record
   * @param {Object} norm
   * @returns {Array}
   */
  detect(record, norm) {
    const anomalies = [];
    const dateVal = norm['date'];
    if (!dateVal || dateVal.toString().trim() === '') return anomalies;

    const parsed = tryParseDate(dateVal);
    if (parsed && parsed > new Date()) {
      anomalies.push(
        makeAnomaly(
          'FUTURE_DATE',
          'MEDIUM',
          `Row ${record.rowNumber}: Date "${dateVal}" is in the future.`,
          'Verify this is intentional. Future-dated expenses are unusual.'
        )
      );
    }
    return anomalies;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector 4 – Invalid Amount Format (non-numeric)
// ─────────────────────────────────────────────────────────────────────────────

class InvalidAmountFormatDetector {
  /**
   * @param {Object} record
   * @param {Object} norm
   * @returns {Array}
   */
  detect(record, norm) {
    const anomalies = [];
    const amountVal = norm['amount'];
    if (amountVal === undefined || amountVal === null || amountVal.toString().trim() === '') {
      return anomalies; // Missing field handled by MissingFieldDetector
    }

    const parsed = tryParseAmount(amountVal);
    if (parsed === null) {
      anomalies.push(
        makeAnomaly(
          'INVALID_AMOUNT_FORMAT',
          'HIGH',
          `Row ${record.rowNumber}: Amount value "${amountVal}" is not a valid number.`,
          'Provide a numeric amount (e.g. 150.00). Remove currency symbols.'
        )
      );
    }
    return anomalies;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector 5 – Zero or Negative Amount
// ─────────────────────────────────────────────────────────────────────────────

class NonPositiveAmountDetector {
  /**
   * @param {Object} record
   * @param {Object} norm
   * @returns {Array}
   */
  detect(record, norm) {
    const anomalies = [];
    const amountVal = norm['amount'];
    if (amountVal === undefined || amountVal === null || amountVal.toString().trim() === '') {
      return anomalies;
    }

    const parsed = tryParseAmount(amountVal);
    if (parsed !== null && parsed <= 0) {
      anomalies.push(
        makeAnomaly(
          'INVALID_AMOUNT_VALUE',
          'HIGH',
          `Row ${record.rowNumber}: Amount "${amountVal}" must be greater than zero.`,
          'Correct the amount to a positive non-zero value.'
        )
      );
    }
    return anomalies;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector 6 – Unusually Large Amount
// ─────────────────────────────────────────────────────────────────────────────

class LargeAmountDetector {
  /**
   * @param {number} threshold - Amounts above this value are flagged.
   */
  constructor(threshold = 100000) {
    this.threshold = threshold;
  }

  /**
   * @param {Object} record
   * @param {Object} norm
   * @returns {Array}
   */
  detect(record, norm) {
    const anomalies = [];
    const amountVal = norm['amount'];
    if (amountVal === undefined || amountVal === null || amountVal.toString().trim() === '') {
      return anomalies;
    }

    const parsed = tryParseAmount(amountVal);
    if (parsed !== null && parsed > this.threshold) {
      anomalies.push(
        makeAnomaly(
          'UNUSUALLY_LARGE_AMOUNT',
          'MEDIUM',
          `Row ${record.rowNumber}: Amount "${amountVal}" exceeds ${this.threshold.toLocaleString()}. This may be a data entry error.`,
          'Verify the amount is correct before importing.'
        )
      );
    }
    return anomalies;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector 7 – Duplicate Row
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a stable duplicate fingerprint from a normalised row.
 * @param {Object} norm
 * @returns {string}
 */
function buildFingerprint(norm) {
  const title  = (norm['title']  || '').toString().trim().toLowerCase();
  const amount = (norm['amount'] || '').toString().trim();
  const date   = (norm['date']   || '').toString().trim();
  const paidBy = (norm['paidby'] || '').toString().trim().toLowerCase();
  return `${title}|${amount}|${date}|${paidBy}`;
}

class DuplicateRowDetector {
  /**
   * Uses `context.seen` (Map<fingerprint, rowNumber>) to track already-encountered rows.
   * Context is shared across all records in a session.
   *
   * @param {Object} record
   * @param {Object} norm
   * @param {{ seen: Map<string, number> }} context
   * @returns {Array}
   */
  detect(record, norm, context) {
    const anomalies = [];
    const fp = buildFingerprint(norm);

    if (context.seen.has(fp)) {
      anomalies.push(
        makeAnomaly(
          'DUPLICATE_ROW',
          'MEDIUM',
          `Row ${record.rowNumber}: Appears to be a duplicate of row ${context.seen.get(fp)}.`,
          'Remove duplicate entries before importing.'
        )
      );
    } else {
      context.seen.set(fp, record.rowNumber);
    }
    return anomalies;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector Registry
// ─────────────────────────────────────────────────────────────────────────────
//
// Add new detectors here. Order matters for severity classification:
// HIGH-severity detectors should generally appear before MEDIUM/LOW ones.

const DETECTORS = [
  new MissingFieldDetector(),
  new InvalidDateDetector(),
  new FutureDateDetector(),
  new InvalidAmountFormatDetector(),
  new NonPositiveAmountDetector(),
  new LargeAmountDetector(),
  new DuplicateRowDetector()
];

// ─────────────────────────────────────────────────────────────────────────────
// Severity → Status classification helper
// ─────────────────────────────────────────────────────────────────────────────

const HIGH_SEVERITY_TYPES = new Set([
  'MISSING_REQUIRED_FIELD',
  'INVALID_DATE_FORMAT',
  'INVALID_AMOUNT_FORMAT',
  'INVALID_AMOUNT_VALUE'
]);

/**
 * Given a list of anomaly payloads for a record, decide its final import status.
 * @param {Array} recordAnomalies
 * @returns {'INVALID'|'REVIEW_REQUIRED'|'VALID'}
 */
function resolveRecordStatus(recordAnomalies) {
  if (recordAnomalies.length === 0) return 'VALID';
  const hasHigh = recordAnomalies.some((a) => HIGH_SEVERITY_TYPES.has(a.anomalyType));
  return hasHigh ? 'INVALID' : 'REVIEW_REQUIRED';
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator – detectAnomalies
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect all anomalies in staged ImportRecords for a given session.
 *
 * Steps:
 *   1. Load all import records for the session.
 *   2. Run every registered detector against each record.
 *   3. Bulk-store detected anomalies in ImportAnomaly table.
 *   4. Update each ImportRecord status (VALID / REVIEW_REQUIRED / INVALID).
 *   5. Return an anomaly summary.
 *
 * @param {number|string} importSessionId
 * @returns {Promise<{
 *   totalAnomalies: number,
 *   recordsWithAnomalies: number,
 *   breakdown: Record<string, number>
 * }>}
 */
async function detectAnomalies(importSessionId) {
  // ── Step 0: Validate session ID ──────────────────────────────────────────
  const sessionId = parseInt(importSessionId, 10);
  if (isNaN(sessionId)) throw new Error('Valid importSessionId is required.');

  // ── Step 1: Load all import records ──────────────────────────────────────
  const records = await prisma.importRecord.findMany({
    where: { importSessionId: sessionId },
    orderBy: { rowNumber: 'asc' }
  });

  if (records.length === 0) {
    return { totalAnomalies: 0, recordsWithAnomalies: 0, breakdown: {} };
  }

  // ── Step 2: Run all anomaly detectors ────────────────────────────────────
  const anomaliesToCreate = [];   // flat list of all partial anomaly payloads
  const recordStatusMap   = {};   // importRecordId → 'VALID'|'REVIEW_REQUIRED'|'INVALID'
  const breakdown         = {};   // anomalyType → count

  // Shared mutable context passed to every detector across all records
  const context = { seen: new Map() };

  for (const record of records) {
    const norm = normalisedRow(record.rawData);
    const recordAnomalies = [];

    for (const detector of DETECTORS) {
      const found = detector.detect(record, norm, context);
      recordAnomalies.push(...found);
    }

    // Stamp session + record IDs onto each anomaly payload
    for (const anomaly of recordAnomalies) {
      anomaliesToCreate.push({
        importSessionId: sessionId,
        importRecordId: record.id,
        ...anomaly
      });
      breakdown[anomaly.anomalyType] = (breakdown[anomaly.anomalyType] || 0) + 1;
    }

    recordStatusMap[record.id] = resolveRecordStatus(recordAnomalies);
  }

  // ── Step 3: Store detected anomalies ─────────────────────────────────────
  if (anomaliesToCreate.length > 0) {
    await prisma.importAnomaly.createMany({ data: anomaliesToCreate });
  }

  // Group record IDs by their resolved status for efficient bulk updates
  const byStatus = { VALID: [], REVIEW_REQUIRED: [], INVALID: [] };
  for (const [id, status] of Object.entries(recordStatusMap)) {
    byStatus[status].push(parseInt(id, 10));
  }

  const sessionStatus = anomaliesToCreate.length > 0 ? 'REVIEW_REQUIRED' : 'COMPLETED';

  await Promise.all([
    ...Object.entries(byStatus)
      .filter(([, ids]) => ids.length > 0)
      .map(([status, ids]) =>
        prisma.importRecord.updateMany({
          where: { id: { in: ids } },
          data: { status }
        })
      ),
    prisma.importSession.update({
      where: { id: sessionId },
      data: { status: sessionStatus }
    })
  ]);

  // ── Step 4: Return anomaly summary ───────────────────────────────────────
  const recordsWithAnomalies =
    byStatus.INVALID.length + byStatus.REVIEW_REQUIRED.length;

  return {
    totalAnomalies: anomaliesToCreate.length,
    recordsWithAnomalies,
    breakdown
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Supporting Service Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all anomalies for a session, ordered by severity then record row.
 *
 * @param {number|string} importSessionId
 * @returns {Promise<Array>}
 */
async function getSessionAnomalies(importSessionId) {
  const sessionId = parseInt(importSessionId, 10);
  if (isNaN(sessionId)) throw new Error('Valid importSessionId is required.');

  return await prisma.importAnomaly.findMany({
    where: { importSessionId: sessionId },
    include: {
      importRecord: { select: { id: true, rowNumber: true, rawData: true } }
    },
    orderBy: [
      { severity: 'desc' },
      { importRecord: { rowNumber: 'asc' } }
    ]
  });
}

/**
 * Update the status of a single anomaly (APPROVED / REJECTED / FIXED).
 *
 * @param {number|string} anomalyId
 * @param {string} status  - AnomalyStatus enum value
 * @returns {Promise<Object>} Updated ImportAnomaly record
 */
async function updateAnomalyStatus(anomalyId, status) {
  const id = parseInt(anomalyId, 10);
  if (isNaN(id)) throw new Error('Valid anomalyId is required.');

  const VALID_STATUSES = ['OPEN', 'APPROVED', 'REJECTED', 'FIXED'];
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(
      `Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}.`
    );
  }

  return await prisma.importAnomaly.update({
    where: { id },
    data: { status }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Orchestrator
  detectAnomalies,

  // Supporting functions
  getSessionAnomalies,
  updateAnomalyStatus,

  // Detector classes (exported for unit testing & extension)
  MissingFieldDetector,
  InvalidDateDetector,
  FutureDateDetector,
  InvalidAmountFormatDetector,
  NonPositiveAmountDetector,
  LargeAmountDetector,
  DuplicateRowDetector,

  // Helpers (exported for unit testing)
  normaliseKey,
  normalisedRow,
  tryParseDate,
  tryParseAmount,
  buildFingerprint,
  resolveRecordStatus
};
