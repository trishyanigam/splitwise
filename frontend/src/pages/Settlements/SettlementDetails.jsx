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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import InfoIcon from '@mui/icons-material/Info';
import { toast } from 'react-hot-toast';
import { getGroupById } from '../../services/groupService.js';
import { getSettlementById, deleteSettlement } from '../../services/settlementService.js';

export const SettlementDetails = () => {
  const { groupId, id: settlementId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete Dialog States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [groupRes, settlementRes] = await Promise.all([
        getGroupById(groupId),
        getSettlementById(groupId, settlementId)
      ]);

      if (groupRes && groupRes.group) {
        setGroup(groupRes.group);
      }
      if (settlementRes && settlementRes.settlement) {
        setSettlement(settlementRes.settlement);
      }
    } catch (err) {
      console.error('Failed to load settlement details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to retrieve settlement details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [groupId, settlementId]);

  const handleDeleteClick = () => {
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      await deleteSettlement(groupId, settlementId);
      toast.success('Settlement record deleted successfully.');
      setDeleteOpen(false);
      navigate(`/groups/${groupId}/settlements`);
    } catch (err) {
      console.error('Failed to delete settlement:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete settlement.');
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
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD'
    }).format(parseFloat(amount) || 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !settlement) {
    return (
      <Box>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(`/groups/${groupId}/settlements`)} 
          sx={{ mb: 3 }}
        >
          Back to Settlements
        </Button>
        <Alert severity="error">{error || 'Settlement record not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
              Settlement Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review transaction details inside <strong>{group?.name}</strong>
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDeleteClick}
          sx={{ fontWeight: 600 }}
        >
          Delete Settlement
        </Button>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={4}>
        {/* Left Column: Transaction Metadata Card */}
        <Grid item xs={12} md={7}>
          <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 }, flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Transaction Summary
              </Typography>
              <Typography variant="h4" component="h2" sx={{ fontWeight: 800, mb: 2 }}>
                Settle Balance Payment
              </Typography>
              
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.7 }}>
                {settlement.notes || 'No notes or comments were recorded for this settlement payment.'}
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
                        {formatCurrencyAmount(settlement.amount, settlement.currency)}
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
                        ₹{settlement.convertedAmount !== null && settlement.convertedAmount !== undefined
                          ? Number(settlement.convertedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : Number(settlement.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
                        {settlement.exchangeRate !== null && settlement.exchangeRate !== undefined
                          ? `1 ${settlement.currency} = ${Number(settlement.exchangeRate).toFixed(4)} INR`
                          : `1 ${settlement.currency} = 1.0000 INR`
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Settlement Date */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CalendarTodayIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Payment Date
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {formatDate(settlement.settlementDate)}
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
                        {formatDateTime(settlement.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Payer & Receiver Cards */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Payer Card */}
            <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Paid By (Payer)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 800, width: 44, height: 44 }}>
                    {settlement.payer?.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {settlement.payer?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {settlement.payer?.email}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Receiver Card */}
            <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Received By (Receiver)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', fontWeight: 800, width: 44, height: 44 }}>
                    {settlement.receiver?.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {settlement.receiver?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {settlement.receiver?.email}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

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
            This action will delete the settlement permanently.
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

export default SettlementDetails;
