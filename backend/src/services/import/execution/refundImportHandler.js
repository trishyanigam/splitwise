const { createExpenseFromRecord } = require('./expenseImportHandler.js');

/**
 * Evaluates whether a staged ImportRecord is classified as a Refund.
 * Checks for a database-recorded CONVERT_TO_REFUND resolution.
 *
 * @param {Object} record - Staged ImportRecord database entity
 * @param {Object} prismaTx - Prisma transaction or standard client reference
 * @returns {Promise<boolean>} True if record represents a refund, false otherwise
 */
async function isRefund(record, prismaTx) {
  if (!record) return false;

  // Check if an approved resolution specifies conversion to refund
  if (record.anomalies && record.anomalies.length > 0) {
    const resolutions = await prismaTx.importResolution.findMany({
      where: { anomalyId: { in: record.anomalies.map(a => a.id) } }
    });
    const hasRefundResolution = resolutions.some(
      r => r.resolutionType === 'CONVERT_TO_REFUND'
    );
    if (hasRefundResolution) {
      return true;
    }
  }

  return false;
}

/**
 * Converts a negative amount import record resolved as a refund into a positive Expense entity.
 * Automatically prefixes the expense title with "[REFUND] ".
 *
 * @param {Object} params
 * @param {Object} params.record - Staged ImportRecord database entity
 * @param {Object} params.prismaTx - Prisma transaction or standard client reference
 * @param {Map} [params.userCache] - Local caching map for username/email resolving
 * @param {Function} [params.getGroupMembers] - Callback function to fetch active group members
 * @returns {Promise<Object>} The created Expense database record
 */
async function createRefundFromRecord({ record, prismaTx, userCache, getGroupMembers }) {
  // Create copies to prevent mutating the original record object in memory
  const rawDataCopy = { ...(record.rawData || {}) };

  // 1. Ensure the amount is positive (absolute value)
  let amountKey = 'amount';
  let originalAmount = 0;
  for (const [k, v] of Object.entries(rawDataCopy)) {
    if (k.trim().toLowerCase().replace(/[\s_-]+/g, '') === 'amount') {
      originalAmount = parseFloat(String(v).replace(/,/g, ''));
      amountKey = k;
      break;
    }
  }
  rawDataCopy[amountKey] = String(Math.abs(originalAmount || 0));

  // 2. Prefix title with "[REFUND] " to distinguish it in the ledger
  let titleKey = 'title';
  let originalTitle = '';
  for (const [k, v] of Object.entries(rawDataCopy)) {
    if (k.trim().toLowerCase().replace(/[\s_-]+/g, '') === 'title') {
      originalTitle = String(v || '');
      titleKey = k;
      break;
    }
  }

  if (originalTitle && !originalTitle.toUpperCase().startsWith('[REFUND]')) {
    rawDataCopy[titleKey] = `[REFUND] ${originalTitle}`;
  } else if (!originalTitle) {
    rawDataCopy[titleKey] = '[REFUND] Imported Refund';
  }

  const modifiedRecord = {
    ...record,
    rawData: rawDataCopy
  };

  // 3. Delegate to the standard expense import handler to create the business entity
  return await createExpenseFromRecord({
    record: modifiedRecord,
    prismaTx,
    userCache,
    getGroupMembers
  });
}

module.exports = {
  isRefund,
  createRefundFromRecord
};
