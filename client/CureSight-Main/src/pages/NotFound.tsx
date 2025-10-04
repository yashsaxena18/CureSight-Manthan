import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  const { isAuthenticated, getDashboardPath } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-12 pb-8">
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary">
              <Heart className="h-10 w-10 text-white" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h1 className="text-6xl font-bold text-gradient bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                404
              </h1>
              <h2 className="text-2xl font-semibold mt-2">Page Not Found</h2>
            </div>
            
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
            
            <div className="pt-6 space-y-3">
              {isAuthenticated ? (
                <Button asChild className="w-full medical-button">
                  <Link to={getDashboardPath()}>
                    <Home className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Link>
                </Button>
              ) : (
                <Button asChild className="w-full medical-button">
                  <Link to="/">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Link>
                </Button>
              )}
              
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
