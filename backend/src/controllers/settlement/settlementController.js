const prisma = require('../../config/prisma.js');

/**
 * Creates a new settlement record in a group.
 * Expects: req.params.groupId (or req.body.groupId), req.body.payerId, req.body.receiverId,
 *          req.body.amount, req.body.currency, req.body.settlementDate, req.body.notes
 */
const createSettlement = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId || req.body.groupId, 10);
    const { payerId, receiverId, amount, currency, settlementDate, notes } = req.body;

    if (isNaN(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid groupId is required.',
      });
    }

    if (payerId === undefined || receiverId === undefined || !currency) {
      return res.status(400).json({
        success: false,
        message: 'payerId, receiverId, and currency are required fields.',
      });
    }

    const payerUserId = parseInt(payerId, 10);
    const receiverUserId = parseInt(receiverId, 10);

    if (isNaN(payerUserId) || isNaN(receiverUserId)) {
      return res.status(400).json({
        success: false,
        message: 'payerId and receiverId must be valid user IDs.',
      });
    }

    // Validation rule 1: payer and receiver must be different
    if (payerUserId === receiverUserId) {
      return res.status(400).json({
        success: false,
        message: 'Payer and receiver must be different users.',
      });
    }

    // Validation rule 2: amount > 0
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number greater than 0.',
      });
    }

    // Verify group existence
    const groupExists = await prisma.group.findUnique({
      where: { id: groupId }
    });
    if (!groupExists) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.',
      });
    }

    // Verify payer exists
    const payerExists = await prisma.user.findUnique({
      where: { id: payerUserId }
    });
    if (!payerExists) {
      return res.status(404).json({
        success: false,
        message: 'Payer user not found.',
      });
    }

    // Verify receiver exists
    const receiverExists = await prisma.user.findUnique({
      where: { id: receiverUserId }
    });
    if (!receiverExists) {
      return res.status(404).json({
        success: false,
        message: 'Receiver user not found.',
      });
    }

    // Insert settlement record
    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        payerId: payerUserId,
        receiverId: receiverUserId,
        amount: parsedAmount,
        currency,
        settlementDate: settlementDate ? new Date(settlementDate) : new Date(),
        notes: notes || null
      },
      include: {
        payer: {
          select: { id: true, name: true, email: true }
        },
        receiver: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.status(201).json({
      success: true,
      settlement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all settlements inside a group.
 * Expects: req.params.groupId (or req.query.groupId)
 */
const getSettlements = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId || req.query.groupId || req.body.groupId, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid groupId is required.',
      });
    }

    const groupExists = await prisma.group.findUnique({
      where: { id: groupId }
    });
    if (!groupExists) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.',
      });
    }

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        payer: {
          select: { id: true, name: true, email: true }
        },
        receiver: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: {
        settlementDate: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      settlements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves details of a specific settlement.
 * Expects: req.params.id (or req.params.settlementId)
 */
const getSettlementById = async (req, res, next) => {
  try {
    const settlementId = parseInt(req.params.id || req.params.settlementId, 10);
    if (isNaN(settlementId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid settlement ID is required.',
      });
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        payer: {
          select: { id: true, name: true, email: true }
        },
        receiver: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found.',
      });
    }

    return res.status(200).json({
      success: true,
      settlement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a settlement record.
 * Expects: req.params.id (or req.params.settlementId)
 */
const deleteSettlement = async (req, res, next) => {
  try {
    const settlementId = parseInt(req.params.id || req.params.settlementId, 10);
    if (isNaN(settlementId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid settlement ID is required.',
      });
    }

    const existingSettlement = await prisma.settlement.findUnique({
      where: { id: settlementId }
    });
    if (!existingSettlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found.',
      });
    }

    await prisma.settlement.delete({
      where: { id: settlementId }
    });

    return res.status(200).json({
      success: true,
      message: 'Settlement deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSettlement,
  getSettlements,
  getSettlementById,
  deleteSettlement
};
