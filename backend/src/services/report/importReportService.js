const prisma = require('../../config/prisma.js');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ImportRecord statuses that contribute to the "imported" count.
 * A record is considered imported when it passed validation or its anomalies
 * were resolved to an actionable outcome (APPROVED / FIXED).
 */
const IMPORTED_RECORD_STATUSES = new Set(['VALID']);

/**
 * ImportRecord statuses that contribute to the "skipped" count.
 * These are records we deliberately chose not to import (e.g. REJECTED,
 * INVALID rows that were intentionally dropped).
 */
const SKIPPED_RECORD_STATUSES = new Set(['INVALID']);

/**
 * AnomalyStatus values that mark an anomaly as resolved.
 * APPROVED  – reviewer decided to accept it as-is.
 * REJECTED  – reviewer decided to discard it.
 * FIXED     – anomaly was corrected and revalidated.
 */
const RESOLVED_ANOMALY_STATUSES = new Set(['APPROVED', 'REJECTED', 'FIXED']);

/**
 * AnomalyStatus values that are still pending reviewer action.
 */
const PENDING_ANOMALY_STATUSES = new Set(['OPEN']);

// ─────────────────────────────────────────────────────────────────────────────
// Private Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate and coerce importSessionId to a safe integer.
 *
 * @param {number|string} importSessionId
 * @returns {number} Parsed integer session ID
 * @throws {Error} If the value cannot be parsed as a positive integer
 */
function parseSessionId(importSessionId) {
  const id = parseInt(importSessionId, 10);
  if (isNaN(id) || id <= 0) {
    throw new Error('A valid positive importSessionId is required.');
  }
  return id;
}

/**
 * Derive per-record row counts from a list of ImportRecord rows.
 * Rows that are neither in IMPORTED_RECORD_STATUSES nor SKIPPED_RECORD_STATUSES
 * (e.g. PENDING / REVIEW_REQUIRED) are counted as failed — they exist in the
 * session but were never resolved before the import ran.
 *
 * @param {Array<{ status: string }>} records
 * @param {number} sessionTotalRows - The denormalised totalRows from ImportSession
 * @returns {{ importedRows: number, skippedRows: number, failedRows: number }}
 */
function deriveRowCounts(records, sessionTotalRows) {
  let importedRows = 0;
  let skippedRows  = 0;

  for (const record of records) {
    if (IMPORTED_RECORD_STATUSES.has(record.status)) {
      importedRows++;
    } else if (SKIPPED_RECORD_STATUSES.has(record.status)) {
      skippedRows++;
    }
  }

  // Any record that is neither imported nor skipped (PENDING / REVIEW_REQUIRED
  // left unresolved) is considered a failed row.
  const accounted = importedRows + skippedRows;
  const failedRows = Math.max(0, sessionTotalRows - accounted);

  return { importedRows, skippedRows, failedRows };
}

/**
 * Derive anomaly summary counts from a list of ImportAnomaly rows.
 *
 * @param {Array<{ status: string }>} anomalies
 * @returns {{
 *   anomaliesDetected:  number,
 *   anomaliesResolved:  number,
 *   pendingAnomalies:   number
 * }}
 */
function deriveAnomalyCounts(anomalies) {
  const anomaliesDetected = anomalies.length;
  let anomaliesResolved   = 0;
  let pendingAnomalies    = 0;

  for (const anomaly of anomalies) {
    if (RESOLVED_ANOMALY_STATUSES.has(anomaly.status)) {
      anomaliesResolved++;
    } else if (PENDING_ANOMALY_STATUSES.has(anomaly.status)) {
      pendingAnomalies++;
    }
    // Anomalies in other states (e.g. none currently defined) are silently
    // ignored — they don't contribute to either bucket.
  }

  return { anomaliesDetected, anomaliesResolved, pendingAnomalies };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a structured import report for the given import session.
 *
 * The report is derived entirely from persisted database state — it does NOT
 * re-run any import or detection logic. Call this at any point after the
 * anomaly-detection phase has run to get an up-to-date summary.
 *
 * Row counts preference order:
 *   1. If the session has an associated ImportExecution record, use its
 *      persisted counters (most authoritative for completed imports).
 *   2. Otherwise, derive counts directly from ImportRecord statuses so the
 *      report works even for sessions that have not been executed yet.
 *
 * @param {number|string} importSessionId
 * @returns {Promise<{
 *   totalRows:          number,
 *   importedRows:       number,
 *   skippedRows:        number,
 *   failedRows:         number,
 *   anomaliesDetected:  number,
 *   anomaliesResolved:  number,
 *   pendingAnomalies:   number
 * }>}
 *
 * @throws {Error} If the session is not found or the ID is invalid
 */
async function generateImportReport(importSessionId) {
  const sessionId = parseSessionId(importSessionId);

  // ── Fetch everything we need in a single query ────────────────────────────
  const session = await prisma.importSession.findUnique({
    where: { id: sessionId },
    select: {
      id:        true,
      totalRows: true,
      status:    true,
      records: {
        select: { status: true }
      },
      anomalies: {
        select: { status: true }
      },
      executions: {
        // Only grab the most recent completed or running execution.
        // Multiple executions could exist if the user retried.
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: {
          totalRecords:    true,
          importedRecords: true,
          skippedRecords:  true,
          failedRecords:   true,
          executionStatus: true
        }
      }
    }
  });

  if (!session) {
    throw new Error(`Import session #${sessionId} not found.`);
  }

  // ── Row counts ────────────────────────────────────────────────────────────
  let totalRows, importedRows, skippedRows, failedRows;

  const latestExecution = session.executions[0] ?? null;

  if (latestExecution && latestExecution.executionStatus === 'COMPLETED') {
    // Prefer execution-level counters — these are stamped at the moment the
    // import actually ran and are the most accurate source of truth.
    totalRows    = latestExecution.totalRecords;
    importedRows = latestExecution.importedRecords;
    skippedRows  = latestExecution.skippedRecords;
    failedRows   = latestExecution.failedRecords;
  } else {
    // Fall back to deriving counts from individual record statuses.
    // This covers sessions still in PENDING / PROCESSING / REVIEW_REQUIRED
    // and sessions whose last execution is still RUNNING or FAILED.
    totalRows = session.totalRows;
    const derived = deriveRowCounts(session.records, totalRows);
    importedRows  = derived.importedRows;
    skippedRows   = derived.skippedRows;
    failedRows    = derived.failedRows;
  }

  // ── Anomaly counts ────────────────────────────────────────────────────────
  const { anomaliesDetected, anomaliesResolved, pendingAnomalies } =
    deriveAnomalyCounts(session.anomalies);

  // ── Return report ─────────────────────────────────────────────────────────
  return {
    totalRows,
    importedRows,
    skippedRows,
    failedRows,
    anomaliesDetected,
    anomaliesResolved,
    pendingAnomalies
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  generateImportReport,

  // Exported for unit testing
  parseSessionId,
  deriveRowCounts,
  deriveAnomalyCounts
};
