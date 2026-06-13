import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  IconButton, 
  CircularProgress, 
  Alert, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Checkbox, 
  ListItemText, 
  OutlinedInput, 
  Chip, 
  FormHelperText,
  Grid,
  Paper,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemAvatar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { toast } from 'react-hot-toast';
import { getGroupById } from '../../services/groupService.js';
import { getMembers } from '../../services/membershipService.js';
import { createExpense } from '../../services/expenseService.js';
import CurrencySelector from '../../components/CurrencySelector.jsx';

export const CreateExpense = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // React Hook Form Configuration
  const { 
    register, 
    handleSubmit, 
    control, 
    formState: { errors }, 
    setValue, 
    watch 
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      amount: '',
      currency: 'USD',
      exchangeRate: '',
      expenseDate: new Date().toISOString().substring(0, 10),
      paidBy: '',
      splitType: 'EQUAL',
      participantIds: [],
      exactShares: {},
      percentageShares: {}
    }
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [groupRes, membersRes] = await Promise.all([
        getGroupById(groupId),
        getMembers(groupId)
      ]);

      if (groupRes && groupRes.group) {
        setGroup(groupRes.group);
        // Default paidBy to the group owner ID
        setValue('paidBy', groupRes.group.ownerId);
      }

      if (membersRes && membersRes.members) {
        setMembers(membersRes.members);
        // Pre-select all members as participants by default
        setValue('participantIds', membersRes.members.map(m => m.userId));
      }
    } catch (err) {
      console.error('Failed to load group details for expense creation:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load group details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    register('currency', { required: 'Currency is required.' });
    register('exchangeRate', {
      validate: (val) => {
        const currentCurrency = watch('currency');
        if (currentCurrency !== 'USD') return true;
        const parsed = parseFloat(val);
        return (!isNaN(parsed) && parsed > 0) || 'Exchange rate is required for USD.';
      }
    });
  }, [groupId, register]);

  // Watch fields for dynamic split calculations
  const watchedSplitType = watch('splitType');
  const watchedAmount = watch('amount');
  const watchedCurrency = watch('currency');
  const watchedExchangeRate = watch('exchangeRate');
  const watchedParticipantIds = watch('participantIds') || [];
  const watchedExactShares = watch('exactShares') || {};
  const watchedPercentageShares = watch('percentageShares') || {};

  // Compute live INR preview
  let inrPreview = null;
  const numAmount = parseFloat(watchedAmount);
  if (!isNaN(numAmount) && numAmount > 0) {
    if (watchedCurrency === 'INR') {
      inrPreview = numAmount;
    } else if (watchedCurrency === 'USD') {
      const numRate = parseFloat(watchedExchangeRate);
      if (!isNaN(numRate) && numRate > 0) {
        inrPreview = Math.round(numAmount * numRate * 100) / 100;
      }
    }
  }

  // Compute live summation diagnostics
  let sumText = '';
  let sumColor = 'text.secondary';
  let isSumValid = true;

  if (watchedSplitType === 'EXACT') {
    const totalExact = watchedParticipantIds.reduce((acc, id) => {
      const val = parseFloat(watchedExactShares[id] || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    const targetAmt = parseFloat(watchedAmount) || 0;
    sumText = `Total Allocated: ${totalExact.toFixed(2)} / ${targetAmt.toFixed(2)}`;
    isSumValid = Math.abs(totalExact - targetAmt) < 0.01;
    sumColor = isSumValid ? 'success.main' : 'error.main';
  } else if (watchedSplitType === 'PERCENTAGE') {
    const totalPct = watchedParticipantIds.reduce((acc, id) => {
      const val = parseFloat(watchedPercentageShares[id] || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    sumText = `Total Percentage: ${totalPct.toFixed(1)}% / 100%`;
    isSumValid = Math.abs(totalPct - 100) < 0.01;
    sumColor = isSumValid ? 'success.main' : 'error.main';
  }

  const onSubmit = async (data) => {
    const amt = parseFloat(data.amount);
    const splitType = data.splitType;
    let participantsPayload = [];

    // Validation matching splitType rules
    if (splitType === 'EQUAL') {
      participantsPayload = data.participantIds.map(id => parseInt(id, 10));
    } else if (splitType === 'EXACT') {
      let totalSharesSum = 0;
      participantsPayload = data.participantIds.map(id => {
        const shareVal = parseFloat(data.exactShares?.[id] || 0);
        totalSharesSum += shareVal;
        return {
          userId: parseInt(id, 10),
          shareAmount: shareVal
        };
      });

      if (Math.abs(totalSharesSum - amt) > 0.01) {
        toast.error(`Total shares must sum exactly to the expense amount (${data.currency} ${amt}). Current sum: ${data.currency} ${totalSharesSum.toFixed(2)}`);
        return;
      }
    } else if (splitType === 'PERCENTAGE') {
      let totalPercentageSum = 0;
      participantsPayload = data.participantIds.map(id => {
        const pctVal = parseFloat(data.percentageShares?.[id] || 0);
        totalPercentageSum += pctVal;
        return {
          userId: parseInt(id, 10),
          percentage: pctVal
        };
      });

      if (Math.abs(totalPercentageSum - 100) > 0.01) {
        toast.error(`Total percentage must sum exactly to 100%. Current sum: ${totalPercentageSum.toFixed(2)}%`);
        return;
      }
    }

    const payload = {
      title: data.title.trim(),
      description: data.description.trim() || null,
      amount: amt,
      currency: data.currency,
      exchangeRate: data.currency === 'USD' ? parseFloat(data.exchangeRate) : 1.0,
      expenseDate: data.expenseDate,
      paidBy: parseInt(data.paidBy, 10),
      splitType,
      participants: participantsPayload
    };

    try {
      setSubmitting(true);
      await createExpense(groupId, payload);
      toast.success('Expense recorded successfully!');
      navigate(`/groups/${groupId}/expenses`);
    } catch (err) {
      console.error('Failed to create expense:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Box>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(`/groups/${groupId}`)} 
          sx={{ mb: 3 }}
        >
          Back to Group
        </Button>
        <Alert severity="error">{error || 'Group not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 650, mx: 'auto' }}>
      {/* Top Header Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <IconButton 
          onClick={() => navigate(`/groups/${groupId}/expenses`)}
          sx={{ 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              color: 'text.primary'
            }
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
            Add Expense
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Log a new expense for <strong>{group.name}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Expense Creator Form Card */}
      <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              {/* Expense Title */}
              <Grid item xs={12}>
                <TextField
                  label="Expense Title"
                  fullWidth
                  variant="outlined"
                  disabled={submitting}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  placeholder="e.g. Weekly Groceries"
                  {...register('title', { 
                    required: 'Expense title is required.' 
                  })}
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  label="Description (Optional)"
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  disabled={submitting}
                  placeholder="e.g. Details on items purchased at supermarket"
                  {...register('description')}
                />
              </Grid>

              {/* Amount */}
              {/* Amount */}
              <Grid item xs={12} sm={watchedCurrency === 'USD' ? 4 : 8}>
                <TextField
                  label="Amount"
                  type="number"
                  fullWidth
                  variant="outlined"
                  disabled={submitting}
                  error={!!errors.amount}
                  helperText={errors.amount?.message}
                  slotProps={{
                    htmlInput: { step: '0.01', min: '0.01' }
                  }}
                  placeholder="0.00"
                  {...register('amount', {
                    required: 'Amount is required.',
                    validate: (val) => parseFloat(val) > 0 || 'Amount must be greater than 0.'
                  })}
                />
              </Grid>

              {/* Currency & Exchange Rate Selector */}
              <Grid item xs={12} sm={watchedCurrency === 'USD' ? 8 : 4}>
                <CurrencySelector
                  currency={watchedCurrency}
                  exchangeRate={watchedExchangeRate}
                  onChange={({ currency, exchangeRate }) => {
                    setValue('currency', currency, { shouldValidate: true });
                    setValue('exchangeRate', exchangeRate, { shouldValidate: true });
                  }}
                  errors={{
                    currency: errors.currency?.message,
                    exchangeRate: errors.exchangeRate?.message
                  }}
                  disabled={submitting}
                />
              </Grid>

              {/* Live Converted INR Preview */}
              {inrPreview !== null && (
                <Grid item xs={12}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                      Live Converted INR Preview
                    </Typography>
                    <Typography variant="h6" color="success.main" sx={{ fontWeight: 800 }}>
                      ₹{inrPreview.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {/* Expense Date */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Expense Date"
                  type="date"
                  fullWidth
                  variant="outlined"
                  disabled={submitting}
                  error={!!errors.expenseDate}
                  helperText={errors.expenseDate?.message}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                  {...register('expenseDate', { 
                    required: 'Expense date is required.' 
                  })}
                />
              </Grid>

              {/* Paid By (Payer) Selector */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="paidBy"
                  control={control}
                  rules={{ required: 'Payer is required.' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.paidBy}>
                      <InputLabel id="paidby-label">Paid By</InputLabel>
                      <Select
                        labelId="paidby-label"
                        label="Paid By"
                        disabled={submitting}
                        {...field}
                      >
                        {members.map((member) => (
                          <MenuItem key={member.id} value={member.userId}>
                            {member.user?.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.paidBy && (
                        <FormHelperText>{errors.paidBy.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Split Type Selector */}
              <Grid item xs={12}>
                <Controller
                  name="splitType"
                  control={control}
                  rules={{ required: 'Split Type is required.' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.splitType}>
                      <InputLabel id="split-type-label">Split Type</InputLabel>
                      <Select
                        labelId="split-type-label"
                        label="Split Type"
                        disabled={submitting}
                        {...field}
                      >
                        <MenuItem value="EQUAL">Equal</MenuItem>
                        <MenuItem value="EXACT">Exact</MenuItem>
                        <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                      </Select>
                      {errors.splitType && (
                        <FormHelperText>{errors.splitType.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Split Participants Multi Select */}
              <Grid item xs={12}>
                <Controller
                  name="participantIds"
                  control={control}
                  rules={{ 
                    validate: (val) => (val && val.length > 0) || 'At least one participant must be selected.' 
                  }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.participantIds}>
                      <InputLabel id="participants-label">Split Between (Participants)</InputLabel>
                      <Select
                        labelId="participants-label"
                        multiple
                        input={<OutlinedInput label="Split Between (Participants)" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((userId) => {
                              const userObj = members.find(m => m.userId === userId)?.user;
                              return (
                                <Chip key={userId} label={userObj?.name || `User #${userId}`} size="small" />
                              );
                            })}
                          </Box>
                        )}
                        disabled={submitting}
                        {...field}
                      >
                        {members.map((member) => (
                          <MenuItem key={member.id} value={member.userId}>
                            <Checkbox checked={field.value.indexOf(member.userId) > -1} />
                            <ListItemText primary={member.user?.name} secondary={member.user?.email} />
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.participantIds ? (
                        <FormHelperText>{errors.participantIds.message}</FormHelperText>
                      ) : (
                        <FormHelperText>Select which group members share this expense cost</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Dynamic Shares Allocation Inputs */}
              {watchedSplitType !== 'EQUAL' && watchedParticipantIds.length > 0 && (
                <Grid item xs={12}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      backgroundColor: 'rgba(255, 255, 255, 0.01)', 
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px'
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Split Shares Allocation
                    </Typography>
                    
                    <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {watchedParticipantIds.map((userId) => {
                        const memberObj = members.find(m => m.userId === userId);
                        return (
                          <ListItem 
                            key={userId}
                            disablePadding
                            sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              gap: 2 
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
                              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.875rem' }}>
                                {memberObj?.user?.name?.[0]?.toUpperCase() || 'U'}
                              </Avatar>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {memberObj?.user?.name || `User #${userId}`}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ width: 150 }}>
                              {watchedSplitType === 'EXACT' ? (
                                <TextField
                                  label="Amount"
                                  size="small"
                                  type="number"
                                  disabled={submitting}
                                  slotProps={{
                                    htmlInput: { step: '0.01', min: '0' }
                                  }}
                                  placeholder="0.00"
                                  {...register(`exactShares.${userId}`, {
                                    required: 'Amount is required.',
                                    validate: (val) => parseFloat(val) >= 0 || 'Must be >= 0'
                                  })}
                                />
                              ) : (
                                <TextField
                                  label="Percentage (%)"
                                  size="small"
                                  type="number"
                                  disabled={submitting}
                                  slotProps={{
                                    htmlInput: { step: '0.1', min: '0', max: '100' }
                                  }}
                                  placeholder="0"
                                  {...register(`percentageShares.${userId}`, {
                                    required: 'Percentage is required.',
                                    validate: (val) => parseFloat(val) >= 0 || 'Must be >= 0'
                                  })}
                                />
                              )}
                            </Box>
                          </ListItem>
                        );
                      })}
                    </List>
                    
                    <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.05)' }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: sumColor }}>
                        {sumText}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              )}

              {/* Submit Buttons */}
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                <Button 
                  onClick={() => navigate(`/groups/${groupId}/expenses`)} 
                  disabled={submitting}
                  variant="outlined"
                  sx={{ 
                    fontWeight: 700,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)'
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  disabled={submitting || (!isSumValid && watchedSplitType !== 'EQUAL')}
                  sx={{ px: 4, fontWeight: 700 }}
                >
                  {submitting ? 'Recording...' : 'Record Expense'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateExpense;
