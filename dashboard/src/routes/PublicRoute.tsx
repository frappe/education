import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute - Wrapper for routes that should only be accessible when not authenticated
 * Redirects authenticated users to the dashboard
 */
export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
