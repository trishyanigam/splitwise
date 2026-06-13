const prisma = require('../../config/prisma.js');
const membershipService = require('../group/membershipService.js');

/**
 * Retrieves the user's detailed balance breakdown and audit trail for a specific group.
 * 
 * @param {number} groupId - The ID of the group.
 * @param {number} userId - The ID of the user to audit.
 * @returns {Promise<Object>} The audit breakdown containing expenses, settlements, totalExpenseShare, and finalBalance.
 */
async function getUserBalanceBreakdown(groupId, userId) {
  const parsedGroupId = parseInt(groupId, 10);
  const parsedUserId = parseInt(userId, 10);

  if (isNaN(parsedGroupId) || isNaN(parsedUserId)) {
    throw new Error('Valid groupId and userId must be provided.');
  }

  // 1. Fetch group members to verify membership and map IDs to names
  const memberships = await prisma.groupMember.findMany({
    where: { groupId: parsedGroupId },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  const memberMap = new Map();
  memberships.forEach(m => {
    memberMap.set(m.userId, m);
  });

  if (!memberMap.has(parsedUserId)) {
    throw new Error('User is not a member of the specified group.');
  }

  // 2. Fetch expenses in the group where the user was either the payer OR participant
  const expenses = await prisma.expense.findMany({
    where: {
      groupId: parsedGroupId,
      OR: [
        { paidById: parsedUserId },
        {
          participants: {
            some: { userId: parsedUserId }
          }
        }
      ]
    },
    include: {
      participants: true
    },
    orderBy: {
      expenseDate: 'asc'
    }
  });

  // 3. Fetch settlements in the group where the user was either payer OR receiver
  const settlements = await prisma.settlement.findMany({
    where: {
      groupId: parsedGroupId,
      OR: [
        { payerId: parsedUserId },
        { receiverId: parsedUserId }
      ]
    },
    include: {
      payer: {
        select: { id: true, name: true }
      },
      receiver: {
        select: { id: true, name: true }
      }
    },
    orderBy: {
      settlementDate: 'asc'
    }
  });

  // 4. Calculate expense shares and user details
  const auditedExpenses = [];
  let totalExpenseShareSum = 0;
  let totalPaidSum = 0;

  for (const exp of expenses) {
    const expenseDate = new Date(exp.expenseDate);
    const convertedTotal = parseFloat(exp.convertedAmount || exp.amount || 0);

    // Filter participants active on the date of this expense
    const activeParticipants = [];
    for (const part of exp.participants) {
      const isActive = await membershipService.isUserActiveOnDate(part.userId, parsedGroupId, expenseDate);
      if (isActive) {
        activeParticipants.push(part);
      }
    }

    const isUserActiveParticipant = activeParticipants.some(p => p.userId === parsedUserId);
    const isPayerActive = await membershipService.isUserActiveOnDate(exp.paidById, parsedGroupId, expenseDate);

    // Calculate share amount
    let shareAmount = 0;
    if (isUserActiveParticipant) {
      const participantRecord = activeParticipants.find(p => p.userId === parsedUserId);
      if (exp.splitType === 'EQUAL') {
        shareAmount = convertedTotal / activeParticipants.length;
      } else if (exp.splitType === 'EXACT') {
        const shareAmt = parseFloat(participantRecord?.shareAmount || 0);
        const totalAmt = parseFloat(exp.amount) || 1.0;
        shareAmount = (shareAmt / totalAmt) * convertedTotal;
      } else if (exp.splitType === 'PERCENTAGE') {
        const pct = parseFloat(participantRecord?.sharePercentage || 0);
        shareAmount = (pct / 100.0) * convertedTotal;
      }
    }

    // Determine amount paid by audited user
    let amountPaid = 0;
    if (exp.paidById === parsedUserId && isPayerActive) {
      amountPaid = convertedTotal;
    }

    totalExpenseShareSum += shareAmount;
    totalPaidSum += amountPaid;

    auditedExpenses.push({
      expenseId: exp.id,
      title: exp.title,
      amount: convertedTotal, // Total amount of the expense (converted)
      shareAmount: Math.round(shareAmount * 100) / 100,
      expenseDate: exp.expenseDate
    });
  }

  // 5. Calculate settlements details
  const auditedSettlements = [];
  let totalSettlementsSum = 0;

  for (const settle of settlements) {
    const settleDate = new Date(settle.settlementDate);
    const isPayerActive = await membershipService.isUserActiveOnDate(settle.payerId, parsedGroupId, settleDate);
    const isReceiverActive = await membershipService.isUserActiveOnDate(settle.receiverId, parsedGroupId, settleDate);

    if (!isPayerActive || !isReceiverActive) {
      continue;
    }

    const convertedAmt = parseFloat(settle.convertedAmount || settle.amount || 0);
    const isPayer = settle.payerId === parsedUserId;
    const netChange = isPayer ? convertedAmt : -convertedAmt;

    totalSettlementsSum += netChange;

    auditedSettlements.push({
      settlementId: settle.id,
      amount: Math.round(convertedAmt * 100) / 100,
      settlementDate: settle.settlementDate,
      effect: isPayer ? 'CREDIT' : 'DEBIT'
    });
  }

  // Final user balance calculation: total paid - total share + net settlements
  const finalBalance = totalPaidSum - totalExpenseShareSum + totalSettlementsSum;

  return {
    expenses: auditedExpenses,
    settlements: auditedSettlements,
    totalExpenseShare: Math.round(totalExpenseShareSum * 100) / 100,
    totalSettlements: Math.round(totalSettlementsSum * 100) / 100,
    finalBalance: Math.round(finalBalance * 100) / 100
  };
}

module.exports = {
  getUserBalanceBreakdown
};
