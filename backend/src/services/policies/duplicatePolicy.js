/**
 * Duplicate Resolution Policy.
 *
 * Recommends actions when a potential duplicate transaction row is flagged.
 */

const SEVERITY = 'HIGH';
const POLICY_NAME = 'DUPLICATE';

/**
 * Checks if the anomaly represents a potential duplicate row.
 *
 * @param {Object} anomaly
 * @returns {boolean} True if duplicate row anomaly type
 */
function isDuplicate(anomaly) {
  const type = (anomaly?.anomalyType || '').toUpperCase().trim();
  return type === 'DUPLICATE' || type === 'DUPLICATE_ROW';
}

/**
 * Evaluates an anomaly context for potential duplicate rules.
 *
 * @param {Object} context
 * @returns {Object|null} Resolution details if duplicate, null otherwise
 */
function evaluate(context) {
  if (isDuplicate(context)) {
    const desc = context.description || '';
    const match = desc.match(/row (\d+)/i);
    const originalRowInfo = match ? ` (matches row ${match[1]})` : '';

    return {
      policy: POLICY_NAME,
      severity: SEVERITY,
      ruleMatched: 'Potential duplicates',
      action: 'SKIP_RECORD',
      requiresReview: true,
      suggestedResolution: `Manual Approval Required${originalRowInfo}`
    };
  }

  return null;
}

module.exports = {
  POLICY_NAME,
  SEVERITY,
  isDuplicate,
  evaluate
};
