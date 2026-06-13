const { convertToINR } = require('../currency/currencyService.js');

/**
 * Detects the currency code of an imported record.
 * 
 * @param {Object} record - The imported record object.
 * @returns {Object} `{ currency, isAnomaly, reason }`
 */
function detectCurrency(record) {
  if (!record || !record.currency) {
    return {
      currency: 'INR', // Default fallback
      isAnomaly: true,
      reason: 'Currency field is missing. Defaulted to INR.'
    };
  }

  const normalized = record.currency.toString().trim().toUpperCase();

  if (normalized === 'INR' || normalized === 'USD') {
    return {
      currency: normalized,
      isAnomaly: false,
      reason: null
    };
  }

  return {
    currency: normalized,
    isAnomaly: true,
    reason: `Unsupported currency '${record.currency}'. Only INR and USD are supported.`
  };
}

/**
 * Evaluates, validates, and converts the currency amount of an imported record to INR.
 * Flags anomalies if currency is missing, unsupported, or if USD rate is missing.
 * 
 * @param {Object} record - The imported record (expects: amount, currency, exchangeRate).
 * @returns {Object} `{ originalAmount, currency, exchangeRate, convertedAmount, isAnomaly, anomalyReason }`
 */
function convertImportedAmount(record) {
  const amount = parseFloat(record?.amount);
  
  if (isNaN(amount)) {
    return {
      originalAmount: null,
      currency: null,
      exchangeRate: null,
      convertedAmount: null,
      isAnomaly: true,
      anomalyReason: 'Invalid or missing amount in record.'
    };
  }

  const detection = detectCurrency(record);
  const currency = detection.currency;
  let isAnomaly = detection.isAnomaly;
  let anomalyReason = detection.reason;
  
  let exchangeRate = record?.exchangeRate ? parseFloat(record.exchangeRate) : null;
  let convertedAmount = null;

  if (currency === 'INR') {
    exchangeRate = 1.0;
    convertedAmount = Math.round(amount * 100) / 100;
  } else if (currency === 'USD') {
    if (exchangeRate === undefined || exchangeRate === null || isNaN(exchangeRate) || exchangeRate <= 0) {
      isAnomaly = true;
      anomalyReason = anomalyReason 
        ? `${anomalyReason} Missing or invalid exchange rate for USD.`
        : 'Missing or invalid exchange rate for USD transaction.';
      exchangeRate = null;
      convertedAmount = null;
    } else {
      convertedAmount = Math.round(amount * exchangeRate * 100) / 100;
    }
  } else {
    // Unsupported currency (other than USD/INR)
    isAnomaly = true;
    convertedAmount = null;
  }

  return {
    originalAmount: amount,
    currency,
    exchangeRate,
    convertedAmount,
    isAnomaly,
    anomalyReason
  };
}

module.exports = {
  detectCurrency,
  convertImportedAmount
};
