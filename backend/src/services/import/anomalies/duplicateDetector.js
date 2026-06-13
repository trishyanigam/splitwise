/**
 * Duplicate Expense Detector
 *
 * Detects possible duplicate expenses within an import session and,
 * optionally, against already-committed expenses in the database.
 *
 * Duplicate criteria (all four must match):
 *   - Same title  (case-insensitive, whitespace-normalised)
 *   - Same amount (numeric equality after stripping formatting)
 *   - Same date   (calendar day — time component is ignored)
 *   - Same payer  (case-insensitive)
 *
 * Conforms to the detector interface used by anomalyDetectionService.js:
 *   detect(record, norm, context) → Array<AnomalyPayload>
 *
 * AnomalyPayload shape:
 *   {
 *     anomalyType:     string,           // 'DUPLICATE_ROW' | 'DUPLICATE_EXPENSE'
 *     severity:        'HIGH'|'MEDIUM'|'LOW',
 *     description:     string,
 *     suggestedAction: string,
 *     status:          'OPEN'
 *   }
 */

'use strict';

const prisma = require('../../../config/prisma.js');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Anomaly type emitted for within-session duplicates. */
const ANOMALY_TYPE_SESSION = 'DUPLICATE_ROW';

/** Anomaly type emitted for cross-session / existing-DB duplicates. */
const ANOMALY_TYPE_DB = 'DUPLICATE_EXPENSE';

/** Severity used for all duplicate findings (warrants human review). */
const SEVERITY = 'MEDIUM';

// ─────────────────────────────────────────────────────────────────────────────
// Field Normalisation Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise a rawData key: lowercase + strip all whitespace.
 * @param {string} key
 * @returns {string}
 */
function normaliseKey(key) {
  return key.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Build a lookup map of normalised keys → values for a raw row.
 * Exported so callers that already have a `norm` map can skip this step.
 *
 * @param {Object} rawData
 * @returns {Object}
 */
function normalisedRow(rawData) {
  const map = {};
  for (const [k, v] of Object.entries(rawData)) {
    map[normaliseKey(k)] = v;
  }
  return map;
}

/**
 * Normalise a title string: lowercase, collapse internal whitespace.
 * @param {string|undefined} value
 * @returns {string}
 */
function normaliseTitle(value) {
  if (!value) return '';
  return value.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalise an amount: strip commas and currency symbols, return a
 * fixed-precision string so numeric equality is string-comparable.
 *
 * Returns `null` when the value is not a valid number.
 *
 * @param {string|number|undefined} value
 * @returns {string|null}
 */
function normaliseAmount(value) {
  if (value === undefined || value === null || value.toString().trim() === '') return null;
  const cleaned = value.toString().trim().replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  const n = Number(cleaned);
  if (isNaN(n)) return null;
  return n.toFixed(2); // '1500.00' — stable string key
}

/**
 * Normalise a date to a YYYY-MM-DD string (UTC calendar day).
 * Returns `null` when the value cannot be parsed.
 *
 * @param {string|undefined} value
 * @returns {string|null}
 */
function normaliseDate(value) {
  if (!value || !value.toString().trim()) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  // ISO string is always UTC; slice gives YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

/**
 * Normalise a payer name: lowercase + collapse whitespace.
 * @param {string|undefined} value
 * @returns {string}
 */
function normalisePayer(value) {
  if (!value) return '';
  return value.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Fingerprint
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a stable, human-readable fingerprint string from the four
 * duplicate-detection fields. Returns `null` if any field is unusable
 * (prevents false positives when core fields are missing/invalid).
 *
 * @param {Object} norm  - Normalised rawData map (keys already lowercased)
 * @returns {{ fingerprint: string, fields: DuplicateFields }|null}
 */
function buildFingerprint(norm) {
  const title  = normaliseTitle(norm['title']);
  const amount = normaliseAmount(norm['amount']);
  const date   = normaliseDate(norm['date']);
  const payer  = normalisePayer(norm['paidby']);

  // If any field is null/empty we cannot make a reliable fingerprint
  if (!title || amount === null || !date || !payer) return null;

  return {
    fingerprint: `${title}|${amount}|${date}|${payer}`,
    fields: { title, amount, date, payer }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Anomaly Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an anomaly payload object.
 *
 * @param {string} anomalyType
 * @param {string} description
 * @param {string} suggestedAction
 * @returns {AnomalyPayload}
 */
function makeAnomaly(anomalyType, description, suggestedAction) {
  return {
    anomalyType,
    severity: SEVERITY,
    description,
    suggestedAction,
    status: 'OPEN'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DuplicateDetector Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects duplicate expenses in an import session.
 *
 * Supports two detection modes (both active by default):
 *
 *   1. In-session   — tracks fingerprints seen earlier in the same CSV batch.
 *                     Uses `context.duplicateSeen` (Map<fingerprint, firstRow>).
 *
 *   2. Cross-session (DB) — queries existing Expense records in the database.
 *                           Results are cached per session run to minimise DB calls.
 *                           Disabled when `options.checkDatabase` is false.
 *
 * @example
 * // Plugging into the DETECTORS registry in anomalyDetectionService.js:
 * const { DuplicateDetector } = require('./anomalies/duplicateDetector');
 * const DETECTORS = [...existingDetectors, new DuplicateDetector()];
 *
 * @example
 * // Standalone usage:
 * const detector = new DuplicateDetector({ checkDatabase: false });
 * const context  = { duplicateSeen: new Map(), dbCache: new Map() };
 * const norm     = normalisedRow(record.rawData);
 * const anomalies = detector.detect(record, norm, context);
 */
class DuplicateDetector {
  /**
   * @param {Object}  [options]
   * @param {boolean} [options.checkDatabase=true]
   *   When true, suspicious rows are cross-checked against committed Expense
   *   records in the database (requires Prisma access).
   * @param {string}  [options.contextKey='duplicateSeen']
   *   The key on the shared `context` object used for the in-session seen map.
   *   Override if multiple instances of this detector are registered.
   */
  constructor(options = {}) {
    this.checkDatabase = options.checkDatabase !== false; // default: true
    this.contextKey    = options.contextKey || 'duplicateSeen';
    this.dbCacheKey    = options.dbCacheKey || 'duplicateDbCache';
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Detect duplicate anomalies for a single import record.
   *
   * Implements the detector interface:
   *   detect(record, norm, context) → Array<AnomalyPayload>
   *
   * The `context` object is mutated to track seen fingerprints across records.
   * The orchestrator is responsible for initialising `context` before calling
   * the first record.
   *
   * @param {Object} record  - Prisma ImportRecord row { id, rowNumber, rawData, ... }
   * @param {Object} norm    - Normalised rawData map (from normalisedRow())
   * @param {Object} context - Shared mutable state across records in one session
   * @returns {Array<AnomalyPayload>}
   */
  detect(record, norm, context) {
    // Lazily initialise context keys so callers don't have to pre-seed them
    if (!context[this.contextKey]) context[this.contextKey] = new Map();
    if (!context[this.dbCacheKey]) context[this.dbCacheKey] = new Map();

    const result = buildFingerprint(norm);

    // If fingerprint cannot be built (missing/invalid fields), skip — those
    // issues are reported by other detectors (Missing/Invalid field detectors).
    if (!result) return [];

    const { fingerprint, fields } = result;
    const anomalies = [];

    // ── 1. In-session duplicate check ──────────────────────────────────────
    const sessionAnomaly = this._checkSession(record, fingerprint, fields, context);
    if (sessionAnomaly) anomalies.push(sessionAnomaly);

    return anomalies;
  }

  /**
   * Async variant of `detect()` that additionally queries the database.
   * Use this when the orchestrator supports async detectors, or call it
   * explicitly in a pre-processing step.
   *
   * @param {Object} record
   * @param {Object} norm
   * @param {Object} context
   * @returns {Promise<Array<AnomalyPayload>>}
   */
  async detectAsync(record, norm, context) {
    if (!context[this.contextKey]) context[this.contextKey] = new Map();
    if (!context[this.dbCacheKey]) context[this.dbCacheKey] = new Map();

    const result = buildFingerprint(norm);
    if (!result) return [];

    const { fingerprint, fields } = result;
    const anomalies = [];

    // ── 1. In-session duplicate check ──────────────────────────────────────
    const sessionAnomaly = this._checkSession(record, fingerprint, fields, context);
    if (sessionAnomaly) anomalies.push(sessionAnomaly);

    // ── 2. Cross-session DB duplicate check (only for non-session-dupes) ───
    // Skip the DB lookup if we already know it's an in-session duplicate —
    // there is no need to report two duplicate anomalies for the same row.
    if (this.checkDatabase && !sessionAnomaly) {
      const dbAnomaly = await this._checkDatabase(record, fields, context);
      if (dbAnomaly) anomalies.push(dbAnomaly);
    }

    return anomalies;
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Check whether this fingerprint was already seen in the current session.
   * Registers the fingerprint if it is new.
   *
   * @param {Object} record
   * @param {string} fingerprint
   * @param {DuplicateFields} fields
   * @param {Object} context
   * @returns {AnomalyPayload|null}
   */
  _checkSession(record, fingerprint, fields, context) {
    const seen = context[this.contextKey];

    if (seen.has(fingerprint)) {
      const firstRow = seen.get(fingerprint);
      return makeAnomaly(
        ANOMALY_TYPE_SESSION,
        _sessionDescription(record.rowNumber, firstRow, fields),
        'Review both rows and remove the duplicate before importing.'
      );
    }

    // Register this row as the first occurrence
    seen.set(fingerprint, record.rowNumber);
    return null;
  }

  /**
   * Check the Expense table for an existing record matching all four fields.
   * Results are cached inside `context[this.dbCacheKey]` per fingerprint to
   * avoid repeated queries for back-to-back identical rows.
   *
   * @param {Object} record
   * @param {DuplicateFields} fields
   * @param {Object} context
   * @returns {Promise<AnomalyPayload|null>}
   */
  async _checkDatabase(record, fields, context) {
    const cache = context[this.dbCacheKey];

    const cacheKey = `${fields.title}|${fields.amount}|${fields.date}|${fields.payer}`;

    if (!cache.has(cacheKey)) {
      const match = await _queryExistingExpense(fields);
      cache.set(cacheKey, match); // may be null (no match) or an Expense object
    }

    const existing = cache.get(cacheKey);
    if (!existing) return null;

    return makeAnomaly(
      ANOMALY_TYPE_DB,
      _dbDescription(record.rowNumber, existing, fields),
      'This expense may already exist in the system. Verify before importing to avoid double-counting.'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Query Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query the Expense table for a record that matches all four duplicate criteria.
 * Returns the first matching expense or null.
 *
 * @param {DuplicateFields} fields
 * @returns {Promise<Object|null>}
 */
async function _queryExistingExpense(fields) {
  // Date range: the entire UTC calendar day derived from the normalised date string
  const dayStart = new Date(`${fields.date}T00:00:00.000Z`);
  const dayEnd   = new Date(`${fields.date}T23:59:59.999Z`);

  const numericAmount = parseFloat(fields.amount);

  try {
    const expense = await prisma.expense.findFirst({
      where: {
        title:  { equals: fields.title,  mode: 'insensitive' },
        amount: numericAmount,
        date:   { gte: dayStart, lte: dayEnd },
        // Match payer by name (case-insensitive) through the related User record
        paidBy: {
          name: { equals: fields.payer, mode: 'insensitive' }
        }
      },
      select: {
        id:        true,
        title:     true,
        amount:    true,
        date:      true,
        createdAt: true,
        paidBy:    { select: { id: true, name: true } }
      }
    });
    return expense;
  } catch {
    // If the schema doesn't match expectations (e.g. different relation name),
    // degrade gracefully: skip the DB check rather than crashing the import.
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Description Builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {number} currentRow
 * @param {number} firstRow
 * @param {DuplicateFields} fields
 * @returns {string}
 */
function _sessionDescription(currentRow, firstRow, fields) {
  return (
    `Row ${currentRow}: Possible duplicate of row ${firstRow} in this import. ` +
    `Matching fields — title: "${fields.title}", amount: ${fields.amount}, ` +
    `date: ${fields.date}, paid by: "${fields.payer}".`
  );
}

/**
 * @param {number} currentRow
 * @param {Object} existing  - Expense record from DB
 * @param {DuplicateFields} fields
 * @returns {string}
 */
function _dbDescription(currentRow, existing, fields) {
  const existingDate = existing.date
    ? new Date(existing.date).toISOString().slice(0, 10)
    : fields.date;
  return (
    `Row ${currentRow}: Possible duplicate of an existing expense (ID: ${existing.id}, ` +
    `title: "${existing.title}", amount: ${existing.amount}, date: ${existingDate}, ` +
    `paid by: "${existing.paidBy?.name ?? fields.payer}").`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Helper (optional convenience)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the duplicate detector synchronously across an entire array of records
 * (in-session check only). Returns a flat array of fully-stamped anomaly
 * objects ready for `prisma.importAnomaly.createMany()`.
 *
 * @param {number}   importSessionId
 * @param {Object[]} records  - Prisma ImportRecord rows
 * @param {Object}   [options] - Forwarded to DuplicateDetector constructor
 * @returns {Array<Object>}   - Stamped anomaly payloads
 */
function detectDuplicatesInSession(importSessionId, records, options = {}) {
  const detector = new DuplicateDetector({ ...options, checkDatabase: false });
  const context  = {};
  const results  = [];

  for (const record of records) {
    const norm     = normalisedRow(record.rawData);
    const anomalies = detector.detect(record, norm, context);

    for (const anomaly of anomalies) {
      results.push({
        importSessionId,
        importRecordId: record.id,
        ...anomaly
      });
    }
  }

  return results;
}

/**
 * Run the duplicate detector asynchronously (in-session + DB) across an entire
 * array of records. Returns fully-stamped anomaly objects.
 *
 * @param {number}   importSessionId
 * @param {Object[]} records
 * @param {Object}   [options]
 * @returns {Promise<Array<Object>>}
 */
async function detectDuplicatesAsync(importSessionId, records, options = {}) {
  const detector = new DuplicateDetector(options);
  const context  = {};
  const results  = [];

  for (const record of records) {
    const norm     = normalisedRow(record.rawData);
    const anomalies = await detector.detectAsync(record, norm, context);

    for (const anomaly of anomalies) {
      results.push({
        importSessionId,
        importRecordId: record.id,
        ...anomaly
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Primary detector class (plug into DETECTORS registry)
  DuplicateDetector,

  // Batch convenience helpers
  detectDuplicatesInSession,
  detectDuplicatesAsync,

  // Low-level helpers (exported for unit testing)
  normaliseKey,
  normalisedRow,
  normaliseTitle,
  normaliseAmount,
  normaliseDate,
  normalisePayer,
  buildFingerprint
};

// ─────────────────────────────────────────────────────────────────────────────
// JSDoc type aliases (no runtime cost)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} DuplicateFields
 * @property {string} title   - Normalised expense title
 * @property {string} amount  - Fixed-precision amount string (e.g. "1500.00")
 * @property {string} date    - ISO calendar date (YYYY-MM-DD, UTC)
 * @property {string} payer   - Normalised payer name
 */

/**
 * @typedef {Object} AnomalyPayload
 * @property {string} anomalyType     - 'DUPLICATE_ROW' | 'DUPLICATE_EXPENSE'
 * @property {'HIGH'|'MEDIUM'|'LOW'} severity
 * @property {string} description
 * @property {string} suggestedAction
 * @property {'OPEN'} status
 */
