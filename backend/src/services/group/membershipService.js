const prisma = require('../../config/prisma.js');

/**
 * Checks if a user was an active member of a group on a specific date.
 * Active span rule: joinedAt <= date AND (leftAt is null OR leftAt >= date)
 * @param {number} userId 
 * @param {number} groupId 
 * @param {Date|string} date 
 * @returns {Promise<boolean>}
 */
const isUserActiveOnDate = async (userId, groupId, date) => {
  const targetDate = new Date(date);
  
  if (isNaN(targetDate.getTime())) {
    throw new Error('Invalid date provided.');
  }

  const parsedUserId = parseInt(userId, 10);
  const parsedGroupId = parseInt(groupId, 10);

  if (isNaN(parsedUserId) || isNaN(parsedGroupId)) {
    throw new Error('Valid userId and groupId are required.');
  }

  // Normalize dates to calendar-day granularity (ignoring hours/minutes/seconds)
  const endOfTargetDate = new Date(targetDate);
  endOfTargetDate.setUTCHours(23, 59, 59, 999);

  const startOfTargetDate = new Date(targetDate);
  startOfTargetDate.setUTCHours(0, 0, 0, 0);

  // Look for any membership record that overlaps with the targetDate calendar day
  const matchingMembership = await prisma.groupMember.findFirst({
    where: {
      groupId: parsedGroupId,
      userId: parsedUserId,
      joinedAt: {
        lte: endOfTargetDate,
      },
      OR: [
        {
          leftAt: null,
        },
        {
          leftAt: {
            gte: startOfTargetDate,
          },
        },
      ],
    },
  });

  return matchingMembership !== null;
};

module.exports = {
  isUserActiveOnDate,
};
