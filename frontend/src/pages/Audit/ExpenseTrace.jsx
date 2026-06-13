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
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet';
import FunctionsIcon from '@mui/icons-material/Functions';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { getExpenseTrace } from '../../services/balanceService.js';

export const ExpenseTrace = () => {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [traceData, setTraceData] = useState(null);

  const fetchTrace = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExpenseTrace(expenseId);
      if (data && data.success) {
        setTraceData(data.traceReport);
      } else {
        setError('Failed to fetch expense trace audit report.');
      }
    } catch (err) {
      console.error('Failed to load expense trace:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load expense trace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrace();
  }, [expenseId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !traceData) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/groups/${groupId}/expenses/${expenseId}`)}
          sx={{ mb: 3 }}
        >
          Back to Expense
        </Button>
        <Alert severity="error">{error || 'Trace data unavailable.'}</Alert>
      </Box>
    );
  }

  const { expenseDetails, participants, splitInformation, shareCalculations } = traceData;

  return (
    <Box>
      {/* Header section with back navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <IconButton
          onClick={() => navigate(`/groups/${groupId}/expenses/${expenseId}`)}
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
            Expense Audit Trace
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Verifying split logic and database conversions for: <strong>{expenseDetails.title}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Main Grid Content */}
      <Grid container spacing={4}>
        {/* Left Side Column: Expense Meta Details Card */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card 
              elevation={0}
              sx={{
                backgroundColor: 'background.paper',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(244, 63, 94, 0.1)', color: 'secondary.main', width: 40, height: 40 }}>
                    <ReceiptLongIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Expense Details
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {expenseDetails.title}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Original Bill Amount
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {expenseDetails.currency} {expenseDetails.amount.toFixed(2)}
                    </Typography>
                  </Box>

                  {expenseDetails.exchangeRate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Exchange Conversion Rate
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        1 {expenseDetails.currency} = ₹{expenseDetails.exchangeRate.toFixed(4)}
                      </Typography>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      INR Base Equivalent
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CurrencyRupeeIcon fontSize="inherit" />
                      {expenseDetails.convertedAmount.toFixed(2)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Paid By
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {expenseDetails.paidBy.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {expenseDetails.paidBy.email}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Transaction Date
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                      <CalendarTodayIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                        {new Date(expenseDetails.expenseDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Right Side Column: Validation, Splits, Math */}
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            
            {/* Split Information Summary */}
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
                <SettingsEthernetIcon color="secondary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Split Configuration Summary
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                    Split Type
                  </Typography>
                  <Chip 
                    label={splitInformation.splitType} 
                    color="secondary" 
                    size="small" 
                    sx={{ mt: 0.8, fontWeight: 700 }} 
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                    Registered Splits
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {splitInformation.totalParticipantsCount} users
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                    Active splitters
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {splitInformation.activeParticipantsCount} users
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                    Math Integrity
                  </Typography>
                  <Chip
                    icon={splitInformation.discrepancy === 0 ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                    label={splitInformation.discrepancy === 0 ? 'Verified' : `Diff: ${splitInformation.discrepancy}`}
                    color={splitInformation.discrepancy === 0 ? 'success' : 'warning'}
                    size="small"
                    sx={{ mt: 0.8, fontWeight: 700 }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Membership validation details table */}
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
                <CheckCircleIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Membership Validation Logs
                </Typography>
              </Box>
              <Divider />
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, pl: 3 }}>User Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, pr: 3 }}>Status on Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {participants.map((p) => (
                    <TableRow 
                      key={p.userId}
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' }
                      }}
                    >
                      <TableCell sx={{ pl: 3, fontWeight: 600 }}>{p.userName}</TableCell>
                      <TableCell color="text.secondary">{p.userEmail}</TableCell>
                      <TableCell align="center" sx={{ pr: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8 }}>
                          {p.isActiveOnDate ? (
                            <Chip 
                              icon={<CheckCircleIcon sx={{ fontSize: '14px' }} />}
                              label="Active Member" 
                              color="success" 
                              size="small" 
                              variant="outlined"
                              sx={{ fontWeight: 700 }}
                            />
                          ) : (
                            <Chip 
                              icon={<ErrorOutlineIcon sx={{ fontSize: '14px' }} />}
                              label="Inactive (Left/Joined Late)" 
                              color="error" 
                              size="small" 
                              variant="outlined"
                              sx={{ fontWeight: 700 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Detailed math calculations */}
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
                <FunctionsIcon color="secondary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Share Calculations Formula Trace
                </Typography>
              </Box>
              <Divider />
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, pl: 3 }}>User Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Formula Details</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Share ({expenseDetails.currency})</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Share (INR)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shareCalculations.map((calc) => (
                    <TableRow 
                      key={calc.userId}
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' }
                      }}
                    >
                      <TableCell sx={{ pl: 3, fontWeight: 700 }}>{calc.userName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                        {calc.calculationFormula}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {expenseDetails.currency} {calc.calculatedShare.toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 3, fontWeight: 800, color: 'primary.main' }}>
                        ₹{calc.calculatedShareINR.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExpenseTrace;
