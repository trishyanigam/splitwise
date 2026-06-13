import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import AuthLayout from '../layouts/AuthLayout.jsx';
import AppLayout from '../layouts/AppLayout/AppLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

// Lazy load page components
const Login = lazy(() => import('../pages/Auth/Login.jsx'));
const Register = lazy(() => import('../pages/Auth/Register.jsx'));
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard.jsx'));
const GroupsList = lazy(() => import('../pages/Groups/GroupsList.jsx'));
const CreateGroup = lazy(() => import('../pages/Groups/CreateGroup.jsx'));
const GroupDetails = lazy(() => import('../pages/Groups/GroupDetails.jsx'));

// Premium dynamic spinner layout fallback
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
    <CircularProgress color="primary" />
  </Box>
);

/**
 * Maps application paths using React Router DOM.
 * Integrates code-splitting using lazy-loaded routes inside a Suspense fallback boundary.
 */
export const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Authentication / Onboarding routes (redirects logged-in users away) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Authenticated Application routes (redirects unauthenticated users to /login) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/groups" element={<GroupsList />} />
            <Route path="/groups/create" element={<CreateGroup />} />
            <Route path="/groups/:groupId" element={<GroupDetails />} />
          </Route>
        </Route>

        {/* Redirect defaults */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
