const prisma = require('../../config/prisma.js');

/**
 * Creates a new expense in a group.
 * Expects: req.params.groupId (or req.body.groupId), req.body.title, req.body.description,
 *          req.body.amount, req.body.currency, req.body.expenseDate, req.body.paidBy, req.body.participantIds
 */
const createExpense = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId || req.body.groupId, 10);
    const { title, description, amount, currency, expenseDate, paidBy, participantIds } = req.body;

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

    // Validate participantIds array
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'participantIds must be a non-empty array of user IDs.',
      });
    }
    
    const uniqueParticipantIds = [...new Set(participantIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)))];
    if (uniqueParticipantIds.length !== participantIds.length) {
      return res.status(400).json({
        success: false,
        message: 'participantIds must contain valid numbers.',
      });
    }

    // Verify participant users exist
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

    // Create the expense and its participants link rows
    const expense = await prisma.expense.create({
      data: {
        groupId,
        title,
        description,
        amount: parsedAmount,
        currency,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paidById,
        participants: {
          create: uniqueParticipantIds.map(userId => ({ userId }))
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
