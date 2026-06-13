import api from './api.js';

/**
 * Retrieves calculated balances and simplified debt transactions for a specific group.
 * @param {number|string} groupId 
 * @returns {Promise<Object>} The API response data
 */
export const getGroupBalances = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/balances`);
  return response.data;
};

/**
 * Retrieves overall balance summary for the authenticated user across all groups they belong to.
 * @returns {Promise<Object>} The API response data
 */
export const getUserSummary = async () => {
  const response = await api.get('/groups/balances/summary');
  return response.data;
};

/**
 * Retrieves optimized/simplified debt transactions for a specific group.
 * @param {number|string} groupId 
 * @returns {Promise<Object>} The API response data
 */
export const getSimplifiedDebts = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/simplified-debts`);
  return response.data;
};

export default {
  getGroupBalances,
  getUserSummary,
  getSimplifiedDebts,
};
