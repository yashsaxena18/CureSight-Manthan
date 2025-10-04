import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Heart, Eye, EyeOff, Mail, Lock, LogIn, RefreshCw, 
  Stethoscope, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'http://localhost:5000/api';

export default function DoctorSignIn() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      toast({
        title: "Missing Email",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.password) {
      toast({
        title: "Missing Password",
        description: "Please enter your password.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔄 Sending doctor signin request...');

      const response = await fetch(`${API_BASE}/auth/doctor-signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          rememberMe: formData.rememberMe
        })
      });

      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok) {
        // Use auth context to login doctor
        login(data.user, data.token);
        
        toast({
          title: "Welcome back Dr. " + data.user.firstName + "! 👨‍⚕️",
          description: "Successfully signed in to your doctor account."
        });

        // Check if there's a return path or go to doctor dashboard
        const returnTo = (location.state as any)?.from?.pathname || '/doctor-dashboard';
        
        // Redirect
        navigate(returnTo);

      } else {
        throw new Error(data.message || data.error || 'Doctor login failed');
      }

    } catch (error) {
      console.error('❌ Doctor signin error:', error);
      toast({
        title: "Login Failed",
        description: (error as Error).message || "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue/5 via-background to-green/5">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-green-500">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Doctor <span className="text-gradient bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent">Sign In</span>
            </h1>
            <p className="text-muted-foreground">
              Access your professional dashboard and manage patient consultations.
            </p>
          </div>
        </div>

        <Card className="medical-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Stethoscope className="h-5 w-5" />
              <span>Doctor Login</span>
            </CardTitle>
            <CardDescription>
              Sign in to your doctor account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Doctor Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@hospital.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="medical-input pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="medical-input pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => updateField('rememberMe', !!checked)}
                  />
                  <Label htmlFor="remember" className="text-sm font-medium cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <Link to="/doctor-forgot-password" className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white shadow-lg"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In as Doctor
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>
                  Don't have a doctor account?{' '}
                  <Link to="/doctor-signup" className="text-blue-600 hover:underline font-medium">
                    Register here
                  </Link>
                </p>
                <p>
                  Are you a patient?{' '}
                  <Link to="/signin" className="text-primary hover:underline font-medium">
                    Patient sign in
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Professional Notice */}
        <div className="mt-8 p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Professional Notice:</strong> This platform is designed for licensed healthcare professionals. 
                All doctor accounts undergo verification to ensure patient safety and professional standards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
