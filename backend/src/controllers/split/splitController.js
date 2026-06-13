const {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit
} = require('../../services/split/splitService.js');

/**
 * Preview split calculations based on amount, type, and participants.
 * Expects: req.body.amount, req.body.splitType, req.body.participants
 */
const previewSplit = (req, res, next) => {
  try {
    const { amount, splitType, participants } = req.body;

    if (amount === undefined || splitType === undefined || participants === undefined) {
      return res.status(400).json({
        success: false,
        message: 'amount, splitType, and participants are required fields.'
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number greater than 0.'
      });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'participants must be a non-empty array.'
      });
    }

    let calculatedShares = [];
    try {
      if (splitType === 'EQUAL') {
        const participantIds = participants.map(p => {
          if (typeof p === 'object' && p !== null) {
            return parseInt(p.userId, 10);
          }
          return parseInt(p, 10);
        }).filter(id => !isNaN(id));

        if (participantIds.length !== participants.length) {
          return res.status(400).json({
            success: false,
            message: 'All participants must resolve to valid user IDs.'
          });
        }
        calculatedShares = calculateEqualSplit(parsedAmount, participantIds);
      } else if (splitType === 'EXACT') {
        const shares = participants.map(p => {
          const shareVal = p.shareAmount !== undefined ? p.shareAmount : p.amount;
          return {
            userId: parseInt(p.userId, 10),
            shareAmount: parseFloat(shareVal)
          };
        });
        calculatedShares = calculateExactSplit(parsedAmount, shares);
      } else if (splitType === 'PERCENTAGE') {
        const percentages = participants.map(p => ({
          userId: parseInt(p.userId, 10),
          percentage: parseFloat(p.percentage)
        }));
        calculatedShares = calculatePercentageSplit(parsedAmount, percentages);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid splitType. Supported values are EQUAL, EXACT, or PERCENTAGE.'
        });
      }
    } catch (splitError) {
      return res.status(400).json({
        success: false,
        message: splitError.message
      });
    }

    return res.status(200).json({
      success: true,
      shares: calculatedShares
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  previewSplit
};
