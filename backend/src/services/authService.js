const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma.js');

/**
 * Registers a new user
 * @param {string} name 
 * @param {string} email 
 * @param {string} password 
 * @returns {object} Created User object (excluding password hash)
 */
const registerUser = async (name, email, password) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 400;
    throw error;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user in database
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return user;
};

/**
 * Authenticates a user with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {object} Authenticated User object (excluding password hash)
 */
const authenticateUser = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Compare password hash
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Return user details without the sensitive password hash
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Gets a user profile by ID
 * @param {number} id 
 * @returns {object} User profile (excluding password hash)
 */
const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/**
 * Retrieves all registered users (safe fields only — no password hashes).
 * Used by the Add Member dialog to populate the user search dropdown.
 *
 * @returns {Array<{ id, name, email, createdAt }>}
 */
const getAllUsers = async () => {
  return prisma.user.findMany({
    select: {
      id:        true,
      name:      true,
      email:     true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
};

/**
 * Updates a user profile
 * @param {number} id 
 * @param {string} name 
 * @param {string} email 
 * @param {string} newPassword 
 * @returns {object} Updated User object (excluding password hash)
 */
const updateUserProfile = async (id, name, email, newPassword) => {
  const parsedId = parseInt(id, 10);
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists for another user
  const emailUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (emailUser && emailUser.id !== parsedId) {
    const error = new Error('Email is already in use by another account');
    error.statusCode = 400;
    throw error;
  }

  const updateData = {
    name: name.trim(),
    email: normalizedEmail,
  };

  if (newPassword && newPassword.trim() !== '') {
    const salt = await bcrypt.genSalt(10);
    updateData.passwordHash = await bcrypt.hash(newPassword, salt);
  }

  const updatedUser = await prisma.user.update({
    where: { id: parsedId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return updatedUser;
};

module.exports = {
  registerUser,
  authenticateUser,
  getUserById,
  getAllUsers,
  updateUserProfile,
};
