/**
 * Negative Amount Detector
 *
 * Detects import records where the expense amount is a negative number.
 * A negative amount is not necessarily a hard error — it may legitimately
 * represent a refund, reversal, or correction entry — so the anomaly is
 * raised at MEDIUM severity to prompt human review rather than outright
 * rejection.
 *
 * Detection rule:
 *   amount < 0  →  emit NEGATIVE_AMOUNT anomaly (MEDIUM)
 *
 * Conforms to the detector interface used by anomalyDetectionService.js:
 *   detect(record, norm, context) → Array<AnomalyPayload>
 *
 * AnomalyPayload shape:
 *   {
 *     anomalyType:     'NEGATIVE_AMOUNT',
 *     severity:        'MEDIUM',
 *     description:     string,
 *     suggestedAction: string,
 *     status:          'OPEN'
 *   }
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Anomaly type identifier stored in the ImportAnomaly table. */
const ANOMALY_TYPE = 'NEGATIVE_AMOUNT';

/**
 * MEDIUM — negative amounts may be intentional (refunds / corrections),
 * so we warn rather than hard-block the import row.
 */
const SEVERITY = 'MEDIUM';

/** Canonical suggested action returned with every anomaly. */
const SUGGESTED_ACTION =
  'Review this entry as a potential refund or correction. ' +
  'If intentional, confirm before importing; otherwise correct the amount to a positive value.';

// ─────────────────────────────────────────────────────────────────────────────
// Amount Parsing Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an amount value from a raw CSV field into a JavaScript number.
 *
 * Handles:
 *   - Comma-separated thousands  ("1,500.00" → 1500)
 *   - Leading currency symbols   ("$-250"  → -250, "-$250" → -250)
 *   - Parenthetical negatives    ("(150)"  → -150)  accounting convention
 *   - Plain numeric strings      ("-75.5"  → -75.5)
 *
 * Returns `null` when the value is absent, empty, or cannot be parsed.
 *
 * @param {string|number|undefined|null} value
 * @returns {number|null}
 */
function parseAmount(value) {
  if (value === undefined || value === null) return null;

  const raw = value.toString().trim();
  if (raw === '') return null;

  // Parenthetical negative — accounting notation: (250) → -250
  const parenthetical = raw.match(/^\(([0-9,]+(?:\.[0-9]+)?)\)$/);
  if (parenthetical) {
    const n = Number(parenthetical[1].replace(/,/g, ''));
    return isNaN(n) ? null : -n;
  }

  // Strip currency symbols and thousands separators, preserve sign and decimals
  const cleaned = raw.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-') return null;

  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Anomaly Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an anomaly payload object.
 *
 * @param {string} description
 * @returns {AnomalyPayload}
 */
function makeAnomaly(description) {
  return {
    anomalyType:     ANOMALY_TYPE,
    severity:        SEVERITY,
    description,
    suggestedAction: SUGGESTED_ACTION,
    status:          'OPEN'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NegativeAmountDetector Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects import records carrying a negative expense amount.
 *
 * @example
 * // Plugging into the DETECTORS registry in anomalyDetectionService.js:
 * const { NegativeAmountDetector } = require('./anomalies/negativeAmountDetector');
 * const DETECTORS = [...existingDetectors, new NegativeAmountDetector()];
 *
 * @example
 * // Standalone usage:
 * const detector = new NegativeAmountDetector();
 * const context  = {};   // no cross-record state needed for this detector
 * const norm     = normalisedRow(record.rawData);
 * const anomalies = detector.detect(record, norm, context);
 */
class NegativeAmountDetector {
  /**
   * @param {Object}  [options]
   * @param {string}  [options.amountField='amount']
   *   The normalised rawData key that holds the expense amount.
   *   Override if your CSV uses a different column name (e.g. 'total').
   */
  constructor(options = {}) {
    this.amountField = options.amountField || 'amount';
  }

  // ── Public API (detector interface) ────────────────────────────────────────

  /**
   * Inspect a single import record for a negative amount.
   *
   * Implements the detector interface:
   *   detect(record, norm, context) → Array<AnomalyPayload>
   *
   * `context` is accepted for interface consistency but is not used by this
   * detector since negative-amount detection is stateless across records.
   *
   * Skips the check silently when:
   *   - The amount field is absent or empty  (reported by MissingFieldDetector)
   *   - The amount field is non-numeric      (reported by InvalidAmountFormatDetector)
   *
   * @param {Object} record  - Prisma ImportRecord row { id, rowNumber, rawData, ... }
   * @param {Object} norm    - Normalised rawData map (keys already lowercased)
   * @param {Object} context - Shared mutable state (unused; kept for interface compat)
   * @returns {Array<AnomalyPayload>}
   */
  detect(record, norm, _context) {
    const raw = norm[this.amountField];

    // Absent / empty — handled upstream by MissingFieldDetector
    if (raw === undefined || raw === null || raw.toString().trim() === '') {
      return [];
    }

    const amount = parseAmount(raw);

    // Non-numeric — handled upstream by InvalidAmountFormatDetector
    if (amount === null) return [];

    // Primary rule: amount strictly less than zero
    if (amount < 0) {
      return [
        makeAnomaly(
          `Row ${record.rowNumber}: Amount "${raw}" is negative (parsed value: ${amount}). ` +
          'Negative amounts may indicate a refund, reversal, or data-entry error.'
        )
      ];
    }

    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// normalised-row helper (mirrored from anomalyDetectionService for standalone use)
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
 * Run the negative amount detector across an entire array of ImportRecord rows.
 * Returns a flat array of fully-stamped anomaly objects ready for
 * `prisma.importAnomaly.createMany()`.
 *
 * @param {number}   importSessionId  - ID of the parent ImportSession
 * @param {Object[]} records          - Prisma ImportRecord rows
 * @param {Object}   [options]        - Forwarded to NegativeAmountDetector constructor
 * @returns {Array<StampedAnomaly>}
 */
function detectNegativeAmounts(importSessionId, records, options = {}) {
  const detector = new NegativeAmountDetector(options);
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

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Primary detector class (plug into DETECTORS registry)
  NegativeAmountDetector,

  // Batch convenience helper
  detectNegativeAmounts,

  // Low-level helpers (exported for unit testing)
  parseAmount,
  normaliseKey,
  normalisedRow,

  // Constants (exported so callers can reference the anomaly type by name)
  ANOMALY_TYPE,
  SEVERITY,
  SUGGESTED_ACTION
};

// ─────────────────────────────────────────────────────────────────────────────
// JSDoc type aliases (no runtime cost)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AnomalyPayload
 * @property {'NEGATIVE_AMOUNT'} anomalyType
 * @property {'MEDIUM'} severity
 * @property {string}   description
 * @property {string}   suggestedAction
 * @property {'OPEN'}   status
 */

/**
 * @typedef {AnomalyPayload & { importSessionId: number, importRecordId: number }} StampedAnomaly
 */
