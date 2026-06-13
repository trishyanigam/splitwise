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
  Avatar, 
  Grid, 
  Divider, 
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import InfoIcon from '@mui/icons-material/Info';
import { toast } from 'react-hot-toast';
import { getGroupById } from '../../services/groupService.js';
import { getMembers } from '../../services/membershipService.js';
import { getExpenseById, updateExpense, deleteExpense } from '../../services/expenseService.js';

export const ExpenseDetails = () => {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expense, setExpense] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Form Dialog States
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');
  const [editExpenseDate, setEditExpenseDate] = useState('');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editParticipantIds, setEditParticipantIds] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // Delete Dialog States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAllDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [groupRes, expenseRes, membersRes] = await Promise.all([
        getGroupById(groupId),
        getExpenseById(groupId, expenseId),
        getMembers(groupId)
      ]);

      if (groupRes && groupRes.group) {
        setGroup(groupRes.group);
      }
      if (expenseRes && expenseRes.expense) {
        setExpense(expenseRes.expense);
      }
      if (membersRes && membersRes.members) {
        setMembers(membersRes.members);
      }
    } catch (err) {
      console.error('Failed to load expense details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to retrieve details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDetails();
  }, [groupId, expenseId]);

  // Open Edit Dialog
  const handleEditClick = () => {
    if (!expense) return;
    setEditTitle(expense.title);
    setEditDescription(expense.description || '');
    setEditAmount(expense.amount.toString());
    setEditCurrency(expense.currency);
    setEditExpenseDate(new Date(expense.expenseDate).toISOString().substring(0, 10));
    setEditPaidBy(expense.paidById);
    setEditParticipantIds(expense.participants.map(p => p.userId));
    setEditOpen(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editTitle.trim()) {
      toast.error('Title is required.');
      return;
    }

    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid positive amount.');
      return;
    }

    if (!editPaidBy) {
      toast.error('Payer is required.');
      return;
    }

    if (editParticipantIds.length === 0) {
      toast.error('At least one participant is required.');
      return;
    }

    const payload = {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      amount: amt,
      currency: editCurrency,
      expenseDate: editExpenseDate,
      paidBy: parseInt(editPaidBy, 10),
      participantIds: editParticipantIds
    };

    try {
      setEditLoading(true);
      await updateExpense(groupId, expenseId, payload);
      toast.success('Expense updated successfully!');
      setEditOpen(false);
      fetchAllDetails(); // Refresh page details
    } catch (err) {
      console.error('Failed to update expense:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update expense.');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Click trigger
  const handleDeleteClick = () => {
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      await deleteExpense(groupId, expenseId);
      toast.success('Expense deleted successfully.');
      setDeleteOpen(false);
      navigate(`/groups/${groupId}/expenses`);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete expense.');
      setDeleteOpen(false);
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  if (error || !expense) {
    return (
      <Box>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(`/groups/${groupId}/expenses`)} 
          sx={{ mb: 3 }}
        >
          Back to Expenses
        </Button>
        <Alert severity="error">{error || 'Expense details not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Top Navigation Bar Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
              Expense Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review split breakdown context inside <strong>{group?.name}</strong>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate(`/groups/${groupId}/expenses/${expenseId}/trace`)}
            sx={{ fontWeight: 600 }}
          >
            Audit Split
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={handleEditClick}
            sx={{ fontWeight: 600 }}
          >
            Edit Expense
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
            sx={{ fontWeight: 600 }}
          >
            Delete Expense
          </Button>
        </Box>
      </Box>

      {/* Main Responsive Grid layout */}
      <Grid container spacing={4}>
        {/* Left Column: Detailed Metadata Context */}
        <Grid item xs={12} md={7}>
          <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 }, flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Summary Info
              </Typography>
              <Typography variant="h4" component="h2" sx={{ fontWeight: 800, mb: 2 }}>
                {expense.title}
              </Typography>
              
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.7 }}>
                {expense.description || 'No description was logged for this expense.'}
              </Typography>
              
              <Divider sx={{ my: 3 }} />
              
              <Grid container spacing={3}>
                {/* Original Amount */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AccountBalanceWalletIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Original Amount
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {formatCurrencyAmount(expense.amount, expense.currency)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Converted INR Amount */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AccountBalanceWalletIcon sx={{ color: 'success.main' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Converted INR Amount
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.main' }}>
                        ₹{expense.convertedAmount !== null && expense.convertedAmount !== undefined
                          ? Number(expense.convertedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Exchange Rate */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <InfoIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Exchange Rate
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {expense.exchangeRate !== null && expense.exchangeRate !== undefined
                          ? `1 ${expense.currency} = ${Number(expense.exchangeRate).toFixed(4)} INR`
                          : `1 ${expense.currency} = 1.0000 INR`
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Expense Date */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CalendarTodayIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Expense Date
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {formatDate(expense.expenseDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Created At */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <InfoIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Logged Into Splitwise
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatDateTime(expense.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Payer & Participants Split Lists */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Payer Card */}
            <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Paid By
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 800, width: 44, height: 44 }}>
                    {expense.paidBy?.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {expense.paidBy?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {expense.paidBy?.email}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Split Participants Card */}
            <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Split Details
                  </Typography>
                  <Chip 
                    label={`Split Type: ${expense.splitType || 'EQUAL'}`} 
                    size="small" 
                    color="secondary"
                    variant="outlined"
                    sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}
                  />
                </Box>
                
                <TableContainer 
                  component={Paper} 
                  variant="outlined" 
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.01)', 
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px'
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { backgroundColor: 'background.paper', fontWeight: 700 } }}>
                        <TableCell>Participant</TableCell>
                        <TableCell align="right">Share Amount</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {expense.participants?.map((participant) => {
                        const shareAmt = participant.shareAmount !== null && participant.shareAmount !== undefined
                          ? Number(participant.shareAmount)
                          : Number(expense.amount) / (expense.participants.length || 1);

                        const pct = participant.sharePercentage !== null && participant.sharePercentage !== undefined
                          ? `${Number(participant.sharePercentage).toFixed(1)}%`
                          : expense.amount > 0 
                            ? `${((shareAmt / Number(expense.amount)) * 100).toFixed(1)}%` 
                            : '-';

                        return (
                          <TableRow 
                            key={participant.id}
                            sx={{ 
                              '&:last-child td, &:last-child th': { border: 0 },
                              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' }
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                                <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 28, height: 28, fontSize: '0.75rem' }}>
                                  {participant.user?.name?.[0]?.toUpperCase() || 'U'}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {participant.user?.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '9px' }}>
                                    {participant.user?.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                              {formatCurrencyAmount(shareAmt, expense.currency)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                              {pct}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Edit Form Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => !editLoading && setEditOpen(false)}
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
        <form onSubmit={handleEditSubmit}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Edit Expense</DialogTitle>
          <DialogContent sx={{ py: 1 }}>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  label="Expense Title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  fullWidth
                  disabled={editLoading}
                  placeholder="e.g. Dinner"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description (Optional)"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  disabled={editLoading}
                  placeholder="e.g. Split details"
                />
              </Grid>

              <Grid item xs={8}>
                <TextField
                  label="Amount"
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                  fullWidth
                  disabled={editLoading}
                  slotProps={{
                    htmlInput: { step: '0.01', min: '0.01' }
                  }}
                  placeholder="0.00"
                />
              </Grid>

              <Grid item xs={4}>
                <FormControl fullWidth required>
                  <InputLabel id="edit-currency-label">Currency</InputLabel>
                  <Select
                    labelId="edit-currency-label"
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    label="Currency"
                    disabled={editLoading}
                  >
                    <MenuItem value="INR">INR (₹)</MenuItem>
                    <MenuItem value="USD">USD ($)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Expense Date"
                  type="date"
                  value={editExpenseDate}
                  onChange={(e) => setEditExpenseDate(e.target.value)}
                  required
                  fullWidth
                  disabled={editLoading}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel id="edit-paidby-label">Paid By</InputLabel>
                  <Select
                    labelId="edit-paidby-label"
                    value={editPaidBy}
                    onChange={(e) => setEditPaidBy(e.target.value)}
                    label="Paid By"
                    disabled={editLoading}
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
                  <InputLabel id="edit-participants-label">Split Between (Participants)</InputLabel>
                  <Select
                    labelId="edit-participants-label"
                    multiple
                    value={editParticipantIds}
                    onChange={(e) => setEditParticipantIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
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
                    disabled={editLoading}
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.userId}>
                        <Checkbox checked={editParticipantIds.indexOf(member.userId) > -1} />
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
              onClick={() => setEditOpen(false)} 
              disabled={editLoading}
              variant="text"
              sx={{ color: 'text.secondary' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={editLoading}
            >
              {editLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
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
            Are you sure you want to delete this expense?
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
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseDetails;
