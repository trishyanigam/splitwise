/**
 * Validates the currency and exchange rate.
 * 
 * @param {string} currency - The currency code (e.g. 'INR', 'USD').
 * @param {number|string} [exchangeRate] - The exchange rate to INR.
 * @returns {Object} An object containing the validated/normalized currency and exchangeRate.
 * @throws {Error} Throws a validation error if currency is unsupported or exchange rate is missing/invalid.
 */
function validateCurrencyAndRate(currency, exchangeRate) {
  if (!currency) {
    throw new Error('Currency is required.');
  }

  const normalizedCurrency = currency.toUpperCase();

  if (normalizedCurrency === 'INR') {
    return {
      currency: 'INR',
      exchangeRate: 1.0,
    };
  }

  if (normalizedCurrency === 'USD') {
    if (exchangeRate === undefined || exchangeRate === null || exchangeRate === '') {
      throw new Error('Exchange rate is required for USD.');
    }

    const parsedRate = parseFloat(exchangeRate);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      throw new Error('Exchange rate for USD must be a valid positive number.');
    }

    return {
      currency: 'USD',
      exchangeRate: parsedRate,
    };
  }

  throw new Error(`Unsupported currency: ${currency}. Only INR and USD are supported.`);
}

module.exports = {
  validateCurrencyAndRate,
};
