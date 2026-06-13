/**
 * Unknown User Resolution Policy.
 *
 * Handles scenarios where a user/payer email is not found in the system.
 */

const SEVERITY = 'HIGH';
const POLICY_NAME = 'UNKNOWN_USER';

/**
 * Checks if the anomaly represents an unknown user error.
 *
 * @param {Object} anomaly
 * @returns {boolean} True if matching type
 */
function isUnknownUser(anomaly) {
  const type = (anomaly?.anomalyType || '').toUpperCase().trim();
  return (
    type === 'UNKNOWN_USER' ||
    type === 'UNKNOWN_USER_EMAIL' ||
    type === 'MISSING_USER'
  );
}

/**
 * Evaluates an anomaly context for unknown user rules.
 *
 * @param {Object} context
 * @returns {Object|null} Resolution details if unknown user, null otherwise
 */
function evaluate(context) {
  if (isUnknownUser(context)) {
    return {
      policy: POLICY_NAME,
      severity: SEVERITY,
      ruleMatched: 'User not found',
      action: 'CREATE_SHADOW_USER',
      requiresReview: true,
      suggestedResolution: 'Manual Mapping Required'
    };
  }

  return null;
}

module.exports = {
  POLICY_NAME,
  SEVERITY,
  isUnknownUser,
  evaluate
};
