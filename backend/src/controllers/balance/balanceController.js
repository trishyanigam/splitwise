const prisma = require('../../config/prisma.js');
const { calculateGroupBalances } = require('../../services/balance/balanceService.js');

/**
 * Retrieves calculated balances and simplified debt transactions for a specific group.
 * Expects: req.params.groupId
 */
const getGroupBalances = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid groupId parameter is required.',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    // Verify group existence
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.',
      });
    }

    // Verify user is a member of the group
    const isMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id
      }
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be a member of the group to view balances.',
      });
    }

    const balanceResults = await calculateGroupBalances(groupId);

    return res.status(200).json({
      success: true,
      balances: balanceResults.balances,
      simplifiedDebts: balanceResults.simplifiedDebts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves overall balance summary for the authenticated user across all groups they belong to.
 */
const getUserBalanceSummary = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    const userId = req.user.id;

    // Find all memberships of this user (only active ones where leftAt is null)
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId,
        leftAt: null
      },
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    let amountOwed = 0.0;
    let amountToReceive = 0.0;
    const groupBalancesList = [];
    const groupIds = memberships.map(m => m.groupId);

    // Calculate balances for each group
    for (const membership of memberships) {
      const groupId = membership.groupId;
      const groupName = membership.group?.name || `Group #${groupId}`;

      try {
        const { balances } = await calculateGroupBalances(groupId);
        // Find current user's balance
        const userBalanceObj = balances.find(b => b.userId === userId);
        const userBalance = userBalanceObj ? userBalanceObj.balance : 0.0;

        if (userBalance < 0) {
          amountOwed += Math.abs(userBalance);
        } else if (userBalance > 0) {
          amountToReceive += userBalance;
        }

        groupBalancesList.push({
          groupId,
          groupName,
          balance: userBalance
        });
      } catch (err) {
        console.error(`Error calculating balance for group ${groupId}:`, err);
        groupBalancesList.push({
          groupId,
          groupName,
          balance: 0.0,
          error: 'Calculation failed'
        });
      }
    }

    // 1. Calculate total expenses logged in these groups
    let totalExpensesAmount = 0.0;
    if (groupIds.length > 0) {
      const expenseSum = await prisma.expense.aggregate({
        where: { groupId: { in: groupIds } },
        _sum: { convertedAmount: true, amount: true }
      });
      totalExpensesAmount = Number(expenseSum._sum.convertedAmount ?? expenseSum._sum.amount ?? 0);
    }

    // 2. Query recent activity (recent 5 expenses/settlements across these groups)
    let recentActivity = [];
    if (groupIds.length > 0) {
      const [recentExpenses, recentSettlements] = await Promise.all([
        prisma.expense.findMany({
          where: { groupId: { in: groupIds } },
          include: {
            group: { select: { name: true } },
            paidBy: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.settlement.findMany({
          where: { groupId: { in: groupIds } },
          include: {
            group: { select: { name: true } },
            payer: { select: { name: true } },
            receiver: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      const formattedExpenses = recentExpenses.map(e => ({
        id: `expense-${e.id}`,
        type: 'EXPENSE',
        title: e.title,
        groupName: e.group?.name || 'Group',
        amount: Number(e.convertedAmount || e.amount || 0),
        currency: 'INR',
        date: e.expenseDate,
        description: `Paid by ${e.paidBy?.name || 'Unknown'}`,
        createdAt: e.createdAt
      }));

      const formattedSettlements = recentSettlements.map(s => ({
        id: `settlement-${s.id}`,
        type: 'SETTLEMENT',
        title: `${s.payer?.name || 'Someone'} settled up with ${s.receiver?.name || 'someone'}`,
        groupName: s.group?.name || 'Group',
        amount: Number(s.convertedAmount || s.amount || 0),
        currency: 'INR',
        date: s.settlementDate,
        description: s.notes || 'Settled',
        createdAt: s.createdAt
      }));

      recentActivity = [...formattedExpenses, ...formattedSettlements]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    }

    return res.status(200).json({
      success: true,
      summary: {
        totalGroups: memberships.length,
        amountOwed: Math.round(amountOwed * 100) / 100,
        amountToReceive: Math.round(amountToReceive * 100) / 100,
        netBalance: Math.round((amountToReceive - amountOwed) * 100) / 100,
        totalExpensesAmount: Math.round(totalExpensesAmount * 100) / 100
      },
      groupBalances: groupBalancesList,
      recentActivity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the calculated balance for a specific user within a group.
 * Expects: req.params.groupId, req.params.userId
 */
const getUserBalanceInGroup = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(groupId) || isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid groupId and userId parameters are required.',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    // Verify group existence
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.',
      });
    }

    // Verify requester is a member of the group
    const isMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id
      }
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be a member of the group to view balances.',
      });
    }

    const balanceResults = await calculateGroupBalances(groupId);
    const userBalanceObj = balanceResults.balances.find(b => b.userId === targetUserId);

    if (!userBalanceObj) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this group or has no calculated balance.',
      });
    }

    return res.status(200).json({
      success: true,
      balance: userBalanceObj
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGroupBalances,
  getUserBalanceSummary,
  getUserBalanceInGroup,
};
