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
        
        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardRouter />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 - Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
