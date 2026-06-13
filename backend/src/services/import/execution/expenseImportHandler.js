const { convertToINR } = require('../../currency/currencyService.js');
const { 
  calculateEqualSplit, 
  calculateExactSplit, 
  calculatePercentageSplit 
} = require('../../split/splitService.js');

/**
 * Normalises key names by stripping spaces, underscores, and hyphens.
 */
function normaliseKey(key) {
  return String(key).trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Converts an approved staged ImportRecord into an Expense and its ExpenseParticipants
 * in the database under the provided prisma client context.
 *
 * @param {Object} params
 * @param {Object} params.record - Staged ImportRecord database entity
 * @param {Object} params.prismaTx - Prisma transaction or standard client reference
 * @param {Map} [params.userCache] - Local caching map for username/email resolving
 * @param {Function} [params.getGroupMembers] - Callback function to fetch active group members
 * @returns {Promise<Object>} The created Expense database record including its participants
 */
async function createExpenseFromRecord({ record, prismaTx, userCache, getGroupMembers }) {
  const raw = record.rawData || {};

  // Case-insensitive, space/underscore/dash-insensitive value retriever
  const getVal = (field) => {
    const target = field.toLowerCase().replace(/[\s_-]+/g, '');
    const match = Object.keys(raw).find(
      k => k.trim().toLowerCase().replace(/[\s_-]+/g, '') === target
    );
    return match ? raw[match] : undefined;
  };

  // 1. Resolve Group ID
  const groupIdVal = parseInt(getVal('groupid') || getVal('groupId'), 10);
  if (isNaN(groupIdVal)) {
    throw new Error('Missing or invalid Group ID.');
  }

  // 2. Resolve Amount
  const amountVal = parseFloat(getVal('amount'));
  if (isNaN(amountVal) || amountVal <= 0) {
    throw new Error('Amount must be a positive non-zero number.');
  }

  // 3. Resolve basic transaction attributes
  const currencyVal = (getVal('currency') || 'INR').toUpperCase();
  const dateVal = getVal('date') || getVal('expenseDate') || new Date();
  const expenseDate = new Date(dateVal);
  if (isNaN(expenseDate.getTime())) {
    throw new Error('Invalid transaction date format.');
  }

  const titleVal = getVal('title') || getVal('description') || 'Imported Expense';
  const descriptionVal = getVal('description') || '';
  
  const rawExchangeRate = getVal('exchangerate') || getVal('exchangeRate');
  const exchangeRateVal = currencyVal === 'USD' ? (parseFloat(rawExchangeRate) || 80.0) : 1.0;

  // 4. Resolve Payer User ID
  const paidByVal = getVal('paidby') || getVal('paidBy');
  if (!paidByVal) {
    throw new Error('Payer field (paidby) is missing.');
  }

  const resolveUserId = async (name) => {
    if (!name || typeof name !== 'string') return null;
    const key = name.trim().toLowerCase();
    if (userCache && userCache.has(key)) return userCache.get(key);

    let user = await prismaTx.user.findFirst({
      where: { name: name.trim() },
      select: { id: true }
    });

    if (!user) {
      user = await prismaTx.user.findUnique({
        where: { email: name.trim().toLowerCase() },
        select: { id: true }
      });
    }

    const id = user ? user.id : null;
    if (userCache && id) {
      userCache.set(key, id);
    }
    return id;
  };

  const paidById = await resolveUserId(String(paidByVal));
  if (!paidById) {
    throw new Error(`Payer "${paidByVal}" could not be resolved to a registered user.`);
  }

  // 5. Parse participant names and extract custom share/percentage values (e.g. "Alice:30, Bob:70" or "Alice=50")
  const rawParticipants = getVal('participants');
  const participantNames = [];
  const allocations = new Map(); // Lowercase name/email -> number value (share or percentage)

  if (rawParticipants) {
    const parts = String(rawParticipants).split(',').map(n => n.trim()).filter(Boolean);
    for (const part of parts) {
      const match = part.match(/^([^:=]+)[:=](.+)$/);
      if (match) {
        const name = match[1].trim();
        const value = parseFloat(match[2].trim());
        if (!isNaN(value)) {
          participantNames.push(name);
          allocations.set(name.toLowerCase(), value);
        } else {
          participantNames.push(part);
        }
      } else {
        participantNames.push(part);
      }
    }
  }

  // Fallback: scan raw fields for user-specific columns (e.g., column "Alice" or "Alice_share")
  for (const name of participantNames) {
    const key = name.toLowerCase();
    if (!allocations.has(key)) {
      const possibleKeys = [
        name,
        `${name}share`,
        `${name}amount`,
        `${name}percentage`,
        `${name}percent`,
        `${name}pct`
      ];
      let foundValue = null;
      for (const pk of possibleKeys) {
        const val = getVal(pk);
        if (val !== undefined && val !== null && val !== '') {
          const num = parseFloat(String(val).replace(/,/g, ''));
          if (!isNaN(num)) {
            foundValue = num;
            break;
          }
        }
      }
      if (foundValue !== null) {
        allocations.set(key, foundValue);
      }
    }
  }

  // Resolve user IDs and final allocation mappings
  const resolvedParticipants = [];
  for (const name of participantNames) {
    const userId = await resolveUserId(name);
    if (!userId) {
      throw new Error(`Participant "${name}" could not be resolved to a registered user.`);
    }

    let val = allocations.get(name.toLowerCase());
    if (val === undefined) {
      // Look up by resolved user details
      const user = await prismaTx.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });
      if (user) {
        val = allocations.get(user.name.toLowerCase()) || allocations.get(user.email.toLowerCase());
      }
    }

    resolvedParticipants.push({ userId, name, value: val });
  }

  // Determine split type (EQUAL, EXACT, PERCENTAGE)
  const rawSplitType = getVal('splittype') || getVal('splitType') || 'EQUAL';
  const splitType = rawSplitType.toUpperCase();

  // Determine final participant IDs to split among
  let finalParticipantIds = resolvedParticipants.map(rp => rp.userId);
  if (finalParticipantIds.length === 0) {
    if (getGroupMembers) {
      finalParticipantIds = await getGroupMembers(groupIdVal);
    } else {
      const members = await prismaTx.groupMember.findMany({
        where: { groupId: groupIdVal, leftAt: null },
        select: { userId: true }
      });
      finalParticipantIds = members.map(m => m.userId);
    }
  }

  if (finalParticipantIds.length === 0) {
    finalParticipantIds = [paidById];
  }

  // 6. Calculate splits based on Type
  let calculatedShares = [];
  if (splitType === 'EQUAL') {
    calculatedShares = calculateEqualSplit(amountVal, finalParticipantIds);
  } else if (splitType === 'EXACT') {
    const sharesInput = resolvedParticipants.map(rp => {
      if (rp.value === undefined || rp.value === null) {
        throw new Error(`Exact split share amount is missing for participant "${rp.name}".`);
      }
      return { userId: rp.userId, shareAmount: rp.value };
    });
    calculatedShares = calculateExactSplit(amountVal, sharesInput);
  } else if (splitType === 'PERCENTAGE') {
    const percentagesInput = resolvedParticipants.map(rp => {
      if (rp.value === undefined || rp.value === null) {
        throw new Error(`Percentage split value is missing for participant "${rp.name}".`);
      }
      return { userId: rp.userId, percentage: rp.value };
    });
    calculatedShares = calculatePercentageSplit(amountVal, percentagesInput);
  } else {
    throw new Error(`Unsupported splitType "${splitType}". Must be one of EQUAL, EXACT, or PERCENTAGE.`);
  }

  // 7. Currency conversion
  const conversion = convertToINR(amountVal, currencyVal, exchangeRateVal);

  // 8. Write Expense record to database
  const createdExpense = await prismaTx.expense.create({
    data: {
      groupId: groupIdVal,
      title: titleVal,
      description: descriptionVal || null,
      amount: amountVal,
      currency: currencyVal,
      exchangeRate: conversion.exchangeRate,
      convertedAmount: conversion.convertedAmount,
      expenseDate,
      paidById,
      splitType,
      participants: {
        create: calculatedShares.map(share => ({
          userId: share.userId,
          shareAmount: share.shareAmount,
          sharePercentage: splitType === 'PERCENTAGE' ? share.sharePercentage : null
        }))
      }
    },
    include: {
      participants: true
    }
  });

  return createdExpense;
}

module.exports = {
  createExpenseFromRecord
};
