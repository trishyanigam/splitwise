import api from './api.js';

/**
 * Sends a registration request
 * @param {string} name 
 * @param {string} email 
 * @param {string} password 
 */
export const register = async (name, email, password) => {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
};

/**
 * Sends a sign-in authentication request
 * @param {string} email 
 * @param {string} password 
 */
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Clears the session on the backend (clearing HTTP-only cookies if present)
 */
export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

/**
 * Retrieves the current user details from JWT token context
 */
export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export default {
  register,
  login,
  logout,
  getMe,
};
