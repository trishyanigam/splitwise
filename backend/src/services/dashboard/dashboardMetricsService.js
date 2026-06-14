const prisma = require('../../config/prisma.js');

// ─────────────────────────────────────────────────────────────────────────────
// Private Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a numeric value to a fixed 2-decimal string.
 * Safely handles null / undefined / Prisma Decimal objects.
 *
 * @param {number|Decimal|null|undefined} val
 * @returns {string}
 */
function formatAmount(val) {
  return val != null ? Number(val).toFixed(2) : '0.00';
}

/**
 * Calculate the total outstanding amount owed across the entire system.
 *
 * Strategy (pure-SQL, no per-group JS loops):
 *   outstanding = Σ expense.convertedAmount  (or amount when no conversion)
 *               − Σ settlement.convertedAmount (or amount when no conversion)
 *
 * This represents the gross unresolved debt before any settlements.
 * A positive result means more has been spent than settled across all groups.
 *
 * We intentionally do NOT re-run the full balance-simplification algorithm
 * here (which requires loading every participant row) because that would be
 * prohibitively expensive at system scale. Instead we provide the simpler but
 * still meaningful "total expenses minus total settlements" figure, which
 * equals the sum of all outstanding debts before simplification.
 *
 * @returns {Promise<string>} Formatted decimal string
 */
async function computeOutstandingAmount() {
  const [expenseSum, settlementSum] = await Promise.all([
    prisma.expense.aggregate({
      _sum: { convertedAmount: true, amount: true }
    }),
    prisma.settlement.aggregate({
      _sum: { convertedAmount: true, amount: true }
    })
  ]);

  // Prefer convertedAmount (normalised to base currency) when available,
  // fall back to the raw amount column.
  const totalExpenses    = Number(expenseSum._sum.convertedAmount    ?? expenseSum._sum.amount    ?? 0);
  const totalSettlements = Number(settlementSum._sum.convertedAmount ?? settlementSum._sum.amount ?? 0);

  const outstanding = Math.max(0, totalExpenses - totalSettlements);
  return formatAmount(outstanding);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate dashboard metrics for the authenticated user's perspective.
 *
 * All counts and amounts are scoped to groups the user belongs to, giving
 * a personalised dashboard view rather than a global admin summary.
 *
 * Metrics returned:
 *   - totalGroups      – groups the user is currently a member of (leftAt IS NULL)
 *   - totalMembers     – active members across those same groups (unique users)
 *   - totalExpenses    – total expenses recorded across those groups
 *   - totalSettlements – total settlements recorded across those groups
 *   - totalImports     – total import sessions created by the user
 *   - outstandingAmount – system-wide gross outstanding (expenses − settlements)
 *
 * @param {number} userId - ID of the authenticated user
 * @returns {Promise<{
 *   totalGroups:       number,
 *   totalMembers:      number,
 *   totalExpenses:     number,
 *   totalSettlements:  number,
 *   totalImports:      number,
 *   outstandingAmount: string
 * }>}
 *
 * @throws {Error} If userId is not a valid positive integer
 */
async function getDashboardMetrics(userId) {
  const uid = parseInt(userId, 10);
  if (isNaN(uid) || uid <= 0) {
    throw new Error('A valid positive userId is required.');
  }

  // ── Step 1: Resolve the group IDs the user actively belongs to ───────────
  // We resolve these first so all subsequent queries can be scoped to the same
  // set without duplicating the membership filter logic.
  const activeMemberships = await prisma.groupMember.findMany({
    where:  { userId: uid, leftAt: null },
    select: { groupId: true }
  });

  const groupIds = activeMemberships.map(m => m.groupId);

  // ── Step 2: Fan out all independent aggregate queries in parallel ─────────
  const [
    // 2a. Count of groups this user actively belongs to
    totalGroups,

    // 2b. Unique active members across the user's groups (excluding the user)
    uniqueActiveMembers,

    // 2c. Total expenses logged in the user's groups
    totalExpenses,

    // 2d. Total settlements recorded in the user's groups
    totalSettlements,

    // 2e. Total import sessions the user has created
    totalImports,

    // 2f. System-wide outstanding amount
    outstandingAmount
  ] = await Promise.all([
    // 2a – group count equals the membership rows we already fetched
    Promise.resolve(groupIds.length),

    // 2b – distinct active members across user's groups
    groupIds.length > 0
      ? prisma.groupMember.findMany({
          where:  { groupId: { in: groupIds }, leftAt: null },
          select: { userId: true },
          distinct: ['userId']
        }).then(rows => rows.length)
      : Promise.resolve(0),

    // 2c – total expenses in user's groups
    groupIds.length > 0
      ? prisma.expense.count({
          where: { groupId: { in: groupIds } }
        })
      : Promise.resolve(0),

    // 2d – total settlements in user's groups
    groupIds.length > 0
      ? prisma.settlement.count({
          where: { groupId: { in: groupIds } }
        })
      : Promise.resolve(0),

    // 2e – import sessions uploaded by the user
    prisma.importSession.count({
      where: { uploadedById: uid }
    }),

    // 2f – outstanding: scoped to the user's groups
    groupIds.length > 0
      ? (async () => {
          const [expenseSum, settlementSum] = await Promise.all([
            prisma.expense.aggregate({
              where: { groupId: { in: groupIds } },
              _sum:  { convertedAmount: true, amount: true }
            }),
            prisma.settlement.aggregate({
              where: { groupId: { in: groupIds } },
              _sum:  { convertedAmount: true, amount: true }
            })
          ]);

          const totalExp    = Number(expenseSum._sum.convertedAmount    ?? expenseSum._sum.amount    ?? 0);
          const totalSettle = Number(settlementSum._sum.convertedAmount ?? settlementSum._sum.amount ?? 0);

          return formatAmount(Math.max(0, totalExp - totalSettle));
        })()
      : Promise.resolve('0.00')
  ]);

  // ── Step 3: Return the metrics object ────────────────────────────────────
  return {
    totalGroups,
    totalMembers:      uniqueActiveMembers,
    totalExpenses,
    totalSettlements,
    totalImports,
    outstandingAmount
  };
}

/**
 * Generate a system-wide dashboard metrics snapshot (admin / reporting view).
 *
 * Unlike getDashboardMetrics(), this is NOT scoped to a single user.
 * It aggregates counts across the entire database.
 *
 * @returns {Promise<{
 *   totalGroups:       number,
 *   totalMembers:      number,
 *   totalExpenses:     number,
 *   totalSettlements:  number,
 *   totalImports:      number,
 *   outstandingAmount: string
 * }>}
 */
async function getSystemDashboardMetrics() {
  const [
    totalGroups,
    totalMembers,
    totalExpenses,
    totalSettlements,
    totalImports,
    outstandingAmount
  ] = await Promise.all([
    prisma.group.count(),

    // Active members only (leftAt IS NULL)
    prisma.groupMember.count({ where: { leftAt: null } }),

    prisma.expense.count(),

    prisma.settlement.count(),

    prisma.importSession.count(),

    computeOutstandingAmount()
  ]);

  return {
    totalGroups,
    totalMembers,
    totalExpenses,
    totalSettlements,
    totalImports,
    outstandingAmount
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getDashboardMetrics,
  getSystemDashboardMetrics,

  // Exported for unit testing
  computeOutstandingAmount,
  formatAmount
};
