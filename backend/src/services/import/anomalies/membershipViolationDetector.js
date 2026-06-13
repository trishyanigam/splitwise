/**
 * Membership Violation Detector
 *
 * Detects import records where a named participant (payer or expense
 * participant) was not an active group member on the expense date.
 *
 * Two violation subtypes are emitted independently:
 *
 *   1. PAYER_MEMBERSHIP_VIOLATION  (HIGH)
 *      The person who paid for the expense was not an active member of the
 *      group on the expense date.
 *      Examples:
 *        – "Expense after Meera left" — leftAt < expenseDate
 *        – "Expense before Sam joined" — joinedAt > expenseDate
 *
 *   2. PARTICIPANT_MEMBERSHIP_VIOLATION  (HIGH)
 *      One or more participants listed in the expense were not active members
 *      of the group on the expense date.
 *
 * Resolution strategy:
 *   CSV rows carry human-readable names (not numeric IDs).
 *   The detector resolves names to User IDs via a DB lookup, then delegates
 *   the active-membership check to `membershipService.isUserActiveOnDate()`.
 *   Unresolvable names (users not found in the DB) are flagged separately as
 *   UNKNOWN_PARTICIPANT anomalies so they are never silently ignored.
 *
 * Raw data field conventions (normalised, case-insensitive):
 *   paidby       – name of the payer  (required; matched to User.name)
 *   groupid      – numeric group ID   (required; used for membership lookup)
 *   date         – expense date       (required; parsed to Date object)
 *   participants – comma-separated participant names (optional; defaults to
 *                  payer only when absent)
 *
 * Conforms to the detector interface used by anomalyDetectionService.js:
 *   detectAsync(record, norm, context) → Promise<Array<AnomalyPayload>>
 *
 * Note: this detector is inherently async (requires DB queries). It does NOT
 * implement the synchronous `detect()` method. Register it via `detectAsync()`
 * or use the `detectMembershipViolationsAsync()` batch helper.
 *
 * AnomalyPayload shape:
 *   {
 *     anomalyType:     string,
 *     severity:        'HIGH',
 *     description:     string,
 *     suggestedAction: string,
 *     status:          'OPEN'
 *   }
 */

'use strict';

const prisma             = require('../../../config/prisma.js');
const { isUserActiveOnDate } = require('../../group/membershipService.js');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ANOMALY_TYPE_PAYER       = 'PAYER_MEMBERSHIP_VIOLATION';
const ANOMALY_TYPE_PARTICIPANT = 'PARTICIPANT_MEMBERSHIP_VIOLATION';
const ANOMALY_TYPE_UNKNOWN     = 'UNKNOWN_PARTICIPANT';

/** All membership-related anomalies block the import row (HIGH). */
const SEVERITY = 'HIGH';

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
 * Attempt to parse a date string. Returns null if unparseable.
 * @param {string|undefined} value
 * @returns {Date|null}
 */
function tryParseDate(value) {
  if (!value || !value.toString().trim()) return null;
  const d = new Date(value.toString().trim());
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse a comma-separated list of participant names from a raw CSV field.
 * Returns an empty array when the field is absent or blank.
 *
 * @param {string|undefined} value
 * @returns {string[]}  Trimmed, non-empty name strings
 */
function parseParticipantNames(value) {
  if (!value || !value.toString().trim()) return [];
  return value
    .toString()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Anomaly Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an anomaly payload.
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
// DB Resolution Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a user's name to their database ID.
 *
 * Uses `context.userIdCache` (Map<lowerCaseName, userId|null>) so each unique
 * name is queried at most once per session run.
 *
 * @param {string} name
 * @param {Object} context
 * @returns {Promise<number|null>}  User.id, or null if not found
 */
async function resolveUserId(name, context) {
  if (!context.userIdCache) context.userIdCache = new Map();

  const key = name.trim().toLowerCase();
  if (context.userIdCache.has(key)) return context.userIdCache.get(key);

  const user = await prisma.user.findFirst({
    where: { name: { equals: name.trim(), mode: 'insensitive' } },
    select: { id: true }
  });

  const id = user ? user.id : null;
  context.userIdCache.set(key, id);
  return id;
}

/**
 * Fetch membership spans for a user in a group.
 *
 * Uses `context.membershipCache` (Map<"userId:groupId", GroupMember[]>) to
 * avoid repeated DB queries for the same user-group pair across records.
 *
 * @param {number} userId
 * @param {number} groupId
 * @param {Object} context
 * @returns {Promise<Array<{ joinedAt: Date, leftAt: Date|null }>>}
 */
async function getMembershipSpans(userId, groupId, context) {
  if (!context.membershipCache) context.membershipCache = new Map();

  const key = `${userId}:${groupId}`;
  if (context.membershipCache.has(key)) return context.membershipCache.get(key);

  const spans = await prisma.groupMember.findMany({
    where: { userId, groupId },
    select: { joinedAt: true, leftAt: true },
    orderBy: { joinedAt: 'asc' }
  });

  context.membershipCache.set(key, spans);
  return spans;
}

// ─────────────────────────────────────────────────────────────────────────────
// Violation Reason Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describe *why* a member was inactive on a given date, given their membership
 * spans. Produces a human-readable clause for the anomaly description.
 *
 * @param {string} name           - Human name of the user
 * @param {Date}   expenseDate    - The date of the expense
 * @param {Array}  spans          - Membership spans from the DB
 * @returns {string}
 */
function buildViolationReason(name, expenseDate, spans) {
  if (spans.length === 0) {
    return `"${name}" has no membership record in this group.`;
  }

  const ts = expenseDate.getTime();

  // Check if the expense pre-dates the first join
  const firstJoin = spans[0].joinedAt;
  if (ts < firstJoin.getTime()) {
    return (
      `"${name}" had not yet joined the group on ${_fmtDate(expenseDate)} ` +
      `(joined on ${_fmtDate(firstJoin)}).`
    );
  }

  // Check if the expense post-dates a departure
  // Walk spans in reverse to find the most recent relevant one
  for (let i = spans.length - 1; i >= 0; i--) {
    const { joinedAt, leftAt } = spans[i];
    if (ts >= joinedAt.getTime()) {
      if (leftAt && ts > leftAt.getTime()) {
        return (
          `"${name}" had already left the group by ${_fmtDate(expenseDate)} ` +
          `(left on ${_fmtDate(leftAt)}).`
        );
      }
      break;
    }
  }

  // Fallback — gap between membership spans
  return (
    `"${name}" was not an active member of the group on ${_fmtDate(expenseDate)}.`
  );
}

/** Format a Date as a readable YYYY-MM-DD string (UTC). */
function _fmtDate(d) {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Check — single participant
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether a single named participant was an active group member on the
 * expense date. Returns an anomaly object, or null if no violation found.
 *
 * @param {string}  name         - Participant name from CSV
 * @param {number}  groupId      - Resolved group ID
 * @param {Date}    expenseDate  - Parsed expense date
 * @param {number}  rowNumber
 * @param {string}  anomalyType  - ANOMALY_TYPE_PAYER or ANOMALY_TYPE_PARTICIPANT
 * @param {Object}  context      - Shared mutable context
 * @returns {Promise<AnomalyPayload|null>}
 */
async function checkParticipant(name, groupId, expenseDate, rowNumber, anomalyType, context) {
  const userId = await resolveUserId(name, context);

  // User not found in the database at all
  if (userId === null) {
    return makeAnomaly(
      ANOMALY_TYPE_UNKNOWN,
      `Row ${rowNumber}: Participant "${name}" could not be found in the system.`,
      `Ensure "${name}" is registered before importing this expense. ` +
      'If the name is misspelled, correct it in the CSV and re-upload.'
    );
  }

  // Delegate active-membership check to membershipService
  let isActive;
  try {
    isActive = await isUserActiveOnDate(userId, groupId, expenseDate);
  } catch {
    // isUserActiveOnDate throws on invalid inputs; degrade gracefully
    return null;
  }

  if (isActive) return null;

  // Fetch spans for a detailed reason
  const spans  = await getMembershipSpans(userId, groupId, context);
  const reason = buildViolationReason(name, expenseDate, spans);

  const roleLabel = anomalyType === ANOMALY_TYPE_PAYER ? 'Payer' : 'Participant';

  return makeAnomaly(
    anomalyType,
    `Row ${rowNumber}: ${roleLabel} "${name}" was not an active group member on ` +
    `${_fmtDate(expenseDate)}. ${reason}`,
    'Verify the expense date and participant list. ' +
    `If "${name}" had left the group, correct the date or remove them from the expense.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MembershipViolationDetector Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects membership violations — cases where the payer or a participant
 * was not an active group member on the expense date.
 *
 * @example
 * // Batch usage:
 * const { detectMembershipViolationsAsync } = require('./anomalies/membershipViolationDetector');
 * const anomalies = await detectMembershipViolationsAsync(sessionId, records);
 *
 * @example
 * // Per-record async usage:
 * const detector  = new MembershipViolationDetector();
 * const context   = {};
 * const norm      = normalisedRow(record.rawData);
 * const anomalies = await detector.detectAsync(record, norm, context);
 */
class MembershipViolationDetector {
  /**
   * @param {Object} [options]
   * @param {string} [options.dateField='date']
   *   Normalised CSV key for the expense date.
   * @param {string} [options.payerField='paidby']
   *   Normalised CSV key for the payer name.
   * @param {string} [options.groupIdField='groupid']
   *   Normalised CSV key for the group ID.
   * @param {string} [options.participantsField='participants']
   *   Normalised CSV key for the comma-separated participant list.
   *   When absent, only the payer is checked.
   * @param {boolean} [options.checkParticipants=true]
   *   Set to false to skip participant checks and only validate the payer.
   */
  constructor(options = {}) {
    this.dateField          = options.dateField         || 'date';
    this.payerField         = options.payerField        || 'paidby';
    this.groupIdField       = options.groupIdField      || 'groupid';
    this.participantsField  = options.participantsField || 'participants';
    this.checkParticipants  = options.checkParticipants !== false;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Async detector implementation.
   *
   * Skips silently when any prerequisite field is missing or invalid —
   * those cases are reported by MissingFieldDetector / InvalidDateDetector.
   *
   * @param {Object} record   - Prisma ImportRecord row
   * @param {Object} norm     - Normalised rawData map
   * @param {Object} context  - Shared mutable state (caches user IDs & memberships)
   * @returns {Promise<Array<AnomalyPayload>>}
   */
  async detectAsync(record, norm, context) {
    // ── Extract and validate required fields ─────────────────────────────────
    const dateRaw    = norm[this.dateField];
    const payerRaw   = norm[this.payerField];
    const groupIdRaw = norm[this.groupIdField];

    // Skip if any prerequisite field is missing — other detectors handle this
    if (!dateRaw || !payerRaw || !groupIdRaw) return [];

    const expenseDate = tryParseDate(dateRaw);
    if (!expenseDate) return []; // InvalidDateDetector handles this

    const groupId = parseInt(groupIdRaw, 10);
    if (isNaN(groupId)) return []; // Invalid group ID — out of scope here

    const payerName = payerRaw.toString().trim();
    if (!payerName) return [];

    const anomalies = [];

    // ── Check 1: Payer membership ─────────────────────────────────────────────
    const payerAnomaly = await checkParticipant(
      payerName, groupId, expenseDate,
      record.rowNumber, ANOMALY_TYPE_PAYER, context
    );
    if (payerAnomaly) anomalies.push(payerAnomaly);

    // ── Check 2: Participant membership ───────────────────────────────────────
    if (this.checkParticipants) {
      const participantNames = parseParticipantNames(norm[this.participantsField]);

      for (const name of participantNames) {
        // Skip the payer if they appear in the participants list too — already checked
        if (name.toLowerCase() === payerName.toLowerCase()) continue;

        const participantAnomaly = await checkParticipant(
          name, groupId, expenseDate,
          record.rowNumber, ANOMALY_TYPE_PARTICIPANT, context
        );
        if (participantAnomaly) anomalies.push(participantAnomaly);
      }
    }

    return anomalies;
  }

  /**
   * Synchronous stub — always returns [] because membership validation
   * requires async DB calls. Use `detectAsync()` instead.
   *
   * Kept so instances can be safely registered in the DETECTORS array
   * without crashing; the orchestrator must call `detectAsync()` explicitly.
   *
   * @returns {Array}
   */
  detect(_record, _norm, _context) {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Convenience Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the membership violation detector across an entire array of ImportRecord
 * rows (async). Returns a flat array of fully-stamped anomaly objects ready
 * for `prisma.importAnomaly.createMany()`.
 *
 * User ID and membership span lookups are cached across all records so the
 * total number of DB round-trips stays proportional to unique names, not rows.
 *
 * @param {number}   importSessionId  - ID of the parent ImportSession
 * @param {Object[]} records          - Prisma ImportRecord rows
 * @param {Object}   [options]        - Forwarded to MembershipViolationDetector constructor
 * @returns {Promise<Array<StampedAnomaly>>}
 */
async function detectMembershipViolationsAsync(importSessionId, records, options = {}) {
  const detector = new MembershipViolationDetector(options);
  const context  = {}; // shared cache: userIdCache + membershipCache
  const results  = [];

  for (const record of records) {
    const norm      = normalisedRow(record.rawData);
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
  // Primary detector class
  MembershipViolationDetector,

  // Batch async convenience helper
  detectMembershipViolationsAsync,

  // Low-level helpers (exported for unit testing)
  resolveUserId,
  getMembershipSpans,
  buildViolationReason,
  parseParticipantNames,
  tryParseDate,
  normaliseKey,
  normalisedRow,

  // Constants
  ANOMALY_TYPE_PAYER,
  ANOMALY_TYPE_PARTICIPANT,
  ANOMALY_TYPE_UNKNOWN,
  SEVERITY
};

// ─────────────────────────────────────────────────────────────────────────────
// JSDoc type aliases (no runtime cost)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AnomalyPayload
 * @property {'PAYER_MEMBERSHIP_VIOLATION'|'PARTICIPANT_MEMBERSHIP_VIOLATION'|'UNKNOWN_PARTICIPANT'} anomalyType
 * @property {'HIGH'} severity
 * @property {string} description
 * @property {string} suggestedAction
 * @property {'OPEN'} status
 */

/**
 * @typedef {AnomalyPayload & { importSessionId: number, importRecordId: number }} StampedAnomaly
 */
