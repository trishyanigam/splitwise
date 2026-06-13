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
  Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { toast } from 'react-hot-toast';
import { getGroupById } from '../../services/groupService.js';
import { getMembers } from '../../services/membershipService.js';
import { createExpense } from '../../services/expenseService.js';

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
      expenseDate: new Date().toISOString().substring(0, 10),
      paidBy: '',
      participantIds: []
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
  }, [groupId]);

  const onSubmit = async (data) => {
    const amt = parseFloat(data.amount);
    const payload = {
      title: data.title.trim(),
      description: data.description.trim() || null,
      amount: amt,
      currency: data.currency,
      expenseDate: data.expenseDate,
      paidBy: parseInt(data.paidBy, 10),
      participantIds: data.participantIds.map(id => parseInt(id, 10))
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
              <Grid item xs={12} sm={8}>
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

              {/* Currency Selector */}
              <Grid item xs={12} sm={4}>
                <Controller
                  name="currency"
                  control={control}
                  rules={{ required: 'Currency is required.' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.currency}>
                      <InputLabel id="currency-label">Currency</InputLabel>
                      <Select
                        labelId="currency-label"
                        label="Currency"
                        disabled={submitting}
                        {...field}
                      >
                        <MenuItem value="INR">INR (₹)</MenuItem>
                        <MenuItem value="USD">USD ($)</MenuItem>
                      </Select>
                      {errors.currency && (
                        <FormHelperText>{errors.currency.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

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
                  disabled={submitting}
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
