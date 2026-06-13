const { createExpenseFromRecord } = require('./expenseImportHandler.js');
const { createSettlementFromRecord } = require('./settlementImportHandler.js');
const { createRefundFromRecord } = require('./refundImportHandler.js');
const { isSettlementRecord } = require('../settlementDetectionService.js');

const RESOLUTION_MAP = {
  APPROVED: {
    description: 'User approved anomaly warning, importing as standard expense.',
    handler: createExpenseFromRecord
  },
  MERGED: {
    description: 'Duplicate record merged, row will be skipped during execution.',
    handler: null
  },
  CONVERT_TO_SETTLEMENT: {
    description: 'Imported as a Group Settlement between payer and receiver.',
    handler: createSettlementFromRecord
  },
  CONVERT_TO_REFUND: {
    description: 'Imported as a positive refund Expense with a prefix.',
    handler: createRefundFromRecord
  },
  MANUAL_CORRECTION: {
    description: 'Imported as a standard expense using manually corrected fields.',
    handler: createExpenseFromRecord
  }
};

/**
 * Maps a staged ImportRecord to its primary resolution type and execution details.
 * Prioritizes resolutions by severity/action sequence:
 * MERGED > CONVERT_TO_SETTLEMENT > CONVERT_TO_REFUND > MANUAL_CORRECTION > APPROVED
 *
 * @param {Object} record - Staged ImportRecord database entity
 * @param {Object} prismaTx - Prisma transaction or standard client reference
 * @returns {Promise<Object>} Object containing resolutionType, description, and handler function
 */
async function mapRecordResolution(record, prismaTx) {
  if (!record) {
    return {
      resolutionType: 'APPROVED',
      description: RESOLUTION_MAP.APPROVED.description,
      handler: RESOLUTION_MAP.APPROVED.handler
    };
  }

  // 1. Fetch resolutions associated with the record's anomalies
  if (record.anomalies && record.anomalies.length > 0) {
    const resolutions = await prismaTx.importResolution.findMany({
      where: { anomalyId: { in: record.anomalies.map(a => a.id) } }
    });

    if (resolutions.length > 0) {
      const priorities = [
        'APPROVED',
        'MANUAL_CORRECTION',
        'CONVERT_TO_REFUND',
        'CONVERT_TO_SETTLEMENT',
        'MERGED'
      ];

      let bestResolution = null;
      let highestPriorityIndex = -1;

      for (const res of resolutions) {
        const index = priorities.indexOf(res.resolutionType);
        if (index > highestPriorityIndex) {
          highestPriorityIndex = index;
          bestResolution = res;
        }
      }

      if (bestResolution) {
        const mapping = RESOLUTION_MAP[bestResolution.resolutionType];
        if (mapping) {
          return {
            resolutionType: bestResolution.resolutionType,
            description: mapping.description,
            handler: mapping.handler
          };
        }
      }
    }
  }

  // 2. Fallback check: If the raw keywords suggest it is a settlement
  if (isSettlementRecord(record.rawData || {}).isSettlement) {
    return {
      resolutionType: 'CONVERT_TO_SETTLEMENT',
      description: RESOLUTION_MAP.CONVERT_TO_SETTLEMENT.description,
      handler: RESOLUTION_MAP.CONVERT_TO_SETTLEMENT.handler
    };
  }

  // 3. Default fallback (no resolutions, imports as a standard expense)
  return {
    resolutionType: 'APPROVED',
    description: RESOLUTION_MAP.APPROVED.description,
    handler: RESOLUTION_MAP.APPROVED.handler
  };
}

module.exports = {
  mapRecordResolution,
  RESOLUTION_MAP
};
