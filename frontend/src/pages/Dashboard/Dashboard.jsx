import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Divider, 
  CircularProgress, 
  Alert, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar 
} from '@mui/material';
import Grid from '@mui/material/Grid';
import GroupIcon from '@mui/icons-material/Group';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import PaymentIcon from '@mui/icons-material/Payment';
import useAuth from '../../hooks/useAuth.js';
import { getUserSummary } from '../../services/balanceService.js';

/**
 * Dashboard landing panel located in pages/Dashboard.
 * Renders statistical metrics cards representing group tallies,
 * expense bills, amount owed, and receivable balances.
 */
export const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalExpenses: 0.00,
    amountOwed: 0.00,
    amountToReceive: 0.00,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserSummary();
        if (data && data.summary) {
          setStats({
            totalGroups: data.summary.totalGroups || 0,
            totalExpenses: data.summary.totalExpensesAmount || 0.00,
            amountOwed: data.summary.amountOwed || 0.00,
            amountToReceive: data.summary.amountToReceive || 0.00,
          });
          setRecentActivity(data.recentActivity || []);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
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

  const statCards = [
    {
      title: 'Total Groups',
      value: stats.totalGroups,
      icon: <GroupIcon sx={{ fontSize: 40, color: '#6366f1' }} />,
      bgColor: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(0, 0, 0, 0) 100%)',
      borderColor: 'rgba(99, 102, 241, 0.15)',
    },
    {
      title: 'Total Expenses',
      value: `₹${stats.totalExpenses.toFixed(2)}`,
      icon: <ReceiptIcon sx={{ fontSize: 40, color: '#3b82f6' }} />,
      bgColor: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(0, 0, 0, 0) 100%)',
      borderColor: 'rgba(59, 130, 246, 0.15)',
    },
    {
      title: 'Amount Owed',
      value: `₹${stats.amountOwed.toFixed(2)}`,
      icon: <ArrowDownwardIcon sx={{ fontSize: 40, color: '#ef4444' }} />,
      bgColor: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(0, 0, 0, 0) 100%)',
      borderColor: 'rgba(239, 68, 68, 0.15)',
    },
    {
      title: 'Amount To Receive',
      value: `₹${stats.amountToReceive.toFixed(2)}`,
      icon: <ArrowUpwardIcon sx={{ fontSize: 40, color: '#10b981' }} />,
      bgColor: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(0, 0, 0, 0) 100%)',
      borderColor: 'rgba(16, 185, 129, 0.15)',
    },
  ];

  return (
    <Box>
      {/* Header Segment */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
          Welcome back, {user?.name || 'User'}!
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Here is a summary of your active balances and group expenses.
        </Typography>
      </Box>

      {/* Grid mapping statistical cards */}
      <Grid container spacing={3}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card 
              sx={{ 
                height: '100%', 
                background: card.bgColor,
                border: `1px solid ${card.borderColor}`,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
                }
              }}
            >
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
                    {card.title}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {card.value}
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
                  {card.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity Segment */}
      <Box sx={{ mt: 5 }}>
        <Card sx={{ p: 4, background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 255, 255, 0) 100%)' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Recent Activity
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {recentActivity.length === 0 ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No recent activity. Active expenses and split balances will populate here when you create groups.
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {recentActivity.map((act) => {
                const isExpense = act.type === 'EXPENSE';
                return (
                  <ListItem
                    key={act.id}
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.03)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        borderColor: 'rgba(255, 255, 255, 0.06)'
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: isExpense ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                        color: isExpense ? '#3b82f6' : '#10b981', 
                        width: 40, 
                        height: 40 
                      }}>
                        {isExpense ? <ReceiptIcon /> : <PaymentIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {act.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {act.groupName} • {new Date(act.date).toLocaleDateString()}
                        </Typography>
                      }
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isExpense ? 'primary.main' : 'success.main' }}>
                        ₹{Number(act.amount).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {act.description}
                      </Typography>
                    </Box>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
