const prisma = require('../../config/prisma.js');
const { calculateGroupBalances } = require('../../services/balance/balanceService.js');
const { simplifyDebts } = require('../../services/debt/debtSimplificationService.js');

/**
 * Retrieves simplified debt transactions for a specific group.
 * Expects: req.params.groupId
 */
const getSimplifiedDebts = async (req, res, next) => {
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

    // Verify requesting user is a member of the group
    const isMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id
      }
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be a member of the group to view debts.',
      });
    }

    // 1. Get group balances using balanceService
    const balanceResults = await calculateGroupBalances(groupId);
    const balances = balanceResults.balances;

    // 2. Use debtSimplificationService to simplify the debts based on net balances
    const rawTransactions = simplifyDebts(balances);

    // Fetch user details for formatting transaction list with user names
    const memberships = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    const memberMap = new Map();
    memberships.forEach(m => {
      memberMap.set(m.userId, m.user);
    });

    // 3. Format simplified transactions with user name information
    const simplifiedTransactions = rawTransactions.map(tx => {
      const fromUser = memberMap.get(tx.from);
      const toUser = memberMap.get(tx.to);
      return {
        fromUserId: tx.from,
        fromUserName: fromUser?.name || `User #${tx.from}`,
        toUserId: tx.to,
        toUserName: toUser?.name || `User #${tx.to}`,
        amount: tx.amount
      };
    });

    // 4. Return response with simplified transactions list
    return res.status(200).json({
      success: true,
      simplifiedDebts: simplifiedTransactions
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSimplifiedDebts
};
