const { validateCurrencyAndRate } = require('../../utils/currencyValidator.js');

/**
 * Converts a given amount in a supported currency to INR.
 * 
 * @param {number|string} amount - The original currency amount.
 * @param {string} currency - The currency code (e.g., 'INR', 'USD').
 * @param {number|string} exchangeRate - The exchange rate to INR (required for USD conversion).
 * @returns {Object} An object containing the original amount, currency, exchange rate used, and converted amount.
 */
function convertToINR(amount, currency, exchangeRate) {
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount)) {
    throw new Error('Invalid amount provided for currency conversion');
  }

  // Use the currency validation utility to parse, validate, and normalize the values
  const validated = validateCurrencyAndRate(currency, exchangeRate);
  const normalizedCurrency = validated.currency;
  const rate = validated.exchangeRate;

  let convertedAmount = numAmount;

  if (normalizedCurrency === 'USD') {
    // Perform multiplication and round to 2 decimal places to match standard decimal(10, 2) currency representation
    convertedAmount = Math.round(numAmount * rate * 100) / 100;
  } else if (normalizedCurrency === 'INR') {
    convertedAmount = Math.round(numAmount * 100) / 100;
  }

  return {
    originalAmount: numAmount,
    currency: normalizedCurrency,
    exchangeRate: rate,
    convertedAmount: convertedAmount
  };
}

module.exports = {
  convertToINR
};
