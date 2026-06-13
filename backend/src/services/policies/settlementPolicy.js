/**
 * Settlement Resolution Policy.
 *
 * Checks if a transaction description or title contains settlement-like
 * keywords and suggests converting it to a settlement transaction.
 */

const SEVERITY = 'LOW';
const POLICY_NAME = 'SETTLEMENT_ROW';

const SETTLEMENT_KEYWORDS = [
  'settle',
  'payment',
  'repay',
  'paid back',
  'reimbursement',
  'repaid',
  'settled',
  'transferred'
];

/**
 * Checks if the given text contains any settlement-related keywords.
 *
 * @param {string} text
 * @returns {boolean} True if a settlement keyword is found
 */
function isSettlementLike(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  const normalised = text.toLowerCase();
  return SETTLEMENT_KEYWORDS.some((kw) => normalised.includes(kw));
}

/**
 * Evaluates a transaction record or anomaly for settlement-like descriptions.
 *
 * @param {Object} context - Object containing description/title to inspect
 * @returns {Object|null} Resolution details if settlement-like, null otherwise
 */
function evaluate(context) {
  // Try to inspect description and title fields from multiple common property shapes
  let textToInspect = '';

  const recordData = context?.importRecord?.rawData || context?.rawData || context;

  if (recordData) {
    // Collect values of keys that look like 'description' or 'title'
    for (const [k, v] of Object.entries(recordData)) {
      const normalisedKey = k.trim().toLowerCase().replace(/\s+/g, '');
      if (normalisedKey === 'description' || normalisedKey === 'title') {
        textToInspect += ' ' + String(v || '');
      }
    }
  }

  // Fallback to inspect anomaly description if no direct title/desc field resolved
  if (!textToInspect.trim() && context?.description) {
    textToInspect = context.description;
  }

  if (isSettlementLike(textToInspect)) {
    return {
      policy: POLICY_NAME,
      severity: SEVERITY,
      ruleMatched: 'Settlement-like descriptions',
      action: 'CONVERT_TO_SETTLEMENT',
      requiresReview: false,
      suggestedResolution: 'Convert To Settlement'
    };
  }

  return null;
}

module.exports = {
  POLICY_NAME,
  SEVERITY,
  SETTLEMENT_KEYWORDS,
  isSettlementLike,
  evaluate
};
