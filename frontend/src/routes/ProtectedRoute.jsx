import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import useAuth from '../hooks/useAuth.js';

/**
 * Route protection wrapper. Checks validation state:
 * - Shows loader during session recovery.
 * - Redirects to /login if user is unauthorized.
 * - Renders children/Outlet routes if authenticated.
 */
export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          minHeight: '100vh', 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: '#0b0f19' 
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
