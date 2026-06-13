import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout.jsx';
import AppLayout from '../layouts/AppLayout/AppLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import Login from '../pages/Auth/Login.jsx';
import Register from '../pages/Auth/Register.jsx';
import Dashboard from '../pages/Dashboard/Dashboard.jsx';

/**
 * Maps application paths using React Router DOM.
 * Restricts access to dashboard for anonymous users,
 * and redirects authenticated users away from the login/register forms.
 */
export const AppRoutes = () => {
  return (
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
        </Route>
      </Route>

      {/* Redirect defaults */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
