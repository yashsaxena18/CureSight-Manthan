import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, Mail, Lock, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'http://localhost:5000/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: 'admin@curesight.com', // Pre-filled for easy testing
    password: 'Admin123!@#'       // Pre-filled for easy testing
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔄 Attempting admin login...');
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password
        })
      });

      const data = await response.json();
      console.log('📥 Admin login response:', data);

      if (response.ok) {
        // Store admin token and data
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.admin));

        console.log('✅ Admin login successful');

        toast({
          title: "Admin Login Successful! 🔐",
          description: `Welcome back, ${data.admin.firstName}! Redirecting to dashboard...`
        });

        // Small delay to show success message
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1500);

      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Admin login error:', error);
      toast({
        title: "Login Failed",
        description: (error as Error).message || "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Portal</h1>
            <p className="text-slate-600 mt-2">
              CureSight Administration Panel
            </p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-slate-800">Administrator Login</CardTitle>
            <CardDescription className="text-slate-600">
              Enter your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Demo Credentials Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Demo Credentials</p>
                    <p className="text-blue-700 text-xs mt-1">
                      Email: admin@curesight.com<br />
                      Password: Admin123!@#
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@curesight.com"
                    value={formData.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      email: e.target.value
                    })}
                    className="pl-10 border-slate-300 focus:border-slate-500"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter admin password"
                    value={formData.password}
                    onChange={(e) => setFormData({
                      ...formData,
                      password: e.target.value
                    })}
                    className="pl-10 pr-10 border-slate-300 focus:border-slate-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                size="lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Sign In as Admin
                  </>
                )}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 pt-6 border-t border-slate-200 text-center space-y-2">
              <p className="text-xs text-slate-500">
                🔒 Restricted access • Authorized personnel only
              </p>
              <div className="flex justify-center space-x-4 text-xs">
                <button 
                  onClick={() => navigate('/')}
                  className="text-slate-600 hover:text-slate-800 underline"
                >
                  Back to CureSight
                </button>
                <span className="text-slate-400">•</span>
                <button 
                  onClick={() => navigate('/signin')}
                  className="text-slate-600 hover:text-slate-800 underline"
                >
                  Patient Login
                </button>
                <span className="text-slate-400">•</span>
                <button 
                  onClick={() => navigate('/doctor-signin')}
                  className="text-slate-600 hover:text-slate-800 underline"
                >
                  Doctor Login
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">Security Notice</p>
              <p className="text-amber-800 mt-1">
                This is an administrative interface. All activities are logged and monitored for security purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
