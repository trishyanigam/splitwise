const prisma = require('../../config/prisma.js');
const { generateImportReport } = require('../../services/report/importReportService.js');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coerce a route parameter to a positive integer.
 * Returns NaN when the value cannot be parsed.
 *
 * @param {string|undefined} value
 * @returns {number}
 */
function parseIntParam(value) {
  const n = parseInt(value, 10);
  return isNaN(n) || n <= 0 ? NaN : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller: getImportReport
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve a structured import report for a specific import session.
 *
 * Authorization: only the user who uploaded the session may view its report.
 *
 * Route: GET /api/reports/import/:sessionId
 *
 * Response 200:
 * {
 *   success: true,
 *   sessionId: number,
 *   report: {
 *     totalRows:         number,
 *     importedRows:      number,
 *     skippedRows:       number,
 *     failedRows:        number,
 *     anomaliesDetected: number,
 *     anomaliesResolved: number,
 *     pendingAnomalies:  number
 *   }
 * }
 */
const getImportReport = async (req, res, next) => {
  try {
    const sessionId = parseIntParam(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId parameter is required.'
      });
    }

    // ── Ownership check ───────────────────────────────────────────────────
    // We do a lightweight ownership lookup before running the heavier report
    // query so we can return 404 vs 403 with correct semantics.
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      select: { id: true, uploadedById: true }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Import session not found.'
      });
    }

    if (session.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this import report.'
      });
    }

    // ── Generate report ───────────────────────────────────────────────────
    const report = await generateImportReport(sessionId);

    return res.status(200).json({
      success: true,
      sessionId,
      report
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller: getSystemSummary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve a high-level system-wide summary of all data in the application.
 *
 * Authorization: any authenticated user may view the system summary.
 * The summary intentionally exposes only aggregate counts — no individual
 * records or personally identifiable details are included.
 *
 * Route: GET /api/reports/summary
 *
 * Response 200:
 * {
 *   success: true,
 *   generatedAt: ISO string,
 *   summary: {
 *     users:       { total: number },
 *     groups:      { total: number },
 *     expenses:    { total: number, totalAmount: string },
 *     settlements: { total: number, totalAmount: string },
 *     imports: {
 *       totalSessions:      number,
 *       completedSessions:  number,
 *       pendingSessions:    number,
 *       failedSessions:     number,
 *       totalAnomalies:     number,
 *       resolvedAnomalies:  number,
 *       pendingAnomalies:   number
 *     }
 *   }
 * }
 */
const getSystemSummary = async (req, res, next) => {
  try {
    // ── Run all aggregate queries in parallel ─────────────────────────────
    const [
      totalUsers,
      totalGroups,
      expenseAggregate,
      settlementAggregate,

      // Import session counts grouped by status
      importSessionGroups,

      // Anomaly counts — all statuses
      totalAnomalies,
      resolvedAnomalies,
      pendingAnomalies
    ] = await Promise.all([
      // 1. Total users
      prisma.user.count(),

      // 2. Total groups
      prisma.group.count(),

      // 3. Total expenses + sum of amounts
      prisma.expense.aggregate({
        _count: { id: true },
        _sum:   { amount: true }
      }),

      // 4. Total settlements + sum of amounts
      prisma.settlement.aggregate({
        _count: { id: true },
        _sum:   { amount: true }
      }),

      // 5. Import session counts per status
      prisma.importSession.groupBy({
        by: ['status'],
        _count: { id: true }
      }),

      // 6. Total anomalies ever detected
      prisma.importAnomaly.count(),

      // 7. Resolved anomalies (APPROVED | REJECTED | FIXED)
      prisma.importAnomaly.count({
        where: { status: { in: ['APPROVED', 'REJECTED', 'FIXED'] } }
      }),

      // 8. Pending anomalies (still OPEN)
      prisma.importAnomaly.count({
        where: { status: 'OPEN' }
      })
    ]);

    // ── Derive session status buckets from groupBy result ─────────────────
    const sessionStatusMap = Object.fromEntries(
      importSessionGroups.map(g => [g.status, g._count.id])
    );

    const totalSessions     = Object.values(sessionStatusMap).reduce((a, b) => a + b, 0);
    const completedSessions = sessionStatusMap['COMPLETED']       ?? 0;
    const failedSessions    = sessionStatusMap['FAILED']          ?? 0;
    // Pending = any session that is not yet completed or failed
    const pendingSessions   = totalSessions - completedSessions - failedSessions;

    // ── Format monetary totals as fixed-decimal strings ───────────────────
    // Prisma returns Decimal objects from aggregate _sum; convert safely.
    const formatAmount = (val) =>
      val != null ? Number(val).toFixed(2) : '0.00';

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      summary: {
        users: {
          total: totalUsers
        },
        groups: {
          total: totalGroups
        },
        expenses: {
          total:       expenseAggregate._count.id,
          totalAmount: formatAmount(expenseAggregate._sum.amount)
        },
        settlements: {
          total:       settlementAggregate._count.id,
          totalAmount: formatAmount(settlementAggregate._sum.amount)
        },
        imports: {
          totalSessions,
          completedSessions,
          pendingSessions:  Math.max(0, pendingSessions),
          failedSessions,
          totalAnomalies,
          resolvedAnomalies,
          pendingAnomalies
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getImportReport,
  getSystemSummary
};
