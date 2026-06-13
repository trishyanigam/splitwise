import api from './api.js';

/**
 * Creates a new expense in a group.
 * @param {string|number} groupId - The ID of the group
 * @param {Object} data - The expense data (title, description, amount, currency, expenseDate, paidBy, participantIds)
 * @returns {Promise<Object>} The response data from the API
 */
export const createExpense = async (groupId, data) => {
  const response = await api.post(`/groups/${groupId}/expenses`, data);
  return response.data;
};

/**
 * Retrieves all expenses for a group.
 * @param {string|number} groupId - The ID of the group
 * @returns {Promise<Array>} List of expenses
 */
export const getExpenses = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/expenses`);
  return response.data;
};

/**
 * Retrieves details of a specific expense.
 * @param {string|number} groupId - The ID of the group
 * @param {string|number} expenseId - The ID of the expense
 * @returns {Promise<Object>} The expense details
 */
export const getExpenseById = async (groupId, expenseId) => {
  const response = await api.get(`/groups/${groupId}/expenses/${expenseId}`);
  return response.data;
};

/**
 * Updates a specific expense.
 * @param {string|number} groupId - The ID of the group
 * @param {string|number} expenseId - The ID of the expense to update
 * @param {Object} data - Updated expense data
 * @returns {Promise<Object>} The updated expense data from the API
 */
export const updateExpense = async (groupId, expenseId, data) => {
  const response = await api.put(`/groups/${groupId}/expenses/${expenseId}`, data);
  return response.data;
};

/**
 * Deletes a specific expense.
 * @param {string|number} groupId - The ID of the group
 * @param {string|number} expenseId - The ID of the expense to delete
 * @returns {Promise<Object>} The API response data
 */
export const deleteExpense = async (groupId, expenseId) => {
  const response = await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
  return response.data;
};

export default {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
