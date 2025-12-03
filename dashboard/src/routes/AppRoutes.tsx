import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { DashboardRouter } from './DashboardRouter';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import Login from '@/pages/auth/Login';
import NotFoundPage from '../pages/NotFoundPage';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        
        {/* Protected Routes with Dashboard Layout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardRouter />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
