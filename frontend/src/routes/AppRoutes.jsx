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
const MembersPage = lazy(() => import('../pages/Groups/MembersPage.jsx'));
const GroupBalances = lazy(() => import('../pages/Balances/GroupBalances.jsx'));
const UserBalanceSummary = lazy(() => import('../pages/Balances/UserBalanceSummary.jsx'));
const ExpensesList = lazy(() => import('../pages/Expenses/ExpensesList.jsx'));
const CreateExpense = lazy(() => import('../pages/Expenses/CreateExpense.jsx'));
const ExpenseDetails = lazy(() => import('../pages/Expenses/ExpenseDetails.jsx'));
const SettlementsList = lazy(() => import('../pages/Settlements/SettlementsList.jsx'));
const CreateSettlement = lazy(() => import('../pages/Settlements/CreateSettlement.jsx'));
const SettlementDetails = lazy(() => import('../pages/Settlements/SettlementDetails.jsx'));

// Premium dynamic spinner layout fallback
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
    <CircularProgress color="primary" />
  </Box>
);

/**
 * React Router configuration mapping application paths.
 * Utilizes code-splitting via lazy loading and secures authentication routes.
 */
export const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public authentication / onboarding routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected Application Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Groups Management */}
            <Route path="/groups" element={<GroupsList />} />
            <Route path="/groups/create" element={<CreateGroup />} />
            <Route path="/groups/:groupId" element={<GroupDetails />} />
            <Route path="/groups/:groupId/members" element={<MembersPage />} />
            <Route path="/groups/:groupId/balances" element={<GroupBalances />} />
            
            {/* Expenses Management */}
            <Route path="/groups/:groupId/expenses" element={<ExpensesList />} />
            <Route path="/groups/:groupId/expenses/create" element={<CreateExpense />} />
            <Route path="/groups/:groupId/expenses/:expenseId" element={<ExpenseDetails />} />
            
            {/* Settlements Management */}
            <Route path="/groups/:groupId/settlements" element={<SettlementsList />} />
            <Route path="/groups/:groupId/settlements/create" element={<CreateSettlement />} />
            <Route path="/groups/:groupId/settlements/:id" element={<SettlementDetails />} />

            {/* Overall Balances Dashboard */}
            <Route path="/balances" element={<UserBalanceSummary />} />
          </Route>
        </Route>

        {/* Route redirection fallbacks */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
