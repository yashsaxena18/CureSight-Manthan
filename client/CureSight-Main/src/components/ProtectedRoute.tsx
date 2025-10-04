import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { RefreshCw, Heart } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'patient' | 'doctor';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, isDoctor, isPatient } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Loading CureSight</h2>
            <p className="text-muted-foreground">Please wait while we load your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to appropriate signin page
    const redirectTo = requiredRole === 'doctor' ? '/doctor-signin' : '/signin';
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Role-based access control
  if (requiredRole === 'patient' && !isPatient()) {
    return <Navigate to="/doctor-dashboard" replace />;
  }

  if (requiredRole === 'doctor' && !isDoctor()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
