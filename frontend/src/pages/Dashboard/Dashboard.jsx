import React from 'react';
import { Card, CardContent, Typography, Box, Divider } from '@mui/material';
import Grid from '@mui/material/Grid';
import GroupIcon from '@mui/icons-material/Group';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import useAuth from '../../hooks/useAuth.js';

/**
 * Dashboard landing panel located in pages/Dashboard.
 * Renders statistical metrics cards representing group tallies,
 * expense bills, amount owed, and receivable balances.
 */
export const Dashboard = () => {
  const { user } = useAuth();

  // Mock stat figures
  const stats = {
    totalGroups: 4,
    totalExpenses: 840.50,
    amountOwed: 150.00,
    amountToReceive: 280.25,
  };

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
      value: `$${stats.totalExpenses.toFixed(2)}`,
      icon: <ReceiptIcon sx={{ fontSize: 40, color: '#3b82f6' }} />,
      bgColor: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(0, 0, 0, 0) 100%)',
      borderColor: 'rgba(59, 130, 246, 0.15)',
    },
    {
      title: 'Amount Owed',
      value: `$${stats.amountOwed.toFixed(2)}`,
      icon: <ArrowDownwardIcon sx={{ fontSize: 40, color: '#ef4444' }} />,
      bgColor: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(0, 0, 0, 0) 100%)',
      borderColor: 'rgba(239, 68, 68, 0.15)',
    },
    {
      title: 'Amount To Receive',
      value: `$${stats.amountToReceive.toFixed(2)}`,
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
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No recent activity. Active expenses and split balances will populate here when you create groups.
            </Typography>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
