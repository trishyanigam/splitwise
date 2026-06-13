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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import api from '../../services/api.js';
import { getGroupBalances } from '../../services/balanceService.js';

/**
 * GroupBalances component renders the net balances table and simplified debts list
 * for a specific group based on calculated backend ledger outcomes.
 */
export const GroupBalances = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [balances, setBalances] = useState([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupName, setGroupName] = useState('');

  const fetchBalances = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch group details to display the group name
      const groupRes = await api.get(`/groups/${groupId}`);
      if (groupRes.data && groupRes.data.group) {
        setGroupName(groupRes.data.group.name);
      }

      // Fetch balances calculations via service
      const balanceData = await getGroupBalances(groupId);
      if (balanceData) {
        setBalances(balanceData.balances || []);
        setSimplifiedDebts(balanceData.simplifiedDebts || []);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load balances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [groupId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/groups/${groupId}`)}
          sx={{ mb: 3 }}
        >
          Back to Group
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header segment with navigation controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
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
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Group Balances
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Net ledger status for <strong>{groupName || `Group #${groupId}`}</strong>
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Left Grid Column: Balances Table */}
        <Grid item xs={12} md={7}>
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
              <AccountBalanceIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Balances Summary
              </Typography>
            </Box>
            <Divider />
            
            <Table>
              <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, pl: 3 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Net Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {balances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No members or balances found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  balances.map((row) => {
                    const isPositive = row.balance > 0;
                    const isNegative = row.balance < 0;
                    
                    return (
                      <TableRow 
                        key={row.userId}
                        sx={{ 
                          '&:last-child td, &:last-child th': { border: 0 },
                          transition: 'background-color 0.2s',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.01)'
                          }
                        }}
                      >
                        <TableCell sx={{ pl: 3, py: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: isPositive ? 'rgba(16, 185, 129, 0.1)' : isNegative ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)', color: isPositive ? '#10b981' : isNegative ? '#ef4444' : 'text.primary', width: 36, height: 36, fontWeight: 700 }}>
                              {row.userName?.[0]?.toUpperCase() || 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {row.userName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {row.userEmail}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell sx={{ py: 2 }}>
                          {isPositive && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#10b981' }}>
                              <ArrowUpwardIcon fontSize="small" />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                should receive
                              </Typography>
                            </Box>
                          )}
                          {isNegative && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#ef4444' }}>
                              <ArrowDownwardIcon fontSize="small" />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                owes money
                              </Typography>
                            </Box>
                          )}
                          {!isPositive && !isNegative && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary' }}>
                              <CheckCircleIcon fontSize="small" color="disabled" />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Settled up
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        
                        <TableCell align="right" sx={{ pr: 3, py: 2 }}>
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Right Grid Column: Debt Simplification */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: 'background.paper',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <SwapHorizIcon color="secondary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Suggested Settlements
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {simplifiedDebts.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
                <CheckCircleIcon sx={{ fontSize: 44, color: '#10b981', mb: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  All Settled Up!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No debts are active. Everybody has resolved their balances.
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {simplifiedDebts.map((debt, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      px: 2,
                      py: 1.8,
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                      <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700 }}>
                        {debt.fromUserName?.[0]?.toUpperCase()}
                      </Avatar>
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                          {debt.fromUserName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          owes {debt.toUserName}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ pr: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          ₹{debt.amount.toFixed(2)}
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700 }}>
                        {debt.toUserName?.[0]?.toUpperCase()}
                      </Avatar>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GroupBalances;
