import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  CircularProgress, 
  Alert, 
  Avatar, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText,
  Divider,
  Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import { toast } from 'react-hot-toast';
import { getGroupById } from '../../services/groupService.js';
import { getMembers } from '../../services/membershipService.js';
import { 
  getSettlements, 
  createSettlement, 
  deleteSettlement 
} from '../../services/settlementService.js';

export const SettlementsList = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create Dialog States
  const [createOpen, setCreateOpen] = useState(false);
  const [payerId, setPayerId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // View Dialog States
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  // Delete Dialog States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupRes, settlementsRes, membersRes] = await Promise.all([
        getGroupById(groupId),
        getSettlements(groupId),
        getMembers(groupId)
      ]);

      if (groupRes && groupRes.group) {
        setGroup(groupRes.group);
      }
      if (settlementsRes && settlementsRes.settlements) {
        setSettlements(settlementsRes.settlements);
      }
      if (membersRes && membersRes.members) {
        setMembers(membersRes.members);
      }
    } catch (err) {
      console.error('Failed to load settlements dashboard details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setPayerId('');
    setReceiverId('');
    setAmount('');
    setCurrency('USD');
    setSettlementDate(new Date().toISOString().substring(0, 10));
    setNotes('');
    setCreateOpen(true);
  };

  // Submit Create Settlement
  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    if (!payerId || !receiverId) {
      toast.error('Payer and receiver are required fields.');
      return;
    }

    if (payerId === receiverId) {
      toast.error('Payer and receiver must be different members.');
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Amount must be a positive number greater than 0.');
      return;
    }

    const payload = {
      payerId: parseInt(payerId, 10),
      receiverId: parseInt(receiverId, 10),
      amount: amt,
      currency,
      settlementDate,
      notes: notes.trim() || null
    };

    try {
      setCreateLoading(true);
      await createSettlement(groupId, payload);
      toast.success('Settlement payment recorded successfully!');
      setCreateOpen(false);
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Failed to save settlement:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to record settlement.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Open View Dialog
  const handleOpenView = (settlement) => {
    setSelectedSettlement(settlement);
    setViewOpen(true);
  };

  // Open Delete Dialog
  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  // Confirm Delete Settlement
  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      await deleteSettlement(groupId, deleteId);
      toast.success('Settlement record deleted.');
      setDeleteOpen(false);
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Failed to delete settlement:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete record.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrencyAmount = (amount, currencyCode) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode || 'USD'
    }).format(parseFloat(amount) || 0);
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
    <Box>
      {/* Header Panel */}
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
              Settlements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review and record settled payments in <strong>{group.name}</strong>
            </Typography>
          </Box>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<PaymentIcon />}
          onClick={handleOpenCreate}
          sx={{ fontWeight: 700, px: 3 }}
        >
          Record Settlement
        </Button>
      </Box>

      {/* Settlements Table Container */}
      <TableContainer 
        component={Paper} 
        variant="outlined" 
        sx={{ 
          backgroundColor: 'background.paper', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: '16px' 
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
              <TableCell>Payer</TableCell>
              <TableCell>Receiver</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell>Settlement Date</TableCell>
              <TableCell align="center" sx={{ width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settlements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No settlements recorded in this group yet. Settlement logs settle active balances.
                </TableCell>
              </TableRow>
            ) : (
              settlements.map((settlement) => (
                <TableRow 
                  key={settlement.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  {/* Payer */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 28, height: 28, fontSize: '0.75rem' }}>
                        {settlement.payer?.name?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {settlement.payer?.name}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Receiver */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', width: 28, height: 28, fontSize: '0.75rem' }}>
                        {settlement.receiver?.name?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {settlement.receiver?.name}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Amount */}
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {formatCurrencyAmount(settlement.amount, settlement.currency)}
                  </TableCell>

                  {/* Currency */}
                  <TableCell>{settlement.currency}</TableCell>

                  {/* Date */}
                  <TableCell>{formatDate(settlement.settlementDate)}</TableCell>

                  {/* Actions */}
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <IconButton 
                        size="small" 
                        color="secondary"
                        onClick={() => handleOpenView(settlement)}
                        sx={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleOpenDelete(settlement.id)}
                        sx={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Record Settlement Dialog */}
      <Dialog 
        open={createOpen} 
        onClose={() => !createLoading && setCreateOpen(false)}
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
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Record Settlement Payment</DialogTitle>
          <DialogContent sx={{ py: 1 }}>
            <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
              {/* Payer */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel id="payer-select-label">Payer (Who Paid)</InputLabel>
                  <Select
                    labelId="payer-select-label"
                    value={payerId}
                    onChange={(e) => setPayerId(e.target.value)}
                    label="Payer (Who Paid)"
                    disabled={createLoading}
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.userId}>
                        {member.user?.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Receiver */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel id="receiver-select-label">Receiver (Who Received)</InputLabel>
                  <Select
                    labelId="receiver-select-label"
                    value={receiverId}
                    onChange={(e) => setReceiverId(e.target.value)}
                    label="Receiver (Who Received)"
                    disabled={createLoading}
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.userId}>
                        {member.user?.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Amount */}
              <Grid item xs={8}>
                <TextField
                  label="Amount Paid"
                  type="number"
                  required
                  fullWidth
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={createLoading}
                  slotProps={{
                    htmlInput: { step: '0.01', min: '0.01' }
                  }}
                  placeholder="0.00"
                />
              </Grid>

              {/* Currency */}
              <Grid item xs={4}>
                <FormControl fullWidth required>
                  <InputLabel id="currency-select-label">Currency</InputLabel>
                  <Select
                    labelId="currency-select-label"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    label="Currency"
                    disabled={createLoading}
                  >
                    <MenuItem value="INR">INR (₹)</MenuItem>
                    <MenuItem value="USD">USD ($)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Date */}
              <Grid item xs={12}>
                <TextField
                  label="Settlement Date"
                  type="date"
                  required
                  fullWidth
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  disabled={createLoading}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  label="Notes / Comments (Optional)"
                  fullWidth
                  multiline
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={createLoading}
                  placeholder="e.g. Settle grocery balance"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button 
              onClick={() => setCreateOpen(false)} 
              disabled={createLoading}
              variant="text"
              sx={{ color: 'text.secondary' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={createLoading}
            >
              {createLoading ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Settlement Detail Dialog */}
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
              p: 1,
              minWidth: { xs: '90%', sm: 400 }
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Settlement Details</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          {selectedSettlement && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, px: 2, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <Typography variant="body2" color="text.secondary">Amount Settle</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {formatCurrencyAmount(selectedSettlement.amount, selectedSettlement.currency)}
                </Typography>
              </Box>

              <Divider />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">Paid By (Payer)</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {selectedSettlement.payer?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                    {selectedSettlement.payer?.email}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">Received By (Receiver)</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {selectedSettlement.receiver?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                    {selectedSettlement.receiver?.email}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" display="block">Settlement Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {formatDate(selectedSettlement.settlementDate)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" display="block">Notes</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {selectedSettlement.notes || 'No notes logged for this payment.'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={() => setViewOpen(false)} variant="contained" color="primary">
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
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Delete Settlement Log</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Typography variant="body1">
            Are you sure you want to delete this settlement record?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1.5, fontWeight: 500 }}>
            This action will remove the record permanently. Ensure this is correct.
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

export default SettlementsList;
