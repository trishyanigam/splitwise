/**
 * Negative Amount Resolution Policy.
 *
 * Checks if a transaction amount is negative and recommends
 * converting it to a refund.
 */

const SEVERITY = 'MEDIUM';
const POLICY_NAME = 'NEGATIVE_AMOUNT';

/**
 * Checks if the given amount value is negative.
 * Handles string conversion and number format checks.
 *
 * @param {number|string} amount
 * @returns {boolean} True if amount is less than 0
 */
function isNegative(amount) {
  if (amount === undefined || amount === null || amount.toString().trim() === '') {
    return false;
  }
  const parsed = Number(amount.toString().trim().replace(/,/g, ''));
  return !isNaN(parsed) && parsed < 0;
}

/**
 * Evaluates a transaction record or anomaly for negative amount rule.
 *
 * @param {Object} context - Object containing amount to inspect (e.g. record or anomaly details)
 * @returns {Object|null} Resolution details if negative, null otherwise
 */
function evaluate(context) {
  let amount = context?.amount;

  // Attempt to resolve from importRecord relation
  if (amount === undefined && context?.importRecord?.rawData) {
    for (const [k, v] of Object.entries(context.importRecord.rawData)) {
      if (k.trim().toLowerCase().replace(/\s+/g, '') === 'amount') {
        amount = v;
        break;
      }
    }
  }

  // Attempt to resolve from direct rawData attribute
  if (amount === undefined && context?.rawData) {
    for (const [k, v] of Object.entries(context.rawData)) {
      if (k.trim().toLowerCase().replace(/\s+/g, '') === 'amount') {
        amount = v;
        break;
      }
    }
  }

  // Fallback: Parse amount from description string (e.g. 'Amount "-5.00" must be...')
  if (amount === undefined && context?.description) {
    const match = context.description.match(/Amount\s*"\s*(-?[\d.,]+)\s*"/i);
    if (match) {
      amount = match[1];
    }
  }

  if (isNegative(amount)) {
    return {
      policy: POLICY_NAME,
      severity: SEVERITY,
      ruleMatched: 'Amount < 0',
      action: 'CONVERT_TO_REFUND',
      requiresReview: true,
      suggestedResolution: 'Convert To Refund'
    };
  }

  return null;
}

module.exports = {
  POLICY_NAME,
  SEVERITY,
  isNegative,
  evaluate
};
