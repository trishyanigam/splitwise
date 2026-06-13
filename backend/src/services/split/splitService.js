/**
 * Calculates equal split share amounts for all participants.
 * If the split amount is not perfectly divisible, distributes the remainder to the first participant.
 * 
 * @param {number|string} amount - The total expense amount
 * @param {Array<number|string>} participantIds - List of user IDs participating in the split
 * @returns {Array<Object>} List of participants with their calculated share amounts
 */
const calculateEqualSplit = (amount, participantIds) => {
  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Expense amount must be a positive number greater than 0.');
  }
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw new Error('Participant IDs must be a non-empty array.');
  }

  const N = participantIds.length;
  // Calculate base share rounded down to 2 decimal places
  const baseShare = Math.floor((parsedAmount / N) * 100) / 100;
  const calculatedSum = baseShare * N;
  const remainder = Number((parsedAmount - calculatedSum).toFixed(2));

  return participantIds.map((userId, index) => {
    // Add remainder to the first participant to ensure sum equals total amount
    const shareAmount = index === 0 
      ? Number((baseShare + remainder).toFixed(2)) 
      : baseShare;

    return {
      userId: Number(userId),
      shareAmount
    };
  });
};

/**
 * Validates exact split shares and returns the formatted share amounts.
 * Throws an error if the sum of shares does not equal the total expense amount.
 * 
 * @param {number|string} amount - The total expense amount
 * @param {Array<Object>} shares - List of participants with their user-entered shareAmount ({ userId, shareAmount })
 * @returns {Array<Object>} List of participants with their validated share amounts
 */
const calculateExactSplit = (amount, shares) => {
  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Expense amount must be a positive number greater than 0.');
  }
  if (!Array.isArray(shares) || shares.length === 0) {
    throw new Error('Shares must be a non-empty array.');
  }

  let totalSharesSum = 0;
  const formattedShares = shares.map(share => {
    const shareVal = Number(share.shareAmount);
    if (isNaN(shareVal) || shareVal < 0) {
      throw new Error('Individual share amount must be a non-negative number.');
    }
    totalSharesSum += shareVal;
    return {
      userId: Number(share.userId),
      shareAmount: Number(shareVal.toFixed(2))
    };
  });

  // Verify total matches the expense amount with epsilon comparison for float math
  if (Math.abs(totalSharesSum - parsedAmount) > 0.01) {
    throw new Error(`Total of exact shares (${totalSharesSum.toFixed(2)}) must equal the expense amount (${parsedAmount.toFixed(2)}).`);
  }

  return formattedShares;
};

/**
 * Validates percentage split allocations and calculates the corresponding share amounts.
 * Throws an error if the sum of percentages does not equal 100%.
 * If the calculated amounts don't sum up perfectly due to float division, adjusts the remainder on the first participant.
 * 
 * @param {number|string} amount - The total expense amount
 * @param {Array<Object>} percentages - List of participants with their percentage ({ userId, percentage })
 * @returns {Array<Object>} List of participants with their calculated share amounts and percentages
 */
const calculatePercentageSplit = (amount, percentages) => {
  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Expense amount must be a positive number greater than 0.');
  }
  if (!Array.isArray(percentages) || percentages.length === 0) {
    throw new Error('Percentages must be a non-empty array.');
  }

  let totalPercentage = 0;
  percentages.forEach(p => {
    const pct = Number(p.percentage);
    if (isNaN(pct) || pct < 0) {
      throw new Error('Percentage must be a non-negative number.');
    }
    totalPercentage += pct;
  });

  // Verify total percentage sums up to 100%
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Total percentage must equal 100%. Current sum: ${totalPercentage}%`);
  }

  let calculatedSum = 0;
  const calculatedShares = percentages.map(p => {
    const pct = Number(p.percentage);
    const shareAmount = Number(((parsedAmount * pct) / 100).toFixed(2));
    calculatedSum += shareAmount;

    return {
      userId: Number(p.userId),
      shareAmount,
      sharePercentage: pct
    };
  });

  // Distribute any rounding remainder to the first participant
  const remainder = Number((parsedAmount - calculatedSum).toFixed(2));
  if (remainder !== 0 && calculatedShares.length > 0) {
    calculatedShares[0].shareAmount = Number((calculatedShares[0].shareAmount + remainder).toFixed(2));
  }

  return calculatedShares;
};

module.exports = {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit
};
