const { convertToINR } = require('../../currency/currencyService.js');
const { isSettlementRecord } = require('../settlementDetectionService.js');
const settlementPolicy = require('../../policies/settlementPolicy.js');

/**
 * Normalises key names by stripping spaces, underscores, and hyphens.
 */
function normaliseKey(key) {
  return String(key).trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Evaluates whether a staged ImportRecord is classified as a Settlement.
 * Respects both database-recorded resolutions (CONVERT_TO_SETTLEMENT)
 * and the settlement resolution keyword policy rules.
 *
 * @param {Object} record - Staged ImportRecord database entity
 * @param {Object} prismaTx - Prisma transaction or standard client reference
 * @returns {Promise<boolean>} True if record represents a settlement, false otherwise
 */
async function isSettlement(record, prismaTx) {
  if (!record) return false;

  // 1. Check if an approved resolution specifies conversion to settlement
  if (record.anomalies && record.anomalies.length > 0) {
    const resolutions = await prismaTx.importResolution.findMany({
      where: { anomalyId: { in: record.anomalies.map(a => a.id) } }
    });
    const hasSettlementResolution = resolutions.some(
      r => r.resolutionType === 'CONVERT_TO_SETTLEMENT'
    );
    if (hasSettlementResolution) {
      return true;
    }
  }

  // 2. Check the rawData keywords using settlementDetectionService
  const raw = record.rawData || {};
  if (isSettlementRecord(raw).isSettlement) {
    return true;
  }

  // 3. Fallback evaluate using the settlementPolicy engine rules
  const policyEval = settlementPolicy.evaluate(record);
  if (policyEval && policyEval.action === 'CONVERT_TO_SETTLEMENT') {
    return true;
  }

  return false;
}

/**
 * Converts an approved staged ImportRecord into a Settlement database entity
 * in the database under the provided prisma client context.
 *
 * @param {Object} params
 * @param {Object} params.record - Staged ImportRecord database entity
 * @param {Object} params.prismaTx - Prisma transaction or standard client reference
 * @param {Map} [params.userCache] - Local caching map for username/email resolving
 * @param {Function} [params.getGroupMembers] - Callback function to fetch active group members
 * @returns {Promise<Object>} The created Settlement database record
 */
async function createSettlementFromRecord({ record, prismaTx, userCache, getGroupMembers }) {
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

  const titleVal = getVal('title') || getVal('description') || 'Imported Settlement';
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

  // 5. Resolve Participant Names to find the Receiver
  const rawParticipants = getVal('participants');
  const participantNames = rawParticipants
    ? String(rawParticipants).split(',').map(n => n.trim()).filter(Boolean)
    : [];

  const participantIds = [];
  for (const name of participantNames) {
    const id = await resolveUserId(name);
    if (id) {
      participantIds.push(id);
    }
  }

  // Payer = paidById (the user sending/paying the settlement)
  // Receiver = the first participant who is not the payer
  let receiverId = participantIds.find(id => id !== paidById);
  if (!receiverId) {
    // Fallback: If no other participant resolved, fetch a group member
    if (getGroupMembers) {
      const groupMembers = await getGroupMembers(groupIdVal);
      receiverId = groupMembers.find(id => id !== paidById);
    } else {
      const members = await prismaTx.groupMember.findMany({
        where: { groupId: groupIdVal, leftAt: null },
        select: { userId: true }
      });
      const groupMembers = members.map(m => m.userId);
      receiverId = groupMembers.find(id => id !== paidById);
    }
  }

  if (!receiverId) {
    throw new Error('A valid receiver user could not be determined for this settlement.');
  }

  // 6. Currency conversion
  const conversion = convertToINR(amountVal, currencyVal, exchangeRateVal);

  // 7. Write Settlement record to database
  const createdSettlement = await prismaTx.settlement.create({
    data: {
      groupId: groupIdVal,
      payerId: paidById,
      receiverId,
      amount: amountVal,
      currency: currencyVal,
      exchangeRate: conversion.exchangeRate,
      convertedAmount: conversion.convertedAmount,
      settlementDate: expenseDate,
      notes: descriptionVal || `Imported Settlement: ${titleVal}`
    }
  });

  return createdSettlement;
}

module.exports = {
  isSettlement,
  createSettlementFromRecord
};
