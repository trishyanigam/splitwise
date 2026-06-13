const { registerUser, authenticateUser, getUserById } = require('../services/authService.js');
const { generateToken } = require('../utils/jwt.js');

/**
 * Controller handling user registration
 * Validates request input, calls auth service for hashing/database checks,
 * generates a JWT token, and returns { token, user }
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const user = await registerUser(name, email, password);
    const token = generateToken(user.id);

    // Optional: Keep cookie setting for session refresh flow
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    });

    return res.status(201).json({
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller handling user login
 * Authenticates user password hash, generates a JWT token, and returns { token, user }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required fields.',
      });
    }

    const user = await authenticateUser(email, password);
    const token = generateToken(user.id);

    // Optional: Keep cookie setting for session refresh flow
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    });

    return res.status(200).json({
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller handling user logout
 */
const logout = async (req, res, next) => {
  try {
    res.clearCookie('token');
    return res.status(200).json({
      success: true,
      message: 'Signed out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the currently logged-in user profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
