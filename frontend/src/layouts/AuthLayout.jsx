import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, Container, Card, Typography, CircularProgress } from '@mui/material';
import useAuth from '../hooks/useAuth.js';

/**
 * Centered authentication layout displaying forms in a responsive, modern card.
 * Redirects users who are already logged in to the dashboard page.
 */
export const AuthLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0f19' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.08) 0%, rgba(0, 0, 0, 0) 50%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.08) 0%, rgba(0, 0, 0, 0) 50%), #0b0f19',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
              mb: 2,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>$</Typography>
          </Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 800, 
              letterSpacing: '-0.025em', 
              background: 'linear-gradient(90deg, #10b981, #6366f1)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}
          >
            Splitwise Shared Expense
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Enterprise bill-splitting and group expense manager.
          </Typography>
        </Box>
        <Card sx={{ p: { xs: 3, md: 5 } }}>
          <Outlet />
        </Card>
      </Container>
    </Box>
  );
};

export default AuthLayout;
