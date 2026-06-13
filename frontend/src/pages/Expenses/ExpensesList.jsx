import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  IconButton, 
  CircularProgress, 
  Alert, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Avatar,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { toast } from 'react-hot-toast';
import { getGroupById } from '../../services/groupService.js';
import { getMembers } from '../../services/membershipService.js';
import { 
  getExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense 
} from '../../services/expenseService.js';

export const ExpensesList = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form Dialog States
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null); // null if creating
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formExpenseDate, setFormExpenseDate] = useState(new Date().toISOString().substring(0, 10));
  const [formPaidBy, setFormPaidBy] = useState('');
  const [formParticipantIds, setFormParticipantIds] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

  // View Dialog States
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Delete Dialog States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [groupRes, expensesRes, membersRes] = await Promise.all([
        getGroupById(groupId),
        getExpenses(groupId),
        getMembers(groupId)
      ]);

      if (groupRes && groupRes.group) {
        setGroup(groupRes.group);
      }
      if (expensesRes && expensesRes.expenses) {
        setExpenses(expensesRes.expenses);
      }
      if (membersRes && membersRes.members) {
        setMembers(membersRes.members);
      }
    } catch (err) {
      console.error('Failed to load expenses data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to retrieve expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  // Open Form for Creation
  const handleCreateClick = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormDescription('');
    setFormAmount('');
    setFormCurrency('USD');
    setFormExpenseDate(new Date().toISOString().substring(0, 10));
    // Default payer to current group owner or first member if available
    setFormPaidBy(group?.ownerId || '');
    // Default participants to all active members
    setFormParticipantIds(members.map(m => m.userId));
    setFormOpen(true);
  };

  // Open Form for Editing
  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setFormTitle(expense.title);
    setFormDescription(expense.description || '');
    setFormAmount(expense.amount.toString());
    setFormCurrency(expense.currency);
    setFormExpenseDate(new Date(expense.expenseDate).toISOString().substring(0, 10));
    setFormPaidBy(expense.paidById);
    setFormParticipantIds(expense.participants.map(p => p.userId));
    setFormOpen(true);
  };

  // Submit Creation / Modification
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      toast.error('Title is required.');
      return;
    }

    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid positive amount.');
      return;
    }

    if (!formPaidBy) {
      toast.error('Please select who paid.');
      return;
    }

    if (formParticipantIds.length === 0) {
      toast.error('At least one participant is required.');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      amount: amt,
      currency: formCurrency,
      expenseDate: formExpenseDate,
      paidBy: parseInt(formPaidBy, 10),
      participantIds: formParticipantIds
    };

    try {
      setFormLoading(true);
      if (editingExpense) {
        // Edit mode
        await updateExpense(groupId, editingExpense.id, payload);
        toast.success('Expense updated successfully!');
      } else {
        // Create mode
        await createExpense(groupId, payload);
        toast.success('Expense recorded successfully!');
      }
      setFormOpen(false);
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Failed to save expense:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save expense details.');
    } finally {
      setFormLoading(false);
    }
  };

  // View Details trigger
  const handleViewClick = (expense) => {
    setSelectedExpense(expense);
    setViewOpen(true);
  };

  // Delete trigger
  const handleDeleteClick = (expense) => {
    setDeletingExpense(expense);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      await deleteExpense(groupId, deletingExpense.id);
      toast.success('Expense deleted successfully.');
      setDeleteOpen(false);
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Failed to delete expense:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete expense.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrencyAmount = (amount, currency) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD'
    }).format(numericAmount);
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
        <Alert severity="error">{error || 'Group details not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Top Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton 
            onClick={() => navigate(`/groups/${groupId}`)}
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
              Expenses
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Expense logs listing for <strong>{group.name}</strong>
            </Typography>
          </Box>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate(`/groups/${groupId}/expenses/create`)}
          sx={{ fontWeight: 700 }}
        >
          Add Expense
        </Button>
      </Box>

      {/* Expenses Table Container */}
      <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0} sx={{ backgroundColor: 'transparent' }}>
            <Table aria-label="expenses table">
              <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, pl: 3 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Currency</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Paid By</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Expense Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                      <ReceiptLongIcon sx={{ fontSize: 48, opacity: 0.1, mb: 1.5, display: 'block', mx: 'auto' }} />
                      <Typography variant="body1">No expenses recorded for this group yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow 
                      key={expense.id}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' }
                      }}
                    >
                      {/* Title */}
                      <TableCell sx={{ pl: 3, fontWeight: 600 }}>
                        {expense.title}
                      </TableCell>
                      
                      {/* Amount */}
                      <TableCell sx={{ color: 'text.primary', fontWeight: 700 }}>
                        {parseFloat(expense.amount).toFixed(2)}
                      </TableCell>
                      
                      {/* Currency */}
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {expense.currency}
                      </TableCell>
                      
                      {/* Paid By */}
                      <TableCell sx={{ fontWeight: 500 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'text.primary' }}>
                            {expense.paidBy?.name?.[0]?.toUpperCase() || 'U'}
                          </Avatar>
                          {expense.paidBy?.name}
                        </Box>
                      </TableCell>
                      
                      {/* Expense Date */}
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {formatDate(expense.expenseDate)}
                      </TableCell>
                      
                      {/* Actions */}
                      <TableCell align="right" sx={{ pr: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              onClick={() => navigate(`/groups/${groupId}/expenses/${expense.id}`)}
                              sx={{ color: 'primary.main', border: '1px solid rgba(16, 185, 129, 0.15)', p: 0.7 }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Expense">
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditClick(expense)}
                              sx={{ color: 'secondary.main', border: '1px solid rgba(139, 92, 246, 0.15)', p: 0.7 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Expense">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteClick(expense)}
                              sx={{ color: 'error.main', border: '1px solid rgba(239, 68, 68, 0.15)', p: 0.7 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create / Edit Expense Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !formLoading && setFormOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#111827',
              backgroundImage: 'none',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              p: 1,
              minWidth: { xs: '90%', sm: 500 }
            }
          }
        }}
      >
        <form onSubmit={handleFormSubmit}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
            {editingExpense ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
          <DialogContent sx={{ py: 1 }}>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  label="Expense Title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  fullWidth
                  disabled={formLoading}
                  placeholder="e.g. Dinner out"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description (Optional)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  disabled={formLoading}
                  placeholder="e.g. Split drinks and mains"
                />
              </Grid>

              <Grid item xs={8}>
                <TextField
                  label="Amount"
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                  fullWidth
                  disabled={formLoading}
                  slotProps={{
                    htmlInput: { step: '0.01', min: '0.01' }
                  }}
                  placeholder="0.00"
                />
              </Grid>

              <Grid item xs={4}>
                <FormControl fullWidth required>
                  <InputLabel id="currency-label">Currency</InputLabel>
                  <Select
                    labelId="currency-label"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    label="Currency"
                    disabled={formLoading}
                  >
                    <MenuItem value="USD">USD ($)</MenuItem>
                    <MenuItem value="INR">INR (₹)</MenuItem>
                    <MenuItem value="EUR">EUR (€)</MenuItem>
                    <MenuItem value="GBP">GBP (£)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Expense Date"
                  type="date"
                  value={formExpenseDate}
                  onChange={(e) => setFormExpenseDate(e.target.value)}
                  required
                  fullWidth
                  disabled={formLoading}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel id="paidby-label">Paid By</InputLabel>
                  <Select
                    labelId="paidby-label"
                    value={formPaidBy}
                    onChange={(e) => setFormPaidBy(e.target.value)}
                    label="Paid By"
                    disabled={formLoading}
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.userId}>
                        {member.user?.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="participants-label">Split Between (Participants)</InputLabel>
                  <Select
                    labelId="participants-label"
                    multiple
                    value={formParticipantIds}
                    onChange={(e) => setFormParticipantIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
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
                    disabled={formLoading}
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.userId}>
                        <Checkbox checked={formParticipantIds.indexOf(member.userId) > -1} />
                        <ListItemText primary={member.user?.name} secondary={member.user?.email} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button 
              onClick={() => setFormOpen(false)} 
              disabled={formLoading}
              variant="text"
              sx={{ color: 'text.secondary' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={formLoading}
            >
              {formLoading ? 'Saving...' : (editingExpense ? 'Save' : 'Add')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#111827',
              backgroundImage: 'none',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              p: 1.5,
              minWidth: { xs: '90%', sm: 450 }
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Expense Details</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          {selectedExpense && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {selectedExpense.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedExpense.description || 'No description provided.'}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Amount
                  </Typography>
                  <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>
                    {formatCurrencyAmount(selectedExpense.amount, selectedExpense.currency)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Date
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {formatDate(selectedExpense.expenseDate)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Paid By
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>
                      {selectedExpense.paidBy?.name?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {selectedExpense.paidBy?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedExpense.paidBy?.email}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Split Between ({selectedExpense.participants?.length || 0})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedExpense.participants?.map((participant) => (
                      <Chip 
                        key={participant.id} 
                        avatar={
                          <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'text.primary' }}>
                            {participant.user?.name?.[0]?.toUpperCase() || 'U'}
                          </Avatar>
                        }
                        label={participant.user?.name} 
                        variant="outlined" 
                        sx={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          borderColor: 'rgba(255, 255, 255, 0.06)'
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button 
            onClick={() => setViewOpen(false)} 
            variant="contained" 
            color="primary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => !deleteLoading && setDeleteOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#111827',
              backgroundImage: 'none',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              p: 1,
              minWidth: { xs: '90%', sm: 400 }
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Delete Expense</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Typography variant="body1">
            Are you sure you want to delete the expense <strong>{deletingExpense?.title}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1.5, fontWeight: 500 }}>
            This action is permanent and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button 
            onClick={() => setDeleteOpen(false)} 
            disabled={deleteLoading}
            variant="text"
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            variant="contained" 
            color="error"
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Expense'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpensesList;
