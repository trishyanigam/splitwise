const prisma = require('../../config/prisma.js');
const membershipService = require('../group/membershipService.js');
const { simplifyDebts } = require('../debt/debtSimplificationService.js');

/**
 * Checks if a user is active in the group on a specific transaction date.
 * 
 * @param {Object} member - The GroupMember record.
 * @param {Date} date - The transaction date to evaluate.
 * @returns {boolean} True if active, false otherwise.
 */
function isMemberActiveOnDate(member, date) {
  if (!member) return false;
  const txDate = new Date(date);
  const joinDate = new Date(member.joinedAt);
  
  if (joinDate > txDate) return false;
  
  if (member.leftAt) {
    const leaveDate = new Date(member.leftAt);
    if (leaveDate < txDate) return false;
  }
  
  return true;
}



/**
 * Computes net balances and simplified debt transactions for all members in a group.
 * Follows a strict 5-step implementation using Prisma.
 * 
 * @param {number} groupId - The ID of the group.
 * @returns {Object} `{ balances: Array, simplifiedDebts: Array }`
 */
async function calculateGroupBalances(groupId) {
  // Step 1: Fetch expenses
  const expenses = await prisma.expense.findMany({
    where: { groupId }
  });

  // Step 2: Fetch participants (group membership history and expense participants)
  const memberships = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  const expenseParticipants = await prisma.expenseParticipant.findMany({
    where: {
      expense: {
        groupId: groupId
      }
    }
  });

  // Step 3: Fetch settlements
  const settlements = await prisma.settlement.findMany({
    where: { groupId }
  });

  // Step 4: Build ledger
  const memberMap = new Map();
  memberships.forEach(m => {
    memberMap.set(m.userId, m);
  });

  const participantsByExpense = new Map();
  expenseParticipants.forEach(part => {
    if (!participantsByExpense.has(part.expenseId)) {
      participantsByExpense.set(part.expenseId, []);
    }
    participantsByExpense.get(part.expenseId).push(part);
  });

  // Initialize net balances for all group members
  const netBalances = {};
  memberships.forEach(m => {
    netBalances[m.userId] = 0.0;
  });

  // Process expenses
  for (const exp of expenses) {
    const expenseDate = new Date(exp.expenseDate);
    const payerId = exp.paidById;
    
    // Check if payer is active on transaction date
    const isPayerActive = await membershipService.isUserActiveOnDate(payerId, groupId, expenseDate);
    
    // Get converted amount (INR equivalent)
    const convertedTotal = parseFloat(exp.convertedAmount || exp.amount);
    
    // Get all participants for this expense
    const participants = participantsByExpense.get(exp.id) || [];
    
    // Filter to only active participants on the expense date using membershipService
    const activeParticipants = [];
    for (const part of participants) {
      const isActive = await membershipService.isUserActiveOnDate(part.userId, groupId, expenseDate);
      if (isActive) {
        activeParticipants.push(part);
      }
    }

    if (activeParticipants.length === 0) {
      continue; // No active participants to share this expense
    }

    // Add total paid to payer's credit balance (if payer was active)
    if (isPayerActive) {
      netBalances[payerId] = (netBalances[payerId] || 0.0) + convertedTotal;
    }

    // Subtract owed share from each active participant's balance
    activeParticipants.forEach(part => {
      let partShareINR = 0.0;
      if (exp.splitType === 'EQUAL') {
        partShareINR = convertedTotal / activeParticipants.length;
      } else if (exp.splitType === 'EXACT') {
        const shareAmt = parseFloat(part.shareAmount || 0);
        const totalAmt = parseFloat(exp.amount) || 1.0;
        partShareINR = (shareAmt / totalAmt) * convertedTotal;
      } else if (exp.splitType === 'PERCENTAGE') {
        const pct = parseFloat(part.sharePercentage || 0);
        partShareINR = (pct / 100.0) * convertedTotal;
      }
      
      netBalances[part.userId] = (netBalances[part.userId] || 0.0) - partShareINR;
    });
  }

  // Process settlements (applied after expense calculations)
  for (const settle of settlements) {
    const settleDate = new Date(settle.settlementDate);
    const payerId = settle.payerId;
    const receiverId = settle.receiverId;
    
    const isPayerActive = await membershipService.isUserActiveOnDate(payerId, groupId, settleDate);
    const isReceiverActive = await membershipService.isUserActiveOnDate(receiverId, groupId, settleDate);

    // Use convertedAmount (representing the settlement amount converted to INR)
    const convertedSettle = Number(settle.convertedAmount || settle.amount || 0);

    // Only apply settlement if both participants were active on that date
    if (isPayerActive && isReceiverActive) {
      // Payer balance increases (settles their debt)
      netBalances[payerId] = (netBalances[payerId] || 0.0) + convertedSettle;
      
      // Receiver balance decreases (records received amount)
      netBalances[receiverId] = (netBalances[receiverId] || 0.0) - convertedSettle;
    }
  }

  // Step 5: Return net balances
  const balancesList = Object.keys(netBalances).map(userId => {
    const id = parseInt(userId, 10);
    const memberObj = memberMap.get(id);
    return {
      userId: id,
      userName: memberObj?.user?.name || `User #${id}`,
      userEmail: memberObj?.user?.email || '',
      balance: Math.round(netBalances[userId] * 100) / 100
    };
  });

  const simplifiedDebtsList = simplifyDebts(balancesList);

  return {
    balances: balancesList,
    simplifiedDebts: simplifiedDebtsList.map(tx => {
      const fromMember = memberMap.get(tx.from);
      const toMember = memberMap.get(tx.to);
      return {
        fromUserId: tx.from,
        fromUserName: fromMember?.user?.name || `User #${tx.from}`,
        toUserId: tx.to,
        toUserName: toMember?.user?.name || `User #${tx.to}`,
        amount: tx.amount
      };
    })
  };
}

/**
 * Calculates a specific user's balance summary in a group.
 * 
 * @param {number} groupId 
 * @param {number} userId 
 * @returns {Promise<Object>} `{ owes, receivable, netBalance }`
 */
async function getUserBalanceSummary(groupId, userId) {
  const parsedGroupId = parseInt(groupId, 10);
  const parsedUserId = parseInt(userId, 10);

  if (isNaN(parsedGroupId) || isNaN(parsedUserId)) {
    throw new Error('Valid groupId and userId must be provided.');
  }

  // Get full balances and simplified debts for the group
  const { balances, simplifiedDebts } = await calculateGroupBalances(parsedGroupId);

  // Find user's net balance
  const userBalanceObj = balances.find(b => b.userId === parsedUserId);
  const netBalance = userBalanceObj ? userBalanceObj.balance : 0.0;

  // Calculate total user owes to others
  const owes = simplifiedDebts
    .filter(d => d.fromUserId === parsedUserId)
    .reduce((sum, d) => sum + d.amount, 0.0);

  // Calculate total others owe to this user
  const receivable = simplifiedDebts
    .filter(d => d.toUserId === parsedUserId)
    .reduce((sum, d) => sum + d.amount, 0.0);

  return {
    owes: Math.round(owes * 100) / 100,
    receivable: Math.round(receivable * 100) / 100,
    netBalance: Math.round(netBalance * 100) / 100
  };
}

module.exports = {
  isMemberActiveOnDate,
  simplifyDebts,
  calculateGroupBalances,
  getUserBalanceSummary
};
