/**
 * Import Readiness Validator
 *
 * Evaluates whether a staged import session is safe to execute.
 *
 * Rules:
 *   R1 – No INVALID records without a resolution that resolves the blocking issue.
 *   R2 – All CRITICAL-severity anomalies must be resolved (status: APPROVED / FIXED / REJECTED).
 *   R3 – All HIGH-severity anomalies must be resolved.
 *   R4 – At least one VALID record must exist (nothing to commit otherwise).
 *   R5 – Session must not already have a COMPLETED execution.
 *   R6 – Session must not currently have a RUNNING execution.
 *
 * @module readinessValidator
 */

'use strict';

const prisma = require('../../../config/prisma.js');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Anomaly statuses that are considered "resolved" for the purposes of the
 * readiness check.  An anomaly in one of these states has been deliberately
 * handled by a reviewer and should not block execution.
 */
const RESOLVED_ANOMALY_STATUSES = new Set(['APPROVED', 'REJECTED', 'FIXED']);

/**
 * AnomalyDecision values that are considered "resolved".
 */
const RESOLVED_ANOMALY_DECISIONS = new Set(['APPROVED', 'REJECTED', 'MANUAL_FIX', 'MERGED']);

/**
 * Severity levels that MUST be resolved before execution is permitted.
 * Ordered from most-severe first.
 */
const BLOCKING_SEVERITIES = ['CRITICAL', 'HIGH'];

/**
 * Human-readable severity labels for issue messages.
 */
const SEVERITY_LABELS = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: is anomaly resolved?
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if an anomaly has been fully resolved — either its status
 * or review decision indicates deliberate handling.
 *
 * @param {Object} anomaly - Prisma ImportAnomaly record
 * @returns {boolean}
 */
function isAnomalyResolved(anomaly) {
  return (
    RESOLVED_ANOMALY_STATUSES.has(anomaly.status) ||
    RESOLVED_ANOMALY_DECISIONS.has(anomaly.reviewDecision)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a blocking-issue descriptor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BlockingIssue
 * @property {string}  code        - Machine-readable issue code
 * @property {string}  severity    - 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
 * @property {string}  message     - Human-readable description of the issue
 * @property {number}  [count]     - Number of affected records or anomalies
 * @property {number[]} [recordIds] - Affected ImportRecord ids (where applicable)
 * @property {number[]} [anomalyIds]- Affected ImportAnomaly ids (where applicable)
 */

/**
 * Factory for a blocking issue descriptor.
 *
 * @param {string}   code
 * @param {string}   severity
 * @param {string}   message
 * @param {Object}   [extras]
 * @returns {BlockingIssue}
 */
function makeIssue(code, severity, message, extras = {}) {
  return { code, severity, message, ...extras };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates whether a staged import session is ready to execute.
 *
 * Performs the following checks in order (cheapest / most disqualifying first):
 *
 *   1. Session existence
 *   2. No active RUNNING execution (concurrency guard)
 *   3. No prior COMPLETED execution (idempotency guard)
 *   4. At least one VALID record exists
 *   5. All CRITICAL-severity anomalies are resolved
 *   6. All HIGH-severity anomalies are resolved
 *
 * @param {number|string} importSessionId
 * @returns {Promise<{ ready: boolean, blockingIssues: BlockingIssue[] }>}
 */
async function validateImportReadiness(importSessionId) {
  const sessionId = parseInt(importSessionId, 10);
  if (isNaN(sessionId)) {
    throw new Error('Valid importSessionId is required.');
  }

  const blockingIssues = [];

  // ── Step 1: Verify session exists ────────────────────────────────────────
  const session = await prisma.importSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, totalRows: true, originalFileName: true }
  });

  if (!session) {
    blockingIssues.push(
      makeIssue(
        'SESSION_NOT_FOUND',
        'CRITICAL',
        `Import session #${sessionId} does not exist.`
      )
    );
    return { ready: false, blockingIssues };
  }

  // ── Step 2: Concurrency guard — reject if already running ─────────────────
  const runningExecution = await prisma.importExecution.findFirst({
    where: { importSessionId: sessionId, executionStatus: 'RUNNING' },
    select: { id: true, startedAt: true }
  });

  if (runningExecution) {
    blockingIssues.push(
      makeIssue(
        'EXECUTION_ALREADY_RUNNING',
        'CRITICAL',
        `An execution is currently in progress for this session (execution #${runningExecution.id}).`,
        { executionId: runningExecution.id }
      )
    );
    return { ready: false, blockingIssues };
  }

  // ── Step 3: Idempotency guard — reject if already successfully committed ──
  const completedExecution = await prisma.importExecution.findFirst({
    where: { importSessionId: sessionId, executionStatus: 'COMPLETED' },
    select: { id: true, completedAt: true, importedRecords: true }
  });

  if (completedExecution) {
    blockingIssues.push(
      makeIssue(
        'EXECUTION_ALREADY_COMPLETED',
        'HIGH',
        `This session has already been executed successfully (execution #${completedExecution.id}, ` +
          `${completedExecution.importedRecords} records committed).`,
        {
          executionId:     completedExecution.id,
          importedRecords: completedExecution.importedRecords
        }
      )
    );
    return { ready: false, blockingIssues };
  }

  // ── Step 4: At least one VALID record must be staged ──────────────────────
  const validCount = await prisma.importRecord.count({
    where: { importSessionId: sessionId, status: 'VALID' }
  });

  if (validCount === 0) {
    // Also count INVALID and REVIEW_REQUIRED so the message is informative
    const [invalidCount, reviewCount] = await Promise.all([
      prisma.importRecord.count({ where: { importSessionId: sessionId, status: 'INVALID' } }),
      prisma.importRecord.count({ where: { importSessionId: sessionId, status: 'REVIEW_REQUIRED' } })
    ]);

    blockingIssues.push(
      makeIssue(
        'NO_VALID_RECORDS',
        'CRITICAL',
        `No valid records are ready for import. ` +
          `${invalidCount} record(s) are invalid and ${reviewCount} require review. ` +
          `Resolve anomalies before executing.`,
        { invalidCount, reviewCount }
      )
    );
  }

  // ── Step 5 & 6: Unresolved CRITICAL and HIGH anomalies ───────────────────
  //
  // We do a single query for ALL anomalies in blocking severity tiers,
  // then partition into resolved / unresolved in memory to avoid
  // multiple round-trips.

  const blockingAnomalies = await prisma.importAnomaly.findMany({
    where: {
      importSessionId: sessionId,
      severity: { in: BLOCKING_SEVERITIES }
    },
    select: {
      id: true,
      severity: true,
      anomalyType: true,
      description: true,
      status: true,
      reviewDecision: true,
      importRecordId: true
    }
  });

  // Partition by severity → unresolved
  const unresolvedBySeverity = { CRITICAL: [], HIGH: [] };

  for (const anomaly of blockingAnomalies) {
    if (!isAnomalyResolved(anomaly)) {
      unresolvedBySeverity[anomaly.severity]?.push(anomaly);
    }
  }

  // Emit one blocking issue per severity tier that has unresolved entries
  for (const severity of BLOCKING_SEVERITIES) {
    const unresolved = unresolvedBySeverity[severity];
    if (unresolved.length === 0) continue;

    const label     = SEVERITY_LABELS[severity];
    const recordIds = [...new Set(unresolved.map(a => a.importRecordId))];
    const anomalyIds = unresolved.map(a => a.id);

    blockingIssues.push(
      makeIssue(
        `UNRESOLVED_${severity}_ANOMALIES`,
        severity,
        `${unresolved.length} ${label}-severity anomal${unresolved.length === 1 ? 'y' : 'ies'} ` +
          `across ${recordIds.length} record${recordIds.length === 1 ? '' : 's'} must be resolved ` +
          `before the import can be executed.`,
        {
          count:      unresolved.length,
          recordIds,
          anomalyIds,
          // Provide concise type breakdown for UI display
          typeBreakdown: unresolved.reduce((acc, a) => {
            acc[a.anomalyType] = (acc[a.anomalyType] || 0) + 1;
            return acc;
          }, {})
        }
      )
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  return {
    ready:         blockingIssues.length === 0,
    blockingIssues
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience wrapper — throws if not ready
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asserts that a session is ready to execute.  Throws an Error whose message
 * lists all blocking issues if the session is not ready.
 *
 * Useful as a guard at the top of `executeImport()`.
 *
 * @param {number|string} importSessionId
 * @returns {Promise<void>}
 * @throws {Error} with a `blockingIssues` property attached
 */
async function assertImportReady(importSessionId) {
  const { ready, blockingIssues } = await validateImportReadiness(importSessionId);

  if (!ready) {
    const summary = blockingIssues
      .map((issue, i) => `  ${i + 1}. [${issue.severity}] ${issue.message}`)
      .join('\n');

    const err = new Error(
      `Import session #${importSessionId} is not ready to execute:\n${summary}`
    );
    err.code           = 'IMPORT_NOT_READY';
    err.blockingIssues = blockingIssues;
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  validateImportReadiness,
  assertImportReady,

  // Exported for unit testing
  isAnomalyResolved,
  RESOLVED_ANOMALY_STATUSES,
  RESOLVED_ANOMALY_DECISIONS,
  BLOCKING_SEVERITIES
};
