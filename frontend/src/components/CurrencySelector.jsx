import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';

/**
 * Reusable Currency Selector component using Material UI.
 * Supports selecting INR or USD. Displays an exchange rate field when USD is selected.
 * 
 * @param {Object} props
 * @param {string} props.currency - The selected currency ('INR' or 'USD').
 * @param {number|string} props.exchangeRate - The exchange rate value.
 * @param {function} props.onChange - Callback triggered when currency or exchangeRate changes. Exposes { currency, exchangeRate }.
 * @param {Object} [props.errors] - Form errors object, e.g., { currency?: string, exchangeRate?: string }.
 * @param {boolean} [props.disabled] - Disabled state for controls.
 */
export default function CurrencySelector({
  currency = 'INR',
  exchangeRate = '',
  onChange,
  errors = {},
  disabled = false
}) {
  const handleCurrencyChange = (event) => {
    const newCurrency = event.target.value;
    // When switching back to INR, default/clear the exchange rate to 1
    const newRate = newCurrency === 'INR' ? 1.0 : '';
    if (onChange) {
      onChange({
        currency: newCurrency,
        exchangeRate: newRate,
      });
    }
  };

  const handleRateChange = (event) => {
    const newRate = event.target.value;
    if (onChange) {
      onChange({
        currency,
        exchangeRate: newRate,
      });
    }
  };

  const showExchangeRate = currency === 'USD';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', mt: 1 }}>
      <FormControl fullWidth error={!!errors.currency} disabled={disabled}>
        <InputLabel id="currency-select-label">Currency</InputLabel>
        <Select
          labelId="currency-select-label"
          id="currency-select"
          value={currency}
          label="Currency"
          onChange={handleCurrencyChange}
        >
          <MenuItem value="INR">INR (Indian Rupee)</MenuItem>
          <MenuItem value="USD">USD (US Dollar)</MenuItem>
        </Select>
      </FormControl>

      {showExchangeRate && (
        <TextField
          fullWidth
          id="exchange-rate-input"
          label="Exchange Rate (1 USD = ? INR)"
          type="number"
          value={exchangeRate}
          onChange={handleRateChange}
          placeholder="e.g. 83.50"
          error={!!errors.exchangeRate}
          helperText={errors.exchangeRate || 'Enter the exchange rate used for converting to INR'}
          disabled={disabled}
          slotProps={{
            htmlInput: { 
              step: 'any', 
              min: '0.000001' 
            }
          }}
        />
      )}
    </Box>
  );
}
