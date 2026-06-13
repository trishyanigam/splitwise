import api from './api.js';

/**
 * Adds a user as a member to a group
 * @param {number|string} groupId 
 * @param {number|string} userId 
 * @param {Date|string} [joinedAt]
 */
export const addMember = async (groupId, userId, joinedAt) => {
  const response = await api.post(`/groups/${groupId}/members`, { 
    userId: parseInt(userId, 10),
    joinedAt: joinedAt ? new Date(joinedAt).toISOString() : undefined
  });
  return response.data;
};

/**
 * Marks a member as left (removes them from active list)
 * @param {number|string} groupId 
 * @param {number|string} memberId 
 */
export const removeMember = async (groupId, memberId) => {
  const response = await api.put(`/groups/${groupId}/members/${memberId}/leave`);
  return response.data;
};

/**
 * Fetches all active members of a group
 * @param {number|string} groupId 
 */
export const getMembers = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/members`);
  return response.data;
};

/**
 * Fetches full membership history logs for a group
 * @param {number|string} groupId 
 */
export const getMembershipHistory = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/members/history`);
  return response.data;
};

export default {
  addMember,
  removeMember,
  getMembers,
  getMembershipHistory,
};
