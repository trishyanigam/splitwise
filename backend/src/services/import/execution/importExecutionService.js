const prisma = require('../../../config/prisma.js');
const { mapRecordResolution } = require('./resolutionMapper.js');
const { assertImportReady } = require('./readinessValidator.js');

/**
 * Executes the import of records for a staged import session.
 * Loads valid/approved records, skips rejected/invalid records, resolves users,
 * creates business entities (expenses or settlements), and records progress.
 *
 * @param {number|string} importSessionId - Staging session ID
 * @returns {Promise<Object>} Execution summary details
 */
async function executeImport(importSessionId) {
  const sessionId = parseInt(importSessionId, 10);
  if (isNaN(sessionId)) {
    throw new Error('Valid importSessionId is required.');
  }

  // Gate execution behind readiness validation — throws with structured
  // blockingIssues if any rule is violated.
  await assertImportReady(sessionId);

  // 1. Fetch import session with its records
  const session = await prisma.importSession.findUnique({
    where: { id: sessionId },
    include: {
      records: {
        include: {
          anomalies: true
        }
      }
    }
  });

  if (!session) {
    throw new Error(`Import session #${sessionId} not found.`);
  }

  // 2. Create the ImportExecution record to track progress
  const execution = await prisma.importExecution.create({
    data: {
      importSessionId: sessionId,
      executionStatus: 'RUNNING',
      startedAt: new Date()
    }
  });

  const totalRecords = session.records.length;
  let importedRecords = 0;
  let skippedRecords = 0;
  let failedRecords = 0;

  // Local caching map to reduce DB lookup roundtrips for usernames
  const userCache = new Map();
  const resolveUserId = async (name) => {
    if (!name || typeof name !== 'string') return null;
    const key = name.trim().toLowerCase();
    if (userCache.has(key)) return userCache.get(key);

    let user = await prisma.user.findFirst({
      where: { name: name.trim() },
      select: { id: true }
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: name.trim().toLowerCase() },
        select: { id: true }
      });
    }

    const id = user ? user.id : null;
    userCache.set(key, id);
    return id;
  };

  // Cache group memberships
  const groupMembersCache = new Map();
  const getGroupMembers = async (groupId) => {
    if (groupMembersCache.has(groupId)) return groupMembersCache.get(groupId);

    const members = await prisma.groupMember.findMany({
      where: { groupId, leftAt: null },
      select: { userId: true }
    });

    const ids = members.map(m => m.userId);
    groupMembersCache.set(groupId, ids);
    return ids;
  };

  // 3. Process each staged ImportRecord
  for (const record of session.records) {
    try {
      // Requirements 2: Ignore rejected/invalid records
      if (record.status === 'INVALID') {
        skippedRecords++;
        continue;
      }

      if (record.status !== 'VALID') {
        // Any record that isn't fully marked VALID/resolved is skipped
        skippedRecords++;
        continue;
      }

      // Requirement 1 & 3: Load approved/resolved records
      const raw = record.rawData || {};

      // Helper function to extract field values in a case-insensitive manner, ignoring spaces, underscores, and dashes
      const getVal = (field) => {
        const target = field.toLowerCase().replace(/[\s_-]+/g, '');
        const match = Object.keys(raw).find(
          k => k.trim().toLowerCase().replace(/[\s_-]+/g, '') === target
        );
        return match ? raw[match] : undefined;
      };

      const mapping = await mapRecordResolution(record, prisma);

      if (mapping.handler) {
        await mapping.handler({
          record,
          prismaTx: prisma,
          userCache,
          getGroupMembers
        });
        importedRecords++;
      } else {
        skippedRecords++;
      }
    } catch (recordError) {
      console.error(`Import execution failure at row #${record.rowNumber || 'unknown'}:`, recordError);
      failedRecords++;
    }
  }

  // 4. Update the execution record to track progress
  const finalStatus = failedRecords > 0 && importedRecords === 0 ? 'FAILED' : 'COMPLETED';

  const updatedExecution = await prisma.importExecution.update({
    where: { id: execution.id },
    data: {
      totalRecords,
      importedRecords,
      skippedRecords,
      failedRecords,
      executionStatus: finalStatus,
      completedAt: new Date()
    }
  });

  // 5. Update session status to COMPLETED if any records were imported
  if (importedRecords > 0) {
    await prisma.importSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED' }
    });
  }

  // Requirement 6: Return summary
  return {
    executionId: updatedExecution.id,
    importSessionId: sessionId,
    totalRecords,
    importedRecords,
    skippedRecords,
    failedRecords,
    status: updatedExecution.executionStatus,
    startedAt: updatedExecution.startedAt,
    completedAt: updatedExecution.completedAt
  };
}

module.exports = {
  executeImport
};
