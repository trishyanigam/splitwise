/**
 * Settlement Detection Service for CSV Import
 * Checks if a parsed CSV row/record describes a settlement instead of a standard expense.
 */

const MATCHERS = [
  {
    pattern: /\bsettlement\b/i,
    confidence: 1.0,
    reason: "Matched settlement keyword exactly"
  },
  {
    pattern: /\bsettled\b/i,
    confidence: 0.95,
    reason: "Contains settlement-related keyword 'settled'"
  },
  {
    pattern: /\bpaid\s+back\b/i,
    confidence: 0.95,
    reason: "Contains payment reimbursement keyword 'paid back'"
  },
  {
    pattern: /\breimbursement\b/i,
    confidence: 0.95,
    reason: "Contains settlement keyword 'reimbursement'"
  },
  {
    pattern: /\breturned\s+money\b/i,
    confidence: 0.95,
    reason: "Contains settlement keyword 'returned money'"
  },
  {
    pattern: /\bsettle\b/i,
    confidence: 0.90,
    reason: "Contains settlement-related keyword 'settle'"
  },
  {
    pattern: /\bpay\s+back\b/i,
    confidence: 0.90,
    reason: "Contains payment reimbursement keyword 'pay back'"
  },
  {
    pattern: /\breimburse\b/i,
    confidence: 0.90,
    reason: "Contains settlement keyword 'reimburse'"
  },
  {
    pattern: /\breturn\s+money\b/i,
    confidence: 0.90,
    reason: "Contains settlement keyword 'return money'"
  },
  {
    pattern: /\brefund\b/i,
    confidence: 0.80,
    reason: "Contains settlement keyword 'refund'"
  }
];

/**
 * Detects if a specific text string matches any settlement keywords.
 * @param {string} text
 * @returns {object|null} Match details or null
 */
const detectText = (text) => {
  if (typeof text !== 'string') return null;

  let bestMatch = null;

  for (const matcher of MATCHERS) {
    if (matcher.pattern.test(text)) {
      if (!bestMatch || matcher.confidence > bestMatch.confidence) {
        bestMatch = {
          isSettlement: true,
          confidence: matcher.confidence,
          reason: `${matcher.reason} in text: "${text.trim()}"`
        };
      }
    }
  }

  return bestMatch;
};

/**
 * Checks if a CSV row/record is a settlement record.
 * Supports records as strings, arrays, or objects.
 * 
 * @param {string|array|object} record - The CSV row representation
 * @returns {object} Detection result containing isSettlement, confidence, and reason
 */
const isSettlementRecord = (record) => {
  if (record === null || record === undefined) {
    return {
      isSettlement: false,
      confidence: 0,
      reason: 'Record is empty or undefined'
    };
  }

  let bestMatch = null;

  const checkAndSetBestMatch = (text) => {
    const match = detectText(text);
    if (match) {
      if (!bestMatch || match.confidence > bestMatch.confidence) {
        bestMatch = match;
      }
    }
  };

  if (typeof record === 'string') {
    checkAndSetBestMatch(record);
  } else if (Array.isArray(record)) {
    for (const val of record) {
      if (val !== null && val !== undefined) {
        checkAndSetBestMatch(String(val));
      }
    }
  } else if (typeof record === 'object') {
    for (const key of Object.keys(record)) {
      const val = record[key];
      if (val !== null && val !== undefined) {
        checkAndSetBestMatch(String(val));
      }
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  return {
    isSettlement: false,
    confidence: 0,
    reason: 'No settlement keywords detected in the record fields'
  };
};

module.exports = {
  isSettlementRecord
};
