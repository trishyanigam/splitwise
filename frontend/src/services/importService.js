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

/**
 * Retrieves all anomalies for a given import session.
 *
 * @param {number|string} sessionId
 * @returns {Promise<Object>} Anomaly list and summary (response data only).
 */
export const getSessionAnomalies = async (sessionId) => {
  const response = await api.get(`/import/${sessionId}/anomalies`);
  return response.data;
};

/**
 * Updates the review status of a single anomaly.
 *
 * @param {number|string} anomalyId
 * @param {string} status - 'APPROVED' | 'REJECTED' | 'FIXED'
 * @returns {Promise<Object>} Updated anomaly record (response data only).
 */
export const updateAnomalyStatus = async (anomalyId, status) => {
  const response = await api.patch(`/import/anomalies/${anomalyId}`, { status });
  return response.data;
};

/**
 * Approves an anomaly via the review service.
 * 
 * @param {number|string} anomalyId
 * @param {string} [notes]
 * @returns {Promise<Object>} Result details (response data only).
 */
export const approveAnomaly = async (anomalyId, notes) => {
  const response = await api.post(`/review/anomalies/${anomalyId}/approve`, { notes });
  return response.data;
};

/**
 * Rejects an anomaly via the review service.
 * 
 * @param {number|string} anomalyId
 * @param {string} [notes]
 * @returns {Promise<Object>} Result details (response data only).
 */
export const rejectAnomaly = async (anomalyId, notes) => {
  const response = await api.post(`/review/anomalies/${anomalyId}/reject`, { notes });
  return response.data;
};

/**
 * Applies a manual fix to an anomaly's parent record.
 * 
 * @param {number|string} anomalyId
 * @param {Object} fixedData  - Field corrections e.g. { amount: '150', date: '2026-06-12' }
 * @param {string} [notes]
 * @returns {Promise<Object>} Result details (response data only).
 */
export const manualFixAnomaly = async (anomalyId, fixedData, notes) => {
  const response = await api.post(`/review/anomalies/${anomalyId}/manual-fix`, { fixedData, notes });
  return response.data;
};

/**
 * Merges a duplicate anomaly into a target record.
 * 
 * @param {number|string} anomalyId
 * @param {number|string} targetRecordId
 * @param {string} [notes]
 * @returns {Promise<Object>} Result details (response data only).
 */
export const mergeDuplicateAnomaly = async (anomalyId, targetRecordId, notes) => {
  const response = await api.post(`/review/anomalies/${anomalyId}/merge`, { targetRecordId, notes });
  return response.data;
};

/**
 * Resolves a duplicate record pair using a chosen strategy.
 * Calls the backend duplicateMergeService via the review controller.
 *
 * @param {Object} options
 * @param {number|string} options.originalRecordId
 * @param {number|string} options.duplicateRecordId
 * @param {string}        options.action  - KEEP_ORIGINAL | KEEP_DUPLICATE | MERGE | SKIP
 * @param {string}        [options.notes]
 * @returns {Promise<Object>} Result details (response data only).
 */
export const resolveDuplicate = async ({ originalRecordId, duplicateRecordId, action, notes }) => {
  const response = await api.post('/review/duplicates/resolve', {
    originalRecordId,
    duplicateRecordId,
    action,
    notes
  });
  return response.data;
};

/**
 * Applies a resolution strategy to a flagged anomaly.
 * Route: POST /api/import/anomalies/:id/resolve
 *
 * @param {number|string} anomalyId
 * @param {string} resolutionType
 * @param {Object} [resolvedValue]
 * @returns {Promise<Object>} The resolved anomaly (response data only).
 */
export const resolveAnomalyStrategy = async (anomalyId, resolutionType, resolvedValue) => {
  const response = await api.post(`/import/anomalies/${anomalyId}/resolve`, {
    resolutionType,
    resolvedValue
  });
  return response.data;
};

/**
 * Retrieves the full audit log of resolutions applied to an anomaly.
 * Route: GET /api/import/anomalies/:id/resolutions
 *
 * @param {number|string} anomalyId
 * @returns {Promise<Object>} List of resolution histories (response data only).
 */
export const getAnomalyResolutionHistory = async (anomalyId) => {
  const response = await api.get(`/import/anomalies/${anomalyId}/resolutions`);
  return response.data;
};

export default {
  uploadCsv,
  getImportSession,
  getImportRecords,
  uploadCsvFile,
  getImportSessionDetails,
  getSessionAnomalies,
  updateAnomalyStatus,
  approveAnomaly,
  rejectAnomaly,
  manualFixAnomaly,
  mergeDuplicateAnomaly,
  resolveDuplicate,
  resolveAnomalyStrategy,
  getAnomalyResolutionHistory
};

