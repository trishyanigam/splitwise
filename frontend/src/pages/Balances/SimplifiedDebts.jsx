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
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaymentIcon from '@mui/icons-material/Payment';
import { getSimplifiedDebts } from '../../services/balanceService.js';
import { getGroupById } from '../../services/groupService.js';
import { getMembers } from '../../services/membershipService.js';
import { getExpenses } from '../../services/expenseService.js';
import { getSettlements } from '../../services/settlementService.js';
import { DebtSummaryCard } from '../../components/DebtSummaryCard.jsx';

/**
 * SimplifiedDebts component renders optimized transfer details
 * suggesting who pays whom to clear all debts within the group.
 */
export const SimplifiedDebts = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [totalMembers, setTotalMembers] = useState(0);
  const [rawTransactionsCount, setRawTransactionsCount] = useState(0);

  const fetchDebtsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch group details, members, expenses, settlements and optimized debts in parallel
      const [groupRes, membersRes, expensesRes, settlementsRes, debtsRes] = await Promise.all([
        getGroupById(groupId),
        getMembers(groupId),
        getExpenses(groupId),
        getSettlements(groupId),
        getSimplifiedDebts(groupId)
      ]);

      if (groupRes && groupRes.group) {
        setGroupName(groupRes.group.name);
      }

      if (membersRes && membersRes.members) {
        setTotalMembers(membersRes.members.length);
      }

      const rawCount = (expensesRes?.expenses?.length || 0) + (settlementsRes?.settlements?.length || 0);
      setRawTransactionsCount(rawCount);

      if (debtsRes && debtsRes.simplifiedDebts) {
        setDebts(debtsRes.simplifiedDebts || []);
      }
    } catch (err) {
      console.error('Failed to fetch simplified debts:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load debt records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtsData();
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
          onClick={() => navigate(`/groups/${groupId}/balances`)}
          sx={{ mb: 3 }}
        >
          Back to Balances
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const transactionCount = debts.length;

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
            Simplified Debts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Suggested payments to settle up for <strong>{groupName || `Group #${groupId}`}</strong>
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Metric summary card */}
        <Grid item xs={12}>
          <DebtSummaryCard
            totalMembers={totalMembers}
            rawTransactionsCount={rawTransactionsCount}
            simplifiedTransactionsCount={debts.length}
          />
        </Grid>

        {/* Detailed Transactions List Table */}
        <Grid item xs={12}>
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
              <PaymentIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Suggested Payments
              </Typography>
            </Box>
            <Divider />

            {transactionCount === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  All Settled Up!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No debts are active in this group.
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, pl: 3 }}>Who Pays</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Direction</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Who Receives</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {debts.map((row, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.01)'
                        }
                      }}
                    >
                      {/* Payer cell */}
                      <TableCell sx={{ pl: 3, py: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 700 }}>
                            {row.fromUserName?.[0]?.toUpperCase()}
                          </Avatar>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {row.fromUserName}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Direction cell */}
                      <TableCell align="center" sx={{ py: 2.5, color: 'text.secondary' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>
                            PAYS
                          </Typography>
                          <SwapHorizIcon fontSize="small" />
                        </Box>
                      </TableCell>

                      {/* Receiver cell */}
                      <TableCell sx={{ py: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 700 }}>
                            {row.toUserName?.[0]?.toUpperCase()}
                          </Avatar>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {row.toUserName}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Amount cell */}
                      <TableCell align="right" sx={{ pr: 3, py: 2.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                          ₹{row.amount.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SimplifiedDebts;
