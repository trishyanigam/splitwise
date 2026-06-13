import api from './api.js';

/**
 * Sends a request to create a new group
 * @param {string} name 
 * @param {string} [description]
 */
export const createGroup = async (name, description) => {
  const response = await api.post('/groups', { name, description });
  return response.data;
};

/**
 * Retrieves all groups owned by the authenticated user
 */
export const getGroups = async () => {
  const response = await api.get('/groups');
  return response.data;
};

/**
 * Retrieves specific details of a single group by ID
 * @param {number|string} id 
 */
export const getGroupById = async (id) => {
  const response = await api.get(`/groups/${id}`);
  return response.data;
};

/**
 * Updates an existing group
 * @param {number|string} id 
 * @param {object} data 
 */
export const updateGroup = async (id, data) => {
  const response = await api.put(`/groups/${id}`, data);
  return response.data;
};

/**
 * Deletes an existing group
 * @param {number|string} id 
 */
export const deleteGroup = async (id) => {
  const response = await api.delete(`/groups/${id}`);
  return response.data;
};

/**
 * Retrieves calculated balances and simplified debt transactions for a group
 * @param {number|string} groupId 
 */
export const getGroupBalances = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/balances`);
  return response.data;
};

export default {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  getGroupBalances,
};
