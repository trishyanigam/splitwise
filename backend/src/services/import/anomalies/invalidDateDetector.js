/**
 * Invalid Date Detector
 *
 * Detects import records where the expense date field is malformed or
 * represents a logically invalid date value.
 *
 * Two sub-cases are handled independently:
 *
 *   1. UNPARSEABLE_DATE  (HIGH)
 *      The raw string cannot be coerced into any recognisable date at all.
 *      e.g. "notadate", "32/13/2024", "2024-99-01", "$$$$"
 *
 *   2. INVALID_DATE_VALUE  (HIGH)
 *      The string parses into a Date object but the calendar date is logically
 *      impossible — most commonly caused by JavaScript's date-rollover
 *      behaviour (e.g. "2024-02-30" rolls to "2024-03-01").
 *      Detected by round-tripping the parsed date back to ISO and comparing
 *      it to the canonical form of the original input.
 *
 * Out of scope for this detector (handled by dedicated detectors):
 *   - Missing / empty date field  →  MissingFieldDetector
 *   - Future date                 →  FutureDateDetector
 *
 * Conforms to the detector interface used by anomalyDetectionService.js:
 *   detect(record, norm, context) → Array<AnomalyPayload>
 *
 * AnomalyPayload shape:
 *   {
 *     anomalyType:     'UNPARSEABLE_DATE' | 'INVALID_DATE_VALUE',
 *     severity:        'HIGH',
 *     description:     string,
 *     suggestedAction: string,
 *     status:          'OPEN'
 *   }
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Anomaly type for strings that cannot be parsed as a date at all. */
const ANOMALY_TYPE_UNPARSEABLE = 'UNPARSEABLE_DATE';

/** Anomaly type for strings that parse but represent impossible calendar dates. */
const ANOMALY_TYPE_INVALID_VALUE = 'INVALID_DATE_VALUE';

/**
 * HIGH — an unusable date field blocks the import row from being processed;
 * the record must be corrected before it can be imported.
 */
const SEVERITY = 'HIGH';

/** Formats shown to users in suggested-action messages. */
const ACCEPTED_FORMATS = 'YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, or DD-Mon-YYYY (e.g. 13-Jun-2024)';

// ─────────────────────────────────────────────────────────────────────────────
// Date Parsing & Validation Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to parse `value` as a date using JavaScript's built-in Date parser
 * with a curated list of common CSV date formats as fallbacks.
 *
 * Supported formats (tried in order):
 *   ISO 8601          YYYY-MM-DD  /  YYYY-MM-DDTHH:mm:ss
 *   Day-first         DD/MM/YYYY  /  DD-MM-YYYY
 *   Month-first       MM/DD/YYYY  /  MM-DD-YYYY
 *   Short month name  DD-Mon-YYYY / DD Mon YYYY (e.g. 13-Jun-2024)
 *   Year-last         DD/MM/YY    (two-digit year, 2000-based)
 *
 * Returns a `ParseResult`:
 *   { date: Date, canonical: string }   on success
 *   null                                when no format matches
 *
 * @param {string} raw  - Trimmed raw date string from the CSV cell
 * @returns {ParseResult|null}
 */
function tryParseDate(raw) {
  if (!raw || raw.trim() === '') return null;
  const s = raw.trim();

  // ── Format parsers (ordered: most specific → least specific) ──────────────

  // 1. ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:mm[:ss[.sss]][Z]
  const iso = _tryISO(s);
  if (iso) return iso;

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmY = _tryDMY(s);
  if (dmY) return dmY;

  // 3. MM/DD/YYYY or MM-DD-YYYY
  const mdY = _tryMDY(s);
  if (mdY) return mdY;

  // 4. DD-Mon-YYYY or DD Mon YYYY (e.g. "13 Jun 2024", "13-Jun-2024")
  const named = _tryNamedMonth(s);
  if (named) return named;

  // 5. DD/MM/YY — two-digit year assumed 2000+
  const dmyShort = _tryDMYShort(s);
  if (dmyShort) return dmyShort;

  // 6. Last resort: native Date constructor (handles many ISO variants)
  return _tryNative(s);
}

// ── Individual format parsers ─────────────────────────────────────────────────

function _tryISO(s) {
  // Must start with a 4-digit year
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return { date: d, canonical: d.toISOString().slice(0, 10) };
}

function _tryDMY(s) {
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
  if (isNaN(d.getTime())) return null;
  // Validate no rollover
  if (d.getUTCDate() !== +dd || d.getUTCMonth() + 1 !== +mm) return null;
  return { date: d, canonical: d.toISOString().slice(0, 10) };
}

function _tryMDY(s) {
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  // Only accept when day part is unambiguously > 12 (avoids dd/mm vs mm/dd clash)
  if (+dd <= 12) return null;
  const d = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
  if (isNaN(d.getTime())) return null;
  if (d.getUTCDate() !== +dd || d.getUTCMonth() + 1 !== +mm) return null;
  return { date: d, canonical: d.toISOString().slice(0, 10) };
}

const MONTH_NAMES = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function _tryNamedMonth(s) {
  // e.g. "13-Jun-2024" or "13 Jun 2024" or "13 June 2024"
  const m = s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-](\d{4})$/);
  if (!m) return null;
  const [, dd, mon, yyyy] = m;
  const mm = MONTH_NAMES[mon.slice(0, 3).toLowerCase()];
  if (!mm) return null;
  const d = new Date(Date.UTC(+yyyy, mm - 1, +dd));
  if (isNaN(d.getTime())) return null;
  if (d.getUTCDate() !== +dd || d.getUTCMonth() + 1 !== mm) return null;
  return { date: d, canonical: d.toISOString().slice(0, 10) };
}

function _tryDMYShort(s) {
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yy] = m;
  const yyyy = 2000 + +yy;
  const d = new Date(Date.UTC(yyyy, +mm - 1, +dd));
  if (isNaN(d.getTime())) return null;
  if (d.getUTCDate() !== +dd || d.getUTCMonth() + 1 !== +mm) return null;
  return { date: d, canonical: d.toISOString().slice(0, 10) };
}

function _tryNative(s) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return { date: d, canonical: d.toISOString().slice(0, 10) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rollover / Logical Validity Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether a successfully-parsed date result represents a logically
 * impossible calendar date due to JavaScript's automatic rollover.
 *
 * Strategy: for inputs that contain an explicit numeric date component
 * (YYYY-MM-DD style), we extract the day/month/year from the original string
 * and compare them to the parsed Date's UTC components. A mismatch means
 * JavaScript silently rolled the date over (e.g. Feb 30 → Mar 1).
 *
 * Returns `true` when a rollover is detected.
 *
 * @param {string}      raw    - Original raw date string
 * @param {ParseResult} result - Result from tryParseDate
 * @returns {boolean}
 */
function hasDateRollover(raw, result) {
  // Only apply to ISO-style strings (YYYY-MM-DD) where rollover is detectable
  const isoMatch = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!isoMatch) return false;

  const [, yyyy, mm, dd] = isoMatch;
  const d = result.date;

  return (
    d.getUTCFullYear() !== +yyyy ||
    d.getUTCMonth() + 1 !== +mm ||
    d.getUTCDate()      !== +dd
  );
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
    severity:        SEVERITY,
    description,
    suggestedAction,
    status:          'OPEN'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// InvalidDateDetector Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects invalid or unparseable date values in import records.
 *
 * Emits one anomaly per record (at most one, since a value is either
 * unparseable or has a rollover — never both simultaneously).
 *
 * @example
 * // Plugging into the DETECTORS registry in anomalyDetectionService.js:
 * const { InvalidDateDetector } = require('./anomalies/invalidDateDetector');
 * const DETECTORS = [...existingDetectors, new InvalidDateDetector()];
 *
 * @example
 * // Standalone usage:
 * const detector  = new InvalidDateDetector();
 * const context   = {};
 * const norm      = normalisedRow(record.rawData);
 * const anomalies = detector.detect(record, norm, context);
 */
class InvalidDateDetector {
  /**
   * @param {Object} [options]
   * @param {string} [options.dateField='date']
   *   The normalised rawData key that holds the expense date.
   *   Override if your CSV uses a different column name (e.g. 'transactiondate').
   */
  constructor(options = {}) {
    this.dateField = options.dateField || 'date';
  }

  // ── Public API (detector interface) ────────────────────────────────────────

  /**
   * Inspect a single import record for an invalid or unparseable date.
   *
   * Implements the detector interface:
   *   detect(record, norm, context) → Array<AnomalyPayload>
   *
   * `context` is accepted for interface consistency but is unused — date
   * validity is evaluated per-record with no cross-record state.
   *
   * Skips silently when the date field is absent or empty (that case is
   * reported separately by MissingFieldDetector).
   *
   * @param {Object} record  - Prisma ImportRecord row { id, rowNumber, rawData, ... }
   * @param {Object} norm    - Normalised rawData map (keys already lowercased)
   * @param {Object} _context - Shared mutable state (unused; kept for interface compat)
   * @returns {Array<AnomalyPayload>}
   */
  detect(record, norm, _context) {
    const raw = norm[this.dateField];

    // Absent / empty — handled upstream by MissingFieldDetector
    if (raw === undefined || raw === null || raw.toString().trim() === '') {
      return [];
    }

    const value = raw.toString().trim();

    // ── Sub-case 1: Completely unparseable ─────────────────────────────────
    const result = tryParseDate(value);
    if (!result) {
      return [
        makeAnomaly(
          ANOMALY_TYPE_UNPARSEABLE,
          `Row ${record.rowNumber}: Date value "${value}" could not be recognised as a valid date.`,
          `Provide the date in an accepted format: ${ACCEPTED_FORMATS}.`
        )
      ];
    }

    // ── Sub-case 2: Parsed but logically impossible (rollover) ─────────────
    if (hasDateRollover(value, result)) {
      return [
        makeAnomaly(
          ANOMALY_TYPE_INVALID_VALUE,
          `Row ${record.rowNumber}: Date value "${value}" is not a valid calendar date ` +
          `(parsed as ${result.canonical} after automatic rollover). ` +
          'This likely represents a day or month that does not exist.',
          'Correct the date to a real calendar date (e.g. February has at most 29 days).'
        )
      ];
    }

    // Date is valid — no anomaly
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Row-Normalisation Helpers (standalone use, mirrored from service)
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

// ─────────────────────────────────────────────────────────────────────────────
// Batch Convenience Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the invalid date detector across an entire array of ImportRecord rows.
 * Returns a flat array of fully-stamped anomaly objects ready for
 * `prisma.importAnomaly.createMany()`.
 *
 * @param {number}   importSessionId  - ID of the parent ImportSession
 * @param {Object[]} records          - Prisma ImportRecord rows
 * @param {Object}   [options]        - Forwarded to InvalidDateDetector constructor
 * @returns {Array<StampedAnomaly>}
 */
function detectInvalidDates(importSessionId, records, options = {}) {
  const detector = new InvalidDateDetector(options);
  const context  = {};
  const results  = [];

  for (const record of records) {
    const norm      = normalisedRow(record.rawData);
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

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Primary detector class (plug into DETECTORS registry)
  InvalidDateDetector,

  // Batch convenience helper
  detectInvalidDates,

  // Low-level helpers (exported for unit testing)
  tryParseDate,
  hasDateRollover,
  normaliseKey,
  normalisedRow,

  // Constants (exported so callers can reference anomaly types by name)
  ANOMALY_TYPE_UNPARSEABLE,
  ANOMALY_TYPE_INVALID_VALUE,
  SEVERITY,
  ACCEPTED_FORMATS
};

// ─────────────────────────────────────────────────────────────────────────────
// JSDoc type aliases (no runtime cost)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ParseResult
 * @property {Date}   date       - Successfully parsed Date object
 * @property {string} canonical  - UTC calendar date as YYYY-MM-DD string
 */

/**
 * @typedef {Object} AnomalyPayload
 * @property {'UNPARSEABLE_DATE'|'INVALID_DATE_VALUE'} anomalyType
 * @property {'HIGH'} severity
 * @property {string} description
 * @property {string} suggestedAction
 * @property {'OPEN'} status
 */

/**
 * @typedef {AnomalyPayload & { importSessionId: number, importRecordId: number }} StampedAnomaly
 */
