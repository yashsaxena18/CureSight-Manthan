import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { RefreshCw, AlertTriangle, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DoctorProtectedRouteProps {
  children: ReactNode;
  requireVerification?: boolean;
}

const DoctorProtectedRoute: React.FC<DoctorProtectedRouteProps> = ({ 
  children, 
  requireVerification = false 
}) => {
  const { isAuthenticated, isLoading, isDoctor, isVerifiedDoctor, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-blue-500" />
          <div>
            <h2 className="text-lg font-semibold">Loading CureSight</h2>
            <p className="text-muted-foreground">Authenticating your doctor account...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to doctor signin if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/doctor-signin" state={{ from: location }} replace />;
  }

  // Redirect patients to regular signin
  if (!isDoctor()) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Show verification required message for unverified doctors
  if (requireVerification && !isVerifiedDoctor()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-xl">Account Verification Required</CardTitle>
            <CardDescription>
              Your doctor account is pending verification by our medical team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Stethoscope className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Dr. {user?.firstName} {user?.lastName}</p>
                  <p className="text-amber-700 mt-1">
                    Specialization: {user?.specialization}<br />
                    Hospital: {user?.hospitalAffiliation}<br />
                    Status: <span className="font-medium">{user?.verificationStatus || 'Pending'}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>What's being verified:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Medical license authenticity</li>
                <li>Professional credentials</li>
                <li>Hospital affiliation</li>
                <li>Identity verification</li>
              </ul>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Verification typically takes 1-3 business days.</strong>
                You'll receive an email notification once your account is verified.
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Status
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => window.location.href = '/doctor-dashboard'}
              >
                Go to Dashboard
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Need help? Contact our support team at{' '}
                <a href="mailto:support@curesight.com" className="text-blue-600 hover:underline">
                  support@curesight.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default DoctorProtectedRoute;
