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
  FormHelperText,
  Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { toast } from 'react-hot-toast';
import { getGroupById } from '../../services/groupService.js';
import { getMembers } from '../../services/membershipService.js';
import { createSettlement } from '../../services/settlementService.js';
import CurrencySelector from '../../components/CurrencySelector.jsx';

export const CreateSettlement = () => {
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
      payer: '',
      receiver: '',
      amount: '',
      currency: 'USD',
      exchangeRate: '',
      settlementDate: new Date().toISOString().substring(0, 10),
      notes: ''
    }
  });

  const watchedPayer = watch('payer');
  const watchedReceiver = watch('receiver');
  const watchedCurrency = watch('currency');
  const watchedAmount = watch('amount');
  const watchedExchangeRate = watch('exchangeRate');

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
      }

      if (membersRes && membersRes.members) {
        setMembers(membersRes.members);
      }
    } catch (err) {
      console.error('Failed to load group details for settlement creation:', err);
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

  const onSubmit = async (data) => {
    if (parseInt(data.payer, 10) === parseInt(data.receiver, 10)) {
      toast.error('Payer and receiver must be different members.');
      return;
    }

    const amt = parseFloat(data.amount);
    const payload = {
      payerId: parseInt(data.payer, 10),
      receiverId: parseInt(data.receiver, 10),
      amount: amt,
      currency: data.currency,
      exchangeRate: data.currency === 'USD' ? parseFloat(data.exchangeRate) : 1.0,
      settlementDate: data.settlementDate,
      notes: data.notes.trim() || null
    };

    try {
      setSubmitting(true);
      await createSettlement(groupId, payload);
      toast.success('Settlement logged successfully!');
      navigate(`/groups/${groupId}/settlements`);
    } catch (err) {
      console.error('Failed to create settlement:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to record settlement.');
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
          onClick={() => navigate(`/groups/${groupId}/settlements`)}
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
            Log Settlement
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Log a debt settlement transaction for <strong>{group.name}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Form Card */}
      <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              {/* Payer (Who Paid) Selection */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="payer"
                  control={control}
                  rules={{ required: 'Payer is required.' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.payer}>
                      <InputLabel id="payer-label">Payer (Who Paid)</InputLabel>
                      <Select
                        labelId="payer-label"
                        label="Payer (Who Paid)"
                        disabled={submitting}
                        {...field}
                      >
                        {members.map((member) => (
                          <MenuItem key={member.id} value={member.userId}>
                            {member.user?.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.payer && (
                        <FormHelperText>{errors.payer.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Receiver (Who Received) Selection */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="receiver"
                  control={control}
                  rules={{ 
                    required: 'Receiver is required.',
                    validate: (val) => val !== watchedPayer || 'Receiver cannot be the same as the Payer.'
                  }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.receiver}>
                      <InputLabel id="receiver-label">Receiver (Who Received)</InputLabel>
                      <Select
                        labelId="receiver-label"
                        label="Receiver (Who Received)"
                        disabled={submitting}
                        {...field}
                      >
                        {members.map((member) => (
                          <MenuItem key={member.id} value={member.userId}>
                            {member.user?.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.receiver && (
                        <FormHelperText>{errors.receiver.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

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

              {/* Settlement Date */}
              <Grid item xs={12}>
                <TextField
                  label="Settlement Date"
                  type="date"
                  fullWidth
                  variant="outlined"
                  disabled={submitting}
                  error={!!errors.settlementDate}
                  helperText={errors.settlementDate?.message}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                  {...register('settlementDate', { 
                    required: 'Settlement date is required.' 
                  })}
                />
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  label="Notes / Comments (Optional)"
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  disabled={submitting}
                  placeholder="e.g. Cleared debt for ski trip"
                  {...register('notes')}
                />
              </Grid>

              {/* Submit Buttons */}
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                <Button 
                  onClick={() => navigate(`/groups/${groupId}/settlements`)} 
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
                  disabled={submitting}
                  sx={{ px: 4, fontWeight: 700 }}
                >
                  {submitting ? 'Recording...' : 'Record Settlement'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateSettlement;
