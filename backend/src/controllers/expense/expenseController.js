const prisma = require('../../config/prisma.js');
const {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit
} = require('../../services/split/splitService.js');
const { convertToINR } = require('../../services/currency/currencyService.js');

/**
 * Creates a new expense in a group.
 * Expects: req.params.groupId (or req.body.groupId), req.body.title, req.body.description,
 *          req.body.amount, req.body.currency, req.body.expenseDate, req.body.paidBy,
 *          req.body.splitType, req.body.participants (or legacy participantIds)
 */
const createExpense = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId || req.body.groupId, 10);
    const { 
      title, 
      description, 
      amount, 
      currency, 
      exchangeRate,
      expenseDate, 
      paidBy, 
      splitType = 'EQUAL', 
      participants,
      participantIds 
    } = req.body;

    if (isNaN(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid groupId is required.',
      });
    }

    if (!title || !currency || paidBy === undefined) {
      return res.status(400).json({
        success: false,
        message: 'title, currency, and paidBy are required fields.',
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

    // Validate amount > 0
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number greater than 0.',
      });
    }

    // Validate paidBy payer exists
    const paidById = parseInt(paidBy, 10);
    if (isNaN(paidById)) {
      return res.status(400).json({
        success: false,
        message: 'A valid paidBy userId is required.',
      });
    }
    const payerExists = await prisma.user.findUnique({
      where: { id: paidById }
    });
    if (!payerExists) {
      return res.status(404).json({
        success: false,
        message: 'Payer user (paidBy) not found.',
      });
    }

    // Resolve participants (supports legacy participantIds array)
    const targetParticipants = participants || participantIds;
    if (!Array.isArray(targetParticipants) || targetParticipants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'participants must be a non-empty array.',
      });
    }

    // Extract unique user IDs for verification
    const uniqueUserIds = [...new Set(targetParticipants.map(p => {
      if (typeof p === 'object' && p !== null) {
        return parseInt(p.userId, 10);
      }
      return parseInt(p, 10);
    }).filter(id => !isNaN(id)))];

    if (uniqueUserIds.length === 0 || uniqueUserIds.length !== targetParticipants.length) {
      return res.status(400).json({
        success: false,
        message: 'participants must contain unique and valid user IDs.',
      });
    }

    // Verify all participant users exist
    const existingParticipants = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true }
    });
    if (existingParticipants.length !== uniqueUserIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more participant users not found.',
      });
    }

    // Execute split calculations and allocations based on type
    let calculatedShares = [];
    try {
      if (splitType === 'EQUAL') {
        calculatedShares = calculateEqualSplit(parsedAmount, uniqueUserIds);
      } else if (splitType === 'EXACT') {
        const shares = targetParticipants.map(p => ({
          userId: parseInt(p.userId, 10),
          shareAmount: parseFloat(p.shareAmount !== undefined ? p.shareAmount : p.amount)
        }));
        calculatedShares = calculateExactSplit(parsedAmount, shares);
      } else if (splitType === 'PERCENTAGE') {
        const percentages = targetParticipants.map(p => ({
          userId: parseInt(p.userId, 10),
          percentage: parseFloat(p.percentage)
        }));
        calculatedShares = calculatePercentageSplit(parsedAmount, percentages);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid splitType. Supported values are EQUAL, EXACT, or PERCENTAGE.',
        });
      }
    } catch (splitError) {
      return res.status(400).json({
        success: false,
        message: splitError.message,
      });
    }

    // Perform currency conversion to INR
    let conversionResult;
    try {
      conversionResult = convertToINR(parsedAmount, currency, exchangeRate);
    } catch (conversionError) {
      return res.status(400).json({
        success: false,
        message: conversionError.message,
      });
    }

    const { convertedAmount, exchangeRate: finalExchangeRate } = conversionResult;

    // Create the expense record and corresponding participant share allocations inside database
    const expense = await prisma.expense.create({
      data: {
        groupId,
        title,
        description,
        amount: parsedAmount,
        currency,
        exchangeRate: finalExchangeRate,
        convertedAmount,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paidById,
        splitType,
        participants: {
          create: calculatedShares.map(share => ({
            userId: share.userId,
            shareAmount: share.shareAmount,
            sharePercentage: share.sharePercentage !== undefined ? share.sharePercentage : null
          }))
        }
      },
      include: {
        paidBy: {
          select: { id: true, name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Retrieves all expenses inside a group.
 * Expects: req.params.groupId (or req.query.groupId)
 */
const getExpenses = async (req, res, next) => {
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

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: {
          select: { id: true, name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: {
        expenseDate: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single expense by ID.
 * Expects: req.params.id (or req.params.expenseId)
 */
const getExpenseById = async (req, res, next) => {
  try {
    const expenseId = parseInt(req.params.id || req.params.expenseId, 10);
    if (isNaN(expenseId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid expense ID is required.',
      });
    }

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        paidBy: {
          select: { id: true, name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found.',
      });
    }

    return res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing expense.
 * Expects: req.params.id (or req.params.expenseId), optional req.body fields
 */
const updateExpense = async (req, res, next) => {
  try {
    const expenseId = parseInt(req.params.id || req.params.expenseId, 10);
    if (isNaN(expenseId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid expense ID is required.',
      });
    }

    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });
    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found.',
      });
    }

    const { title, description, amount, currency, expenseDate, paidBy, participantIds } = req.body;

    let parsedAmount = existingExpense.amount;
    if (amount !== undefined) {
      parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number greater than 0.',
        });
      }
    }

    let paidById = existingExpense.paidById;
    if (paidBy !== undefined) {
      paidById = parseInt(paidBy, 10);
      if (isNaN(paidById)) {
        return res.status(400).json({
          success: false,
          message: 'A valid paidBy userId is required.',
        });
      }
      const payerExists = await prisma.user.findUnique({
        where: { id: paidById }
      });
      if (!payerExists) {
        return res.status(404).json({
          success: false,
          message: 'Payer user (paidBy) not found.',
        });
      }
    }

    let uniqueParticipantIds = null;
    if (participantIds !== undefined) {
      if (!Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'participantIds must be a non-empty array.',
        });
      }
      uniqueParticipantIds = [...new Set(participantIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)))];
      if (uniqueParticipantIds.length !== participantIds.length) {
        return res.status(400).json({
          success: false,
          message: 'participantIds must contain valid numbers.',
        });
      }
      const existingParticipants = await prisma.user.findMany({
        where: { id: { in: uniqueParticipantIds } },
        select: { id: true }
      });
      if (existingParticipants.length !== uniqueParticipantIds.length) {
        return res.status(404).json({
          success: false,
          message: 'One or more participant users not found.',
        });
      }
    }

    // Execute database changes in transaction to synchronize participants
    const updatedExpense = await prisma.$transaction(async (tx) => {
      if (uniqueParticipantIds) {
        await tx.expenseParticipant.deleteMany({
          where: { expenseId }
        });
      }

      return await tx.expense.update({
        where: { id: expenseId },
        data: {
          title: title !== undefined ? title : undefined,
          description: description !== undefined ? description : undefined,
          amount: parsedAmount,
          currency: currency !== undefined ? currency : undefined,
          expenseDate: expenseDate ? new Date(expenseDate) : undefined,
          paidById,
          participants: uniqueParticipantIds ? {
            create: uniqueParticipantIds.map(userId => ({ userId }))
          } : undefined
        },
        include: {
          paidBy: {
            select: { id: true, name: true, email: true }
          },
          participants: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });
    });

    return res.status(200).json({
      success: true,
      expense: updatedExpense,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes an expense.
 * Expects: req.params.id (or req.params.expenseId)
 */
const deleteExpense = async (req, res, next) => {
  try {
    const expenseId = parseInt(req.params.id || req.params.expenseId, 10);
    if (isNaN(expenseId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid expense ID is required.',
      });
    }

    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });
    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found.',
      });
    }

    await prisma.expense.delete({
      where: { id: expenseId }
    });

    return res.status(200).json({
      success: true,
      message: 'Expense deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
