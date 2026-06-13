import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { getUserBalanceBreakdown } from '../../services/balanceService.js';
import { getGroupById } from '../../services/groupService.js';
import { getMembers } from '../../services/membershipService.js';

export const BalanceBreakdown = () => {
  const { groupId, userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data States
  const [report, setReport] = useState(null);
  const [group, setGroup] = useState(null);
  const [auditedUser, setAuditedUser] = useState(null);
  
  // Tab State: 0 = Expenses, 1 = Settlements
  const [activeTab, setActiveTab] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch group details, members, and the specific user's balance breakdown in parallel
      const [groupRes, membersRes, breakdownRes] = await Promise.all([
        getGroupById(groupId),
        getMembers(groupId),
        getUserBalanceBreakdown(groupId, userId)
      ]);

      if (groupRes && groupRes.group) {
        setGroup(groupRes.group);
      }

      if (membersRes && membersRes.members) {
        const found = membersRes.members.find(m => m.userId === parseInt(userId, 10));
        if (found && found.user) {
          setAuditedUser(found.user);
        } else {
          // If not found in active members, try owner
          if (groupRes.group && groupRes.group.ownerId === parseInt(userId, 10)) {
            setAuditedUser(groupRes.group.owner);
          }
        }
      }

      if (breakdownRes && breakdownRes.success) {
        setReport(breakdownRes.report);
      } else {
        setError('Could not retrieve audit report data.');
      }
    } catch (err) {
      console.error('Failed to load balance breakdown:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load audit breakdown.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId, userId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/groups/${groupId}/balances`)}
          sx={{ mb: 3 }}
        >
          Back to Balances
        </Button>
        <Alert severity="error">{error || 'Failed to load report.'}</Alert>
      </Box>
    );
  }

  const { expenses = [], settlements = [], totalExpenseShare = 0, totalSettlements = 0, finalBalance = 0 } = report;
  const userName = auditedUser ? auditedUser.name : `User #${userId}`;
  const userEmail = auditedUser ? auditedUser.email : '';

  return (
    <Box>
      {/* Header section with back button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <IconButton
          onClick={() => navigate(`/groups/${groupId}/balances`)}
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
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Balance Breakdown
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Audit Trail for <strong>{userName}</strong> in <strong>{group?.name || `Group #${groupId}`}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Grid of Totals Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Owed Shares Card */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={0}
            sx={{
              backgroundColor: 'background.paper',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Expense Share
                </Typography>
                <Avatar sx={{ bgcolor: 'rgba(244, 63, 94, 0.1)', color: 'secondary.main', width: 36, height: 36 }}>
                  <ReceiptIcon fontSize="small" />
                </Avatar>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                ₹{totalExpenseShare.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Cumulative shares user is split into
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Settlements Adjustments Card */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={0}
            sx={{
              backgroundColor: 'background.paper',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Settlements Adjusted
                </Typography>
                <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: 'success.main', width: 36, height: 36 }}>
                  <PaymentIcon fontSize="small" />
                </Avatar>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                ₹{Math.abs(totalSettlements).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Net adjustment: {totalSettlements >= 0 ? 'Credited (Paid Out)' : 'Debited (Received)'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Final Balance Card */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={0}
            sx={{
              backgroundColor: 'background.paper',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                backgroundColor: finalBalance > 0 ? '#10b981' : finalBalance < 0 ? '#ef4444' : 'text.secondary'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Final Ledger Balance
                </Typography>
                <Avatar sx={{ bgcolor: finalBalance >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: finalBalance >= 0 ? '#10b981' : '#ef4444', width: 36, height: 36 }}>
                  <AccountBalanceWalletIcon fontSize="small" />
                </Avatar>
              </Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 800, 
                  color: finalBalance > 0 ? '#10b981' : finalBalance < 0 ? '#ef4444' : 'text.primary' 
                }}
              >
                {finalBalance > 0 ? '+' : ''}₹{finalBalance.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {finalBalance > 0 ? 'Owed to the user' : finalBalance < 0 ? 'User owes to group' : 'Perfectly settled'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Details breakdown section */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: 'background.paper',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          overflow: 'hidden',
          mb: 4
        }}
      >
        <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', px: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, val) => setActiveTab(val)}
            sx={{ 
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                py: 2,
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main'
                }
              }
            }}
          >
            <Tab label={`Expense Contributions (${expenses.length})`} />
            <Tab label={`Settlement Contributions (${settlements.length})`} />
          </Tabs>
        </Box>

        {activeTab === 0 ? (
          <Box>
            {expenses.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No expense records involving this user.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, pl: 3 }}>Expense Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total Bill</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>User's Share</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenses.map((exp, idx) => (
                      <TableRow 
                        key={idx}
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' }
                        }}
                      >
                        <TableCell sx={{ pl: 3 }}>
                          {new Date(exp.expenseDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {exp.title}
                        </TableCell>
                        <TableCell align="right">
                          ₹{exp.amount.toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={{ pr: 3, fontWeight: 700, color: 'secondary.main' }}>
                          ₹{exp.shareAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ) : (
          <Box>
            {settlements.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No settlement records involving this user.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, pl: 3 }}>Settlement Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Payer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Receiver</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Impact Effect</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {settlements.map((settle, idx) => {
                      const isCredit = settle.effect === 'CREDIT';
                      return (
                        <TableRow 
                          key={idx}
                          sx={{
                            '&:last-child td, &:last-child th': { border: 0 },
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' }
                          }}
                        >
                          <TableCell sx={{ pl: 3 }}>
                            {new Date(settle.settlementDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {settle.payerName || `User #${settle.payerId}`}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {settle.receiverName || `User #${settle.receiverId}`}
                          </TableCell>
                          <TableCell align="center">
                            <Box 
                              component="span" 
                              sx={{ 
                                fontSize: '11px', 
                                px: 1.2, 
                                py: 0.4, 
                                borderRadius: '4px', 
                                fontWeight: 800,
                                color: isCredit ? '#10b981' : '#ef4444',
                                bgcolor: isCredit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                              }}
                            >
                              {settle.effect}
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 3, fontWeight: 700, color: isCredit ? '#10b981' : '#ef4444' }}>
                            {isCredit ? '+' : '-'}₹{settle.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default BalanceBreakdown;
