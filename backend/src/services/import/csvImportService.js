const prisma = require('../../config/prisma.js');
const csv = require('csv-parser');
const fs = require('fs');

/**
 * Creates a staging import session for tracked uploaded files.
 * 
 * @param {number} uploadedById - The ID of the uploading user.
 * @param {string} originalFileName - The original name of the uploaded CSV.
 * @returns {Promise<Object>} Created ImportSession database record.
 */
async function createImportSession(uploadedById, originalFileName) {
  const parsedUserId = parseInt(uploadedById, 10);
  if (isNaN(parsedUserId)) {
    throw new Error('Valid uploadedById must be provided.');
  }

  return await prisma.importSession.create({
    data: {
      uploadedById: parsedUserId,
      originalFileName,
      status: 'PENDING',
      totalRows: 0
    }
  });
}

/**
 * Parses all rows of a local CSV file into raw JSON objects.
 * 
 * @param {string} filePath - Absolute path to the local CSV file.
 * @returns {Promise<Array<Object>>} List of parsed rows.
 */
function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Saves raw CSV records associated with an import session and updates session summary.
 * 
 * @param {number} importSessionId - The ID of the import session.
 * @param {Array<Object>} rows - Raw parsed row objects.
 * @returns {Promise<Object>} Summary object { importSessionId, totalRows, status }
 */
async function saveImportRecords(importSessionId, rows) {
  const parsedSessionId = parseInt(importSessionId, 10);
  if (isNaN(parsedSessionId)) {
    throw new Error('Valid importSessionId must be provided.');
  }

  // Map rows to ImportRecord staging schema structure
  const records = rows.map((row, index) => ({
    importSessionId: parsedSessionId,
    rowNumber: index + 1,
    rawData: row, // MySQL native JSON support will serialize this correctly
    status: 'PENDING'
  }));

  // Batch insert all records using createMany for efficiency
  if (records.length > 0) {
    await prisma.importRecord.createMany({
      data: records
    });
  }

  // Update session totalRows and status to PROCESSING
  const updatedSession = await prisma.importSession.update({
    where: { id: parsedSessionId },
    data: {
      totalRows: rows.length,
      status: 'PROCESSING'
    }
  });

  return {
    importSessionId: parsedSessionId,
    totalRows: rows.length,
    status: updatedSession.status
  };
}

module.exports = {
  createImportSession,
  parseCsvFile,
  saveImportRecords
};
