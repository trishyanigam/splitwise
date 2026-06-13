import api from './api.js';

/**
 * Uploads a CSV file to the staging import system.
 * 
 * @param {File} file - The CSV file object.
 * @param {Function} [onUploadProgress] - Optional progress callback.
 * @returns {Promise<Object>} The staging session details (response data only).
 */
export const uploadCsv = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/import/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      }
    }
  });

  return response.data;
};

/**
 * Retrieves details of a specific staging import session.
 * 
 * @param {number|string} sessionId 
 * @returns {Promise<Object>} Import session details (response data only).
 */
export const getImportSession = async (sessionId) => {
  const response = await api.get(`/import/${sessionId}`);
  return response.data;
};

/**
 * Retrieves staged records for an import session.
 * 
 * @param {number|string} sessionId 
 * @returns {Promise<Object>} Staged import records (response data only).
 */
export const getImportRecords = async (sessionId) => {
  const response = await api.get(`/import/${sessionId}/records`);
  return response.data;
};

// Aliases for compatibility with current page imports
export const uploadCsvFile = uploadCsv;
export const getImportSessionDetails = getImportSession;

export default {
  uploadCsv,
  getImportSession,
  getImportRecords,
  uploadCsvFile,
  getImportSessionDetails
};
