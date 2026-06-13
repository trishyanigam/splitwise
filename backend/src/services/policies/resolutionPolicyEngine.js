/**
 * Resolution Policy Engine for CSV Import Anomalies.
 * Matches anomalies to predefined policies and recommends resolutions.
 */

// ─── Individual Policy Handlers ──────────────────────────────────────────────

const duplicatePolicy = require('./duplicatePolicy.js');

const negativeAmountPolicy = require('./negativeAmountPolicy.js');
const settlementRowPolicy = require('./settlementPolicy.js');

const unknownUserPolicy = require('./unknownUserPolicy.js');

/**
 * Policy for invalid date formats.
 * Suggests defaulting or manual input.
 */
const invalidDatePolicy = {
  name: 'INVALID_DATE',
  evaluate(anomaly) {
    return {
      action: 'USE_CURRENT_DATE',
      requiresReview: true,
      suggestedResolution: 'Default the transaction date to today (or the import session date), or manually provide a valid YYYY-MM-DD date.'
    };
  }
};

/**
 * Policy for transactions involving users not active in the split group.
 * Suggests adding user to group or filtering split.
 */
const membershipViolationPolicy = {
  name: 'MEMBERSHIP_VIOLATION',
  evaluate(anomaly) {
    return {
      action: 'ADD_TO_GROUP',
      requiresReview: true,
      suggestedResolution: 'Add the participant to the group before importing this transaction, or exclude their share from the split calculations.'
    };
  }
};

// ─── Policy Registry and Mapping ─────────────────────────────────────────────

const POLICIES = {
  [duplicatePolicy.POLICY_NAME]: duplicatePolicy,
  [negativeAmountPolicy.POLICY_NAME]: negativeAmountPolicy,
  [settlementRowPolicy.POLICY_NAME]: settlementRowPolicy,
  [unknownUserPolicy.POLICY_NAME]: unknownUserPolicy,
  [invalidDatePolicy.name]: invalidDatePolicy,
  [membershipViolationPolicy.name]: membershipViolationPolicy
};

/**
 * Maps DB anomaly types to their corresponding Policy engine name.
 * Handles normalisation between database types and policies.
 */
function mapAnomalyToPolicyName(anomaly) {
  const type = (anomaly.anomalyType || '').toUpperCase().trim();

  // Direct exact policy matches
  if (POLICIES[type]) return type;

  // DB anomaly type mapped representations
  switch (type) {
    case 'DUPLICATE_ROW':
      return 'DUPLICATE';
    case 'INVALID_AMOUNT_VALUE':
      // Check if value is negative (e.g. desc contains negative indicator or amount starts with '-')
      const desc = (anomaly.description || '').toLowerCase();
      if (desc.includes('negative') || desc.includes('less than zero') || desc.includes('amount "-"')) {
        return 'NEGATIVE_AMOUNT';
      }
      return 'NEGATIVE_AMOUNT'; // default value issue mapping
    case 'INVALID_DATE_FORMAT':
    case 'FUTURE_DATE':
      return 'INVALID_DATE';
    case 'UNKNOWN_USER_EMAIL':
    case 'MISSING_USER':
      return 'UNKNOWN_USER';
    case 'GROUP_MEMBERSHIP_ERROR':
    case 'INACTIVE_MEMBER_SPLIT':
      return 'MEMBERSHIP_VIOLATION';
    case 'SETTLEMENT_KEYWORDS_DETECTED':
      return 'SETTLEMENT_ROW';
    default:
      return null;
  }
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Resolves an anomaly using registered policies.
 * Analyzes the anomaly properties and returns suggested actions.
 *
 * @param {Object} anomaly - Staged anomaly record containing anomalyType, description, etc.
 * @returns {Object} { action: string, requiresReview: boolean, suggestedResolution: string }
 */
function resolveAnomaly(anomaly) {
  if (!anomaly) {
    return {
      action: 'NO_ACTION',
      requiresReview: false,
      suggestedResolution: 'No anomaly provided.'
    };
  }

  // 1. Determine policy mapping
  const policyName = mapAnomalyToPolicyName(anomaly);
  const policy = POLICIES[policyName];

  // 2. Evaluate using the matched policy
  if (policy) {
    return policy.evaluate(anomaly);
  }

  // 3. Fallback for unmatched/unknown anomalies
  return {
    action: 'MANUAL_REVIEW',
    requiresReview: true,
    suggestedResolution: anomaly.suggestedAction || 'Please manually review this flagged transaction record and apply appropriate corrections.'
  };
}

module.exports = {
  resolveAnomaly,
  POLICIES
};
