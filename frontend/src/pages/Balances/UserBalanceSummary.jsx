import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Avatar
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import GroupIcon from '@mui/icons-material/Group';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getUserSummary } from '../../services/balanceService.js';
import useAuth from '../../hooks/useAuth.js';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';


/**
 * UserBalanceSummary page component renders overall owe/receive metrics
 * for the logged-in user across all active groups.
 */
export const UserBalanceSummary = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    totalGroups: 0,
    amountOwed: 0,
    amountToReceive: 0,
    netBalance: 0
  });
  const [groupBalances, setGroupBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getUserSummary();
      if (data) {
        setSummary(data.summary || {
          totalGroups: 0,
          amountOwed: 0,
          amountToReceive: 0,
          netBalance: 0
        });
        setGroupBalances(data.groupBalances || []);
      }
    } catch (err) {
      console.error('Failed to fetch user balance summary:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load balance summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const { totalGroups, amountOwed, amountToReceive, netBalance } = summary;

  // Metric cards configurations
  const metrics = [
    {
      title: 'Total Owes',
      value: `₹${amountOwed.toFixed(2)}`,
      description: 'You owe others',
      icon: <ArrowDownwardIcon sx={{ fontSize: 40, color: '#ef4444' }} />,
      bgColor: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(0, 0, 0, 0) 100%)',
      borderColor: 'rgba(239, 68, 68, 0.15)',
      textColor: '#ef4444'
    },
    {
      title: 'Total Receivable',
      value: `₹${amountToReceive.toFixed(2)}`,
      description: 'Others owe you',
      icon: <ArrowUpwardIcon sx={{ fontSize: 40, color: '#10b981' }} />,
      bgColor: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(0, 0, 0, 0) 100%)',
      borderColor: 'rgba(16, 185, 129, 0.15)',
      textColor: '#10b981'
    },
    {
      title: 'Net Balance',
      value: `${netBalance >= 0 ? '+' : ''}₹${netBalance.toFixed(2)}`,
      description: netBalance >= 0 ? 'Net positive' : 'Net negative',
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 40, color: netBalance >= 0 ? '#10b981' : '#ef4444' }} />,
      bgColor: netBalance >= 0 
        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(0, 0, 0, 0) 100%)' 
        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(0, 0, 0, 0) 100%)',
      borderColor: netBalance >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
      textColor: netBalance >= 0 ? '#10b981' : '#ef4444'
    }
  ];

  return (
    <Box>
      {/* Header Panel */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
            Balances Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Summary of your active ledger standings across all <strong>{totalGroups}</strong> group memberships.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CloudUploadIcon />}
          onClick={() => navigate('/import')}
          sx={{ fontWeight: 600 }}
        >
          Import Expenses CSV
        </Button>
      </Box>

      {/* Grid of Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {metrics.map((m) => (
          <Grid item xs={12} sm={4} key={m.title}>
            <Card
              sx={{
                height: '100%',
                background: m.bgColor,
                border: `1px solid ${m.borderColor}`,
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
                    {m.title}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: m.textColor, letterSpacing: '-0.02em', mb: 0.5 }}>
                    {m.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {m.description}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {m.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Group Breakdowns List */}
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: 'background.paper',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GroupIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Group Breakdown
          </Typography>
        </Box>
        <Divider />

        <Table>
          <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, pl: 3 }}>Group Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Balance</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupBalances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    You are not a member of any groups yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              groupBalances.map((row) => {
                const isPositive = row.balance > 0;
                const isNegative = row.balance < 0;

                return (
                  <TableRow
                    key={row.groupId}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.01)'
                      }
                    }}
                  >
                    {/* Group Name cell */}
                    <TableCell sx={{ pl: 3, py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', width: 36, height: 36 }}>
                          <GroupIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {row.groupName}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Status cell */}
                    <TableCell sx={{ py: 2 }}>
                      {isPositive && (
                        <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>
                          You are owed
                        </Typography>
                      )}
                      {isNegative && (
                        <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 600 }}>
                          You owe
                        </Typography>
                      )}
                      {!isPositive && !isNegative && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          Settled up
                        </Typography>
                      )}
                    </TableCell>

                    {/* Balance cell */}
                    <TableCell align="right" sx={{ py: 2 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          color: isPositive ? '#10b981' : isNegative ? '#ef4444' : 'text.primary'
                        }}
                      >
                        {isPositive ? '+' : ''}₹{row.balance.toFixed(2)}
                      </Typography>
                    </TableCell>

                    {/* Actions cell */}
                    <TableCell align="right" sx={{ pr: 3, py: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          variant="text"
                          size="small"
                          startIcon={<OpenInNewIcon fontSize="small" />}
                          onClick={() => navigate(`/groups/${row.groupId}/balances`)}
                          sx={{ fontWeight: 600 }}
                        >
                          View Ledgers
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => navigate(`/groups/${row.groupId}/audit/${user?.id}`)}
                          sx={{ fontWeight: 600 }}
                        >
                          View Breakdown
                        </Button>
                      </Box>
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

export default UserBalanceSummary;
