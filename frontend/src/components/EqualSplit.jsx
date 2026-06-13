import React, { useMemo } from 'react';
import { 
  Box, 
  Typography, 
  FormGroup, 
  FormControlLabel, 
  Checkbox, 
  Avatar, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Paper, 
  Button, 
  Grid, 
  Divider 
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

/**
 * Reusable Equal Split Component.
 * Allows selecting participants and previews the exact equal distribution of costs.
 * 
 * @param {Array<Object>} members - The list of active group members [{ userId, user: { name, email } }]
 * @param {number|string} amount - The total expense amount to split
 * @param {string} currency - The selected currency code (e.g. 'USD', 'INR')
 * @param {Array<number>} selectedIds - List of currently selected participant user IDs
 * @param {Function} onChange - Callback triggered when selections change: (selectedIds, calculatedShares)
 * @param {boolean} [disabled=false] - Disable interactions if true
 */
export const EqualSplit = ({ 
  members = [], 
  amount = 0, 
  currency = 'USD', 
  selectedIds = [], 
  onChange, 
  disabled = false 
}) => {

  const parsedAmount = parseFloat(amount) || 0;

  // Calculate equal split shares with remainder distribution
  const calculatedShares = useMemo(() => {
    if (parsedAmount <= 0 || selectedIds.length === 0) {
      return [];
    }
    const N = selectedIds.length;
    const baseShare = Math.floor((parsedAmount / N) * 100) / 100;
    const calculatedSum = baseShare * N;
    const remainder = Number((parsedAmount - calculatedSum).toFixed(2));

    return selectedIds.map((userId, index) => {
      const shareAmount = index === 0 
        ? Number((baseShare + remainder).toFixed(2)) 
        : baseShare;
      return {
        userId,
        shareAmount,
        hasRemainder: index === 0 && remainder !== 0
      };
    });
  }, [parsedAmount, selectedIds]);

  const handleToggleMember = (userId) => {
    if (disabled) return;
    const updatedIds = selectedIds.includes(userId)
      ? selectedIds.filter(id => id !== userId)
      : [...selectedIds, userId];
    
    // Calculate new shares instantly for the callback
    const N = updatedIds.length;
    let newShares = [];
    if (parsedAmount > 0 && N > 0) {
      const baseShare = Math.floor((parsedAmount / N) * 100) / 100;
      const calculatedSum = baseShare * N;
      const remainder = Number((parsedAmount - calculatedSum).toFixed(2));
      newShares = updatedIds.map((id, index) => ({
        userId: id,
        shareAmount: index === 0 ? Number((baseShare + remainder).toFixed(2)) : baseShare
      }));
    }

    if (onChange) {
      onChange(updatedIds, newShares);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const allIds = members.map(m => m.userId);
    const N = allIds.length;
    let newShares = [];
    if (parsedAmount > 0 && N > 0) {
      const baseShare = Math.floor((parsedAmount / N) * 100) / 100;
      const calculatedSum = baseShare * N;
      const remainder = Number((parsedAmount - calculatedSum).toFixed(2));
      newShares = allIds.map((id, index) => ({
        userId: id,
        shareAmount: index === 0 ? Number((baseShare + remainder).toFixed(2)) : baseShare
      }));
    }
    if (onChange) {
      onChange(allIds, newShares);
    }
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    if (onChange) {
      onChange([], []);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        {/* Left Grid Panel: Selection checklist */}
        <Grid item xs={12} md={7}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Select Splitters ({selectedIds.length} selected)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                size="small" 
                onClick={handleSelectAll} 
                disabled={disabled || selectedIds.length === members.length}
                sx={{ fontSize: '0.75rem', fontWeight: 600 }}
              >
                Select All
              </Button>
              <Button 
                size="small" 
                onClick={handleDeselectAll} 
                disabled={disabled || selectedIds.length === 0}
                sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}
              >
                Deselect All
              </Button>
            </Box>
          </Box>
          
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 1.5, 
              maxHeight: 280, 
              overflowY: 'auto',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              borderColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px'
            }}
          >
            {members.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No members available in this group.
                </Typography>
              </Box>
            ) : (
              <FormGroup>
                {members.map((member) => {
                  const isChecked = selectedIds.includes(member.userId);
                  return (
                    <FormControlLabel
                      key={member.id}
                      disabled={disabled}
                      control={
                        <Checkbox 
                          checked={isChecked} 
                          onChange={() => handleToggleMember(member.userId)}
                          icon={<CheckBoxOutlineBlankIcon sx={{ opacity: 0.6 }} />}
                          checkedIcon={<CheckBoxIcon color="primary" />}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                          <Avatar sx={{ bgcolor: isChecked ? 'primary.main' : 'rgba(255, 255, 255, 0.05)', color: isChecked ? 'primary.contrastText' : 'text.primary', width: 28, height: 28, fontSize: '0.75rem' }}>
                            {member.user?.name?.[0]?.toUpperCase() || 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: isChecked ? 'text.primary' : 'text.secondary' }}>
                              {member.user?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '10px' }}>
                              {member.user?.email}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      sx={{ 
                        margin: 0, 
                        width: '100%', 
                        borderRadius: '6px',
                        px: 1,
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.02)'
                        }
                      }}
                    />
                  );
                })}
              </FormGroup>
            )}
          </Paper>
        </Grid>

        {/* Right Grid Panel: Equal Split preview list */}
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Split Preview
          </Typography>
          
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              minHeight: 180, 
              backgroundColor: 'rgba(255, 255, 255, 0.01)', 
              borderColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: selectedIds.length === 0 || parsedAmount <= 0 ? 'center' : 'flex-start'
            }}
          >
            {selectedIds.length === 0 || parsedAmount <= 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Configure an amount and select splitters to see the calculations preview.
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Shares Summary
                </Typography>
                
                <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {calculatedShares.map((share) => {
                    const memberObj = members.find(m => m.userId === share.userId);
                    return (
                      <ListItem 
                        key={share.userId} 
                        disablePadding 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center' 
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.625rem', bgcolor: 'rgba(255,255,255,0.05)' }}>
                            <PersonIcon fontSize="inherit" />
                          </Avatar>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 120, fontWeight: 500 }}>
                            {memberObj?.user?.name || `User #${share.userId}`}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {currency} {share.shareAmount.toFixed(2)}
                          </Typography>
                          {share.hasRemainder && (
                            <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary', display: 'block' }}>
                              includes remainder
                            </Typography>
                          )}
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
                
                <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.05)' }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Splitters
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedIds.length}
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EqualSplit;
