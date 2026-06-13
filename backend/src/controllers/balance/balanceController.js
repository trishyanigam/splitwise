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

    return res.status(200).json({
      success: true,
      summary: {
        totalGroups: memberships.length,
        amountOwed: Math.round(amountOwed * 100) / 100,
        amountToReceive: Math.round(amountToReceive * 100) / 100,
        netBalance: Math.round((amountToReceive - amountOwed) * 100) / 100
      },
      groupBalances: groupBalancesList
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
