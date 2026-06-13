import api from './api.js';

/**
 * Creates a new settlement in a group.
 * @param {string|number} groupId - The ID of the group
 * @param {Object} data - The settlement payload (payerId, receiverId, amount, currency, settlementDate, notes)
 * @returns {Promise<Object>} The response data from the API
 */
export const createSettlement = async (groupId, data) => {
  const response = await api.post(`/groups/${groupId}/settlements`, data);
  return response.data;
};

/**
 * Retrieves all settlements for a group.
 * @param {string|number} groupId - The ID of the group
 * @returns {Promise<Object>} The settlements list data
 */
export const getSettlements = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/settlements`);
  return response.data;
};

/**
 * Retrieves details of a specific settlement.
 * @param {string|number} groupId - The ID of the group
 * @param {string|number} id - The ID of the settlement
 * @returns {Promise<Object>} The settlement details data
 */
export const getSettlementById = async (groupId, id) => {
  const response = await api.get(`/groups/${groupId}/settlements/${id}`);
  return response.data;
};

/**
 * Deletes a specific settlement.
 * @param {string|number} groupId - The ID of the group
 * @param {string|number} id - The ID of the settlement to delete
 * @returns {Promise<Object>} The API response data
 */
export const deleteSettlement = async (groupId, id) => {
  const response = await api.delete(`/groups/${groupId}/settlements/${id}`);
  return response.data;
};

export default {
  createSettlement,
  getSettlements,
  getSettlementById,
  deleteSettlement,
};
