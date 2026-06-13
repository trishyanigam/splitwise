const prisma = require('../../config/prisma.js');
const membershipService = require('../group/membershipService.js');

/**
 * Traces split and share calculations for a specific expense.
 * 
 * @param {number} expenseId - The ID of the expense to trace.
 * @returns {Promise<Object>} An audit trace report containing expense details, participants, split info, and calculations.
 */
async function traceExpense(expenseId) {
  const parsedExpenseId = parseInt(expenseId, 10);
  if (isNaN(parsedExpenseId)) {
    throw new Error('Valid expenseId must be provided.');
  }

  // 1. Fetch expense with details, paidBy user, and participants
  const expense = await prisma.expense.findUnique({
    where: { id: parsedExpenseId },
    include: {
      paidBy: {
        select: { id: true, name: true, email: true }
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });

  if (!expense) {
    throw new Error('Expense not found.');
  }

  const expenseDate = new Date(expense.expenseDate);
  const rawTotal = parseFloat(expense.amount);
  const convertedTotal = parseFloat(expense.convertedAmount || expense.amount || 0);
  const currency = expense.currency;

  // 2. Fetch and evaluate active status of each participant on the transaction date
  const participantTraces = [];
  const activeParticipants = [];

  for (const part of expense.participants) {
    const isActive = await membershipService.isUserActiveOnDate(part.userId, expense.groupId, expenseDate);
    const trace = {
      userId: part.userId,
      userName: part.user?.name || `User #${part.userId}`,
      userEmail: part.user?.email || '',
      rawInputShare: {
        shareAmount: part.shareAmount ? parseFloat(part.shareAmount) : null,
        sharePercentage: part.sharePercentage ? parseFloat(part.sharePercentage) : null
      },
      isActiveOnDate: isActive
    };

    participantTraces.push(trace);
    if (isActive) {
      activeParticipants.push(part);
    }
  }

  // 3. Compute calculations for active participants
  const shareCalculations = [];
  let calculatedSum = 0;

  for (const part of activeParticipants) {
    let calculatedShare = 0;
    let calculatedShareINR = 0;
    let calculationFormula = '';

    if (expense.splitType === 'EQUAL') {
      calculatedShare = rawTotal / activeParticipants.length;
      calculatedShareINR = convertedTotal / activeParticipants.length;
      calculationFormula = `EQUAL split: Total of ${rawTotal.toFixed(2)} ${currency} divided equally among ${activeParticipants.length} active participants.`;
    } else if (expense.splitType === 'EXACT') {
      calculatedShare = parseFloat(part.shareAmount || 0);
      calculatedShareINR = (calculatedShare / rawTotal) * convertedTotal;
      calculationFormula = `EXACT split: Participant exact share specified as ${calculatedShare.toFixed(2)} ${currency} of the total ${rawTotal.toFixed(2)} ${currency}.`;
    } else if (expense.splitType === 'PERCENTAGE') {
      const pct = parseFloat(part.sharePercentage || 0);
      calculatedShare = (pct / 100.0) * rawTotal;
      calculatedShareINR = (pct / 100.0) * convertedTotal;
      calculationFormula = `PERCENTAGE split: Participant share calculated as ${pct.toFixed(2)}% of the total ${rawTotal.toFixed(2)} ${currency}.`;
    }

    calculatedSum += calculatedShare;

    shareCalculations.push({
      userId: part.userId,
      userName: part.user?.name || `User #${part.userId}`,
      calculatedShare: Math.round(calculatedShare * 100) / 100,
      calculatedShareINR: Math.round(calculatedShareINR * 100) / 100,
      calculationFormula
    });
  }

  // 4. Build output report
  return {
    expenseDetails: {
      id: expense.id,
      groupId: expense.groupId,
      title: expense.title,
      description: expense.description,
      amount: rawTotal,
      currency: currency,
      exchangeRate: expense.exchangeRate ? parseFloat(expense.exchangeRate) : null,
      convertedAmount: convertedTotal,
      expenseDate: expense.expenseDate,
      paidBy: {
        id: expense.paidBy?.id,
        name: expense.paidBy?.name,
        email: expense.paidBy?.email
      },
      createdAt: expense.createdAt
    },
    participants: participantTraces,
    splitInformation: {
      splitType: expense.splitType,
      totalParticipantsCount: expense.participants.length,
      activeParticipantsCount: activeParticipants.length,
      sumOfCalculatedShares: Math.round(calculatedSum * 100) / 100,
      discrepancy: Math.round((rawTotal - calculatedSum) * 100) / 100
    },
    shareCalculations
  };
}

module.exports = {
  traceExpense
};
