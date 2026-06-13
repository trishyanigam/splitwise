const prisma = require('../../config/prisma.js');
const { executeImport: runImportService } = require('../../services/import/execution/importExecutionService.js');

/**
 * Endpoint to trigger execution of a staged import session.
 * Commits approved valid staged records (Expenses or Settlements) to the main ledger.
 *
 * Route: POST /api/import/:sessionId/execute
 */
const executeImport = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId parameter is required.'
      });
    }

    // 1. Fetch import session and verify existence
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Import session not found.'
      });
    }

    // 2. Authorize request (only the session creator can execute it)
    if (session.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to execute this import session.'
      });
    }

    // 3. Prevent execution of already completed or currently running sessions
    const completedExecution = await prisma.importExecution.findFirst({
      where: {
        importSessionId: sessionId,
        executionStatus: 'COMPLETED'
      }
    });

    if (completedExecution) {
      return res.status(400).json({
        success: false,
        message: 'This import session has already been completed.'
      });
    }

    const runningExecution = await prisma.importExecution.findFirst({
      where: {
        importSessionId: sessionId,
        executionStatus: 'RUNNING'
      }
    });

    if (runningExecution) {
      return res.status(409).json({
        success: false,
        message: 'An execution is already running for this import session.',
        executionId: runningExecution.id
      });
    }

    // 4. Run the import execution pipeline
    console.log(`Starting import execution for session #${sessionId}...`);
    const summary = await runImportService(sessionId);

    return res.status(200).json({
      success: true,
      message: 'Import execution completed.',
      summary
    });
  } catch (error) {
    // Surface structured readiness failures as 422 Unprocessable Entity
    if (error.code === 'IMPORT_NOT_READY') {
      return res.status(422).json({
        success: false,
        message: 'Import session is not ready to execute.',
        blockingIssues: error.blockingIssues
      });
    }
    next(error);
  }
};

/**
 * Endpoint to retrieve the latest execution status/progress for a session.
 *
 * Route: GET /api/import/:sessionId/execution
 */
const getExecutionStatus = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId parameter is required.'
      });
    }

    // 1. Fetch import session and verify existence
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Import session not found.'
      });
    }

    // 2. Authorize request
    if (session.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view execution details for this session.'
      });
    }

    // 3. Get the latest execution summary
    const execution = await prisma.importExecution.findFirst({
      where: { importSessionId: sessionId },
      orderBy: { startedAt: 'desc' }
    });

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'No execution records found for this import session.'
      });
    }

    return res.status(200).json({
      success: true,
      execution
    });
  } catch (error) {
    next(error);
  }
};
const { validateImportReadiness } = require('../../services/import/execution/readinessValidator.js');

/**
 * Endpoint to pre-flight check whether a session is ready for execution.
 *
 * Route: GET /api/import/:sessionId/readiness
 */
const getReadinessStatus = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId parameter is required.'
      });
    }

    // Authorization: only the session owner may check readiness
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      select: { uploadedById: true }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Import session not found.' });
    }

    if (session.uploadedById !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { ready, blockingIssues } = await validateImportReadiness(sessionId);

    return res.status(200).json({
      success: true,
      ready,
      blockingIssues
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  executeImport,
  getExecutionStatus,
  getReadinessStatus
};
