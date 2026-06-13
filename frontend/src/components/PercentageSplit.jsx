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
 * Reusable Percentage Split Component.
 * Displays rows of participants and allows setting percentage allocations per user.
 * 
 * @param {Array<Object>} members - The list of active group members [{ userId, user: { name, email } }]
 * @param {number|string} amount - The total expense amount to split
 * @param {string} currency - The currency symbol (e.g. 'USD', 'INR')
 * @param {Object} value - Current percentage values keyed by userId (e.g. { [userId]: 'percentage' })
 * @param {Function} onChange - Callback triggered on change: (percentages, sharesArray, isValid)
 * @param {boolean} [disabled=false] - Disable inputs if true
 */
export const PercentageSplit = ({ 
  members = [], 
  amount = 0, 
  currency = 'USD', 
  value = {}, 
  onChange, 
  disabled = false 
}) => {

  const totalExpenseAmount = parseFloat(amount) || 0;
  const [percentages, setPercentages] = useState(value);

  // Sync internal state with prop changes
  useEffect(() => {
    setPercentages(value);
  }, [value]);

  // Calculate sum of all user-entered percentages
  const totalPercentage = Object.keys(percentages).reduce((acc, userId) => {
    const val = parseFloat(percentages[userId] || 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const remainingPercentage = Number((100 - totalPercentage).toFixed(2));
  const isPerfectSplit = Math.abs(totalPercentage - 100) < 0.01;

  const handlePercentageChange = (userId, inputVal) => {
    if (disabled) return;

    const updatedPercentages = {
      ...percentages,
      [userId]: inputVal
    };

    setPercentages(updatedPercentages);

    // Compute metrics for callback validation
    const sum = Object.keys(updatedPercentages).reduce((acc, id) => {
      const val = parseFloat(updatedPercentages[id] || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const isValid = Math.abs(sum - 100) < 0.01;

    // Calculate shares for each user to pass to parent
    const sharesArray = Object.keys(updatedPercentages)
      .map(id => {
        const pct = parseFloat(updatedPercentages[id] || 0);
        const calculatedAmount = Number(((totalExpenseAmount * pct) / 100).toFixed(2));
        return {
          userId: parseInt(id, 10),
          percentage: pct,
          shareAmount: calculatedAmount
        };
      })
      .filter(item => item.percentage > 0);

    if (onChange) {
      onChange(updatedPercentages, sharesArray, isValid);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Live Percentage Total Alert Banner */}
      <Box sx={{ mb: 3.5 }}>
        {isPerfectSplit ? (
          <Alert severity="success" variant="outlined" sx={{ borderRadius: '8px', color: 'success.main', borderColor: 'success.main' }}>
            Allocated perfectly! Total percentage is exactly <strong>100%</strong>.
          </Alert>
        ) : remainingPercentage > 0 ? (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: '8px' }}>
            Total Percentage: <strong>{totalPercentage.toFixed(1)}% / 100%</strong> (Remaining to allocate: <strong>{remainingPercentage.toFixed(1)}%</strong>)
          </Alert>
        ) : (
          <Alert severity="error" variant="outlined" sx={{ borderRadius: '8px' }}>
            Over-allocated: <strong>{totalPercentage.toFixed(1)}% / 100%</strong> (Exceeds limit by <strong>{Math.abs(remainingPercentage).toFixed(1)}%</strong>)
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
              <TableCell align="right" sx={{ width: 140 }}>Percentage</TableCell>
              <TableCell align="right" sx={{ width: 160 }}>Calculated Share</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No members available in this group.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                const pct = parseFloat(percentages[member.userId] || 0);
                const calculatedShare = (totalExpenseAmount * pct) / 100;

                return (
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
                    
                    {/* Percentage Input Cell */}
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        disabled={disabled}
                        value={percentages[member.userId] || ''}
                        onChange={(e) => handlePercentageChange(member.userId, e.target.value)}
                        placeholder="0"
                        slotProps={{
                          htmlInput: { step: '0.1', min: '0', max: '100', style: { textAlign: 'right' } }
                        }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography variant="caption" color="text.secondary">
                                %
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

                    {/* Calculated Share Cost Cell */}
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {totalExpenseAmount > 0 ? (
                        `${currency} ${calculatedShare.toFixed(2)}`
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PercentageSplit;
