import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdminProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
}

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  adminLevel: string;
  permissions: string[];
  isActive: boolean;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  children, 
  requiredPermission 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const storedAdmin = localStorage.getItem('adminUser');

      if (!token || !storedAdmin) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Parse stored admin data
      const adminData = JSON.parse(storedAdmin);
      
      // Verify token is still valid by making a test API call
      const response = await fetch('http://localhost:5000/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setAdminUser(adminData);
        setIsAuthenticated(true);
      } else if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setIsAuthenticated(false);
        setError('Session expired. Please login again.');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Admin auth check failed:', error);
      setError('Connection error. Please check your network.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-background to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-slate-600 to-slate-800">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-600" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Authenticating Admin</h2>
              <p className="text-muted-foreground">
                Verifying your admin credentials...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated - redirect to admin login
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Permission check
  if (requiredPermission && adminUser) {
    const hasPermission = 
      adminUser.adminLevel === 'super_admin' || 
      adminUser.permissions.includes(requiredPermission);

    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-background to-slate-100">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-xl text-red-600">Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access this resource
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm">
                  <p className="font-medium text-red-800 mb-1">
                    {adminUser.firstName} {adminUser.lastName}
                  </p>
                  <p className="text-red-700">
                    Admin Level: {adminUser.adminLevel}
                  </p>
                  <p className="text-red-600 text-xs mt-2">
                    Required Permission: {requiredPermission}
                  </p>
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                  className="w-full"
                >
                  Go Back
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.href = '/admin/dashboard'}
                  className="w-full"
                >
                  Admin Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Account status check
  if (adminUser && !adminUser.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-background to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-amber-600">Account Suspended</CardTitle>
            <CardDescription>
              Your admin account has been deactivated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">
                  {adminUser.firstName} {adminUser.lastName}
                </p>
                <p className="text-amber-700">
                  {adminUser.email}
                </p>
                <p className="text-amber-600 text-xs mt-2">
                  Contact the super admin to reactivate your account.
                </p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/admin/login';
              }}
              className="w-full"
            >
              Login with Different Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-background to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-red-600">Authentication Error</CardTitle>
            <CardDescription>
              Unable to verify your admin access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full bg-slate-700 hover:bg-slate-800"
              >
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/admin/login'}
                className="w-full"
              >
                Login Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All checks passed - render children
  return <>{children}</>;
};

export default AdminProtectedRoute;
