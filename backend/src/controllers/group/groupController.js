const prisma = require('../../config/prisma.js');

/**
 * Controller handling creation of a new group.
 *
 * Uses a Prisma interactive transaction to atomically:
 *   1. Create the Group record.
 *   2. Create a GroupMember record for the owner (joinedAt = now).
 *
 * If either write fails the entire transaction is rolled back, ensuring
 * no group is created without an owner membership or vice versa.
 */
const createGroup = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required and must be a valid string.',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    const group = await prisma.$transaction(async (tx) => {
      // Step 1: Create the group
      const newGroup = await tx.group.create({
        data: {
          name:        name.trim(),
          description: description && typeof description === 'string'
            ? description.trim()
            : null,
          ownerId: req.user.id,
        },
      });

      // Step 2: Auto-enrol the owner as the first group member
      await tx.groupMember.create({
        data: {
          groupId:  newGroup.id,
          userId:   req.user.id,
          joinedAt: new Date(),
        },
      });

      return newGroup;
    });

    return res.status(201).json({
      success: true,
      group,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all groups owned by the authenticated user
 */
const getGroups = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    const groups = await prisma.group.findMany({
      where: {
        ownerId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single group by ID
 * Validates group exists and belongs to the authenticated user
 */
const getGroupById = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format.',
      });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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
        message: 'Access denied. You are not the owner of this group.',
      });
    }

    return res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing group
 * Validates existence, ownership, and new input fields
 */
const updateGroup = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format.',
      });
    }

    const { name, description } = req.body;

    // First retrieve group to verify existence and check ownership
    const group = await prisma.group.findUnique({
      where: { id: groupId },
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
        message: 'Access denied. You are not the owner of this group.',
      });
    }

    // Validate optional update fields if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Group name must be a valid, non-empty string.',
        });
      }
    }

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description && typeof description === 'string' ? description.trim() : null;
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      group: updatedGroup,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a group by ID
 * Validates group exists and belongs to the authenticated user
 */
const deleteGroup = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User authentication is required.',
      });
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format.',
      });
    }

    // Retrieve group to check existence and ownership
    const group = await prisma.group.findUnique({
      where: { id: groupId },
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
        message: 'Access denied. You are not the owner of this group.',
      });
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    return res.status(200).json({
      success: true,
      message: 'Group deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
};
