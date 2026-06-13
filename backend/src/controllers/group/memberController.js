const prisma = require('../../config/prisma.js');

/**
 * Adds a user to a group's active members list.
 * Expects: req.params.groupId (or req.body.groupId), req.body.userId, and optional req.body.joinedAt
 */
const addMember = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId || req.body.groupId, 10);
    const userId = parseInt(req.body.userId, 10);
    const joinedAt = req.body.joinedAt ? new Date(req.body.joinedAt) : new Date();

    if (isNaN(groupId) || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid groupId and userId are required fields.',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    // Verify group existence and check that the authenticated user is the owner
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.',
      });
    }

    if (group.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the group owner can add members.',
      });
    }

    // Verify that the target user to add exists in database
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found.',
      });
    }

    // Check if user is already an active member of this group
    const activeMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        leftAt: null
      }
    });

    if (activeMembership) {
      return res.status(400).json({
        success: false,
        message: 'User is already an active member of this group.',
      });
    }

    // Create new membership history record
    const memberRecord = await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        joinedAt,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      member: memberRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Removes a member from a group (sets leftAt; never deletes).
 * Expects: req.params.groupId (or req.body.groupId), req.params.userId (or req.body.userId)
 */
const removeMember = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId || req.body.groupId, 10);
    const userId = parseInt(req.params.memberId || req.params.userId || req.body.userId, 10);

    if (isNaN(groupId) || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid groupId and userId are required fields.',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    // Verify group existence and owner authorization
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.',
      });
    }

    if (group.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the group owner can remove members.',
      });
    }

    // Prevent owner from being removed as a member to keep group consistency
    if (userId === group.ownerId) {
      return res.status(400).json({
        success: false,
        message: 'Access denied. The group owner cannot be removed from the group.',
      });
    }

    // Find active membership record
    const activeMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        leftAt: null
      }
    });

    if (!activeMembership) {
      return res.status(404).json({
        success: false,
        message: 'User is not currently an active member of this group.',
      });
    }

    // Update leftAt timestamp instead of deleting
    const updatedMembership = await prisma.groupMember.update({
      where: { id: activeMembership.id },
      data: {
        leftAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      member: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all active members of a group.
 * Expects: req.params.groupId
 */
const getMembers = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid groupId is required.',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    // Verify group existence
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.',
      });
    }

    // Verify that the requesting user is either the owner or an active member
    const isOwner = group.ownerId === req.user.id;
    const activeMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id,
        leftAt: null
      }
    });

    if (!isOwner && !activeMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this group.',
      });
    }

    // Retrieve active members
    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
        leftAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    });

    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves full membership history for a group.
 * Expects: req.params.groupId
 */
const getMembershipHistory = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid groupId is required.',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    // Verify group existence
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.',
      });
    }

    // Verify requesting user is the owner or has a historical/active membership in the group
    const isOwner = group.ownerId === req.user.id;
    const hasMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.id
      }
    });

    if (!isOwner && !hasMembership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this group\'s history.',
      });
    }

    // Retrieve full membership records
    const history = await prisma.groupMember.findMany({
      where: {
        groupId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addMember,
  removeMember,
  getMembers,
  getMembershipHistory,
};
