import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  TextField, 
  Avatar, 
  InputAdornment, 
  Alert 
} from '@mui/material';

/**
 * Reusable Exact Split Component.
 * Displays rows of participants and allows setting exact share amounts per user.
 * 
 * @param {Array<Object>} members - The list of active group members [{ userId, user: { name, email } }]
 * @param {number|string} amount - The total expense amount to allocate
 * @param {string} currency - The currency symbol (e.g. 'USD', 'INR')
 * @param {Object} value - Current exact share values keyed by userId (e.g. { [userId]: 'amount' })
 * @param {Function} onChange - Callback triggered on change: (shares, isValid)
 * @param {boolean} [disabled=false] - Disable inputs if true
 */
export const ExactSplit = ({ 
  members = [], 
  amount = 0, 
  currency = 'USD', 
  value = {}, 
  onChange, 
  disabled = false 
}) => {

  const totalExpenseAmount = parseFloat(amount) || 0;
  const [shares, setShares] = useState(value);

  // Sync internal state with prop changes
  useEffect(() => {
    setShares(value);
  }, [value]);

  // Calculate sum of all user-entered shares
  const totalAllocated = Object.keys(shares).reduce((acc, userId) => {
    const val = parseFloat(shares[userId] || 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const remainingAmount = Number((totalExpenseAmount - totalAllocated).toFixed(2));
  const isPerfectSplit = Math.abs(remainingAmount) < 0.01;

  const handleShareChange = (userId, inputVal) => {
    if (disabled) return;
    
    const updatedShares = {
      ...shares,
      [userId]: inputVal
    };

    setShares(updatedShares);

    // Compute metrics for callback validation
    const sum = Object.keys(updatedShares).reduce((acc, id) => {
      const val = parseFloat(updatedShares[id] || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const isValid = Math.abs(sum - totalExpenseAmount) < 0.01;

    // Map to array form for ease of API payload formatting
    const sharesArray = Object.keys(updatedShares)
      .map(id => ({
        userId: parseInt(id, 10),
        shareAmount: parseFloat(updatedShares[id] || 0)
      }))
      .filter(item => item.shareAmount > 0);

    if (onChange) {
      onChange(updatedShares, sharesArray, isValid);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Remaining Amount Indicator Alert Banner */}
      <Box sx={{ mb: 3.5 }}>
        {totalExpenseAmount <= 0 ? (
          <Alert severity="warning" variant="outlined" sx={{ borderRadius: '8px' }}>
            Please enter a total expense amount to configure exact splits.
          </Alert>
        ) : isPerfectSplit ? (
          <Alert severity="success" variant="outlined" sx={{ borderRadius: '8px', color: 'success.main', borderColor: 'success.main' }}>
            Allocated perfectly! Total exact shares match the expense amount of <strong>{currency} {totalExpenseAmount.toFixed(2)}</strong>.
          </Alert>
        ) : remainingAmount > 0 ? (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: '8px' }}>
            Remaining to allocate: <strong>{currency} {remainingAmount.toFixed(2)}</strong> (Total: {currency} {totalAllocated.toFixed(2)} / {totalExpenseAmount.toFixed(2)})
          </Alert>
        ) : (
          <Alert severity="error" variant="outlined" sx={{ borderRadius: '8px' }}>
            Over-allocated by <strong>{currency} {Math.abs(remainingAmount).toFixed(2)}</strong> (Total: {currency} {totalAllocated.toFixed(2)} / {totalExpenseAmount.toFixed(2)})
          </Alert>
        )}
      </Box>

      {/* Participant rows table */}
      <TableContainer 
        component={Paper} 
        variant="outlined" 
        sx={{ 
          maxHeight: 320, 
          backgroundColor: 'rgba(255, 255, 255, 0.01)', 
          borderColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px'
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow sx={{ '& th': { backgroundColor: 'background.paper', fontWeight: 700 } }}>
              <TableCell>Name</TableCell>
              <TableCell align="right" sx={{ width: 180 }}>Share Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No members available in this group.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow 
                  key={member.id}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' }
                  }}
                >
                  {/* Participant Avatar and Name Cell */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                      <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'text.primary', width: 28, height: 28, fontSize: '0.75rem' }}>
                        {member.user?.name?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {member.user?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '10px' }}>
                          {member.user?.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  {/* Share Amount Input Cell */}
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      disabled={disabled || totalExpenseAmount <= 0}
                      value={shares[member.userId] || ''}
                      onChange={(e) => handleShareChange(member.userId, e.target.value)}
                      placeholder="0.00"
                      slotProps={{
                        htmlInput: { step: '0.01', min: '0', style: { textAlign: 'right' } }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography variant="caption" color="text.secondary">
                              {currency}
                            </Typography>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        width: '100%',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px'
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ExactSplit;
