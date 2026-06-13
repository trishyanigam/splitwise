const prisma = require('../../config/prisma.js');
const auditService = require('../../services/audit/auditService.js');

/**
 * Retrieves the user's detailed balance breakdown and audit report.
 * Expects: req.params.groupId, req.params.userId
 */
const getBalanceBreakdown = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId || req.query.groupId || req.body.groupId, 10);
    const userId = parseInt(req.params.userId || req.query.userId || req.body.userId, 10);

    if (isNaN(groupId) || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid groupId and userId parameters are required.'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.'
      });
    }

    // Verify group existence
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.'
      });
    }

    // Verify requesting user is authorized (is group owner or is a member of the group)
    const isOwner = group.ownerId === req.user.id;
    const requestingUserMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id,
        leftAt: null
      }
    });

    if (!isOwner && !requestingUserMembership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an active member of this group.'
      });
    }

    // Fetch the audit report from the auditService
    const report = await auditService.getUserBalanceBreakdown(groupId, userId);

    return res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    if (error.message && error.message.includes('not a member of')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

const expenseTraceService = require('../../services/audit/expenseTraceService.js');

/**
 * Retrieves the trace calculations for a specific expense.
 * Expects: req.params.expenseId
 */
const getExpenseTrace = async (req, res, next) => {
  try {
    const expenseId = parseInt(req.params.expenseId, 10);
    if (isNaN(expenseId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid expenseId parameter is required.'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.'
      });
    }

    // Retrieve trace report from service
    const traceReport = await expenseTraceService.traceExpense(expenseId);

    // Verify requesting user is authorized (is group member or group owner)
    const requestingUserMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: traceReport.expenseDetails.groupId,
        userId: req.user.id,
        leftAt: null
      }
    });

    const group = await prisma.group.findUnique({
      where: { id: traceReport.expenseDetails.groupId }
    });

    const isOwner = group && group.ownerId === req.user.id;

    if (!isOwner && !requestingUserMembership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an active member of the group associated with this expense.'
      });
    }

    return res.status(200).json({
      success: true,
      traceReport
    });
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

module.exports = {
  getBalanceBreakdown,
  getExpenseTrace
};
