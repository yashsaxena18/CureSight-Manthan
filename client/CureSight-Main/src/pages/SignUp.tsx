import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ⭐ ADD THIS LINE
import { useAuth } from "../contexts/AuthContext"; // ⭐ ADD THIS LINE
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// API Configuration
const API_BASE = "http://localhost:5000/api";
const SERVER_BASE = "http://localhost:5000";

export default function SignUp() {
  const { toast } = useToast();
  const navigate = useNavigate(); // ⭐ ADD THIS LINE
  const { login } = useAuth(); // ⭐ ADD THIS LINE
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState("unknown"); // 'online', 'offline', 'unknown'

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
    agreePrivacy: false,
    subscribeNewsletter: true,
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Test server connection
  const testServerConnection = async () => {
    try {
      console.log("🔄 Testing server connection...");
      setServerStatus("unknown");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${SERVER_BASE}/test`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Server test successful:", data);
        setServerStatus("online");
        return true;
      } else {
        console.error("❌ Server responded with error:", response.status);
        setServerStatus("offline");
        return false;
      }
    } catch (error) {
      console.error("❌ Server connection failed:", error);
      setServerStatus("offline");

      if (error.name === "AbortError") {
        console.error("Request timed out");
      }

      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validation
    if (!formData.firstName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your first name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.lastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your last name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.dateOfBirth) {
      toast({
        title: "Missing Information",
        description: "Please select your date of birth.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.gender) {
      toast({
        title: "Missing Information",
        description: "Please select your gender.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter a password.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Please ensure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.agreeTerms) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the Terms of Service.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.agreePrivacy) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the Privacy Policy.",
        variant: "destructive",
      });
      return;
    }

    // Age validation (must be 13+)
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age < 13) {
      toast({
        title: "Age Restriction",
        description: "You must be at least 13 years old to register.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Test server connection
      console.log("🔄 Step 1: Testing server connection...");
      const serverOnline = await testServerConnection();

      if (!serverOnline) {
        throw new Error(
          "Server is not running. Please start the backend server on port 5000."
        );
      }

      // Step 2: Test auth endpoint
      console.log("🔄 Step 2: Testing auth endpoint...");
      try {
        const testAuthResponse = await fetch(`${API_BASE}/auth/test`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (testAuthResponse.ok) {
          console.log("✅ Auth endpoint accessible");
        } else {
          console.warn("⚠️ Auth endpoint returned:", testAuthResponse.status);
        }
      } catch (authTestError) {
        console.warn(
          "⚠️ Auth test failed, but continuing...",
          authTestError.message
        );
      }

      // Step 3: Send signup request
      console.log("🔄 Step 3: Sending signup request...");
      console.log("📤 Request URL:", `${API_BASE}/auth/signup`);
      console.log("📤 Request data:", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        agreeTerms: formData.agreeTerms,
        agreePrivacy: formData.agreePrivacy,
        subscribeNewsletter: formData.subscribeNewsletter,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: "http://localhost:8080",
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          password: formData.password,
          agreeTerms: formData.agreeTerms,
          agreePrivacy: formData.agreePrivacy,
          subscribeNewsletter: formData.subscribeNewsletter,
        }),
      });

      clearTimeout(timeoutId);

      console.log("📥 Response status:", response.status);
      console.log(
        "📥 Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      const data = await response.json();
      console.log("📥 Response data:", data);

      if (response.ok) {
        // ⭐ CRITICAL: Use auth context to login user immediately
        login(data.user, data.token);

        console.log(
          "✅ User automatically logged in via context:",
          data.user.firstName
        );
        console.log("🔄 Auth context updated, redirecting to dashboard...");

        toast({
          title: "Welcome to CureSight! 🎉",
          description: `Account created successfully! Welcome, ${
            data.user?.firstName || "User"
          }!`,
        });

        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          dateOfBirth: "",
          gender: "",
          password: "",
          confirmPassword: "",
          agreeTerms: false,
          agreePrivacy: false,
          subscribeNewsletter: true,
        });

        // ⭐ IMMEDIATE REDIRECT - No setTimeout needed
        navigate("/dashboard");
      } else {
        // Server returned an error
        throw new Error(
          data.message || data.error || `Server error: ${response.status}`
        );
      }
    } catch (error) {
      console.error("❌ Signup error:", error);

      // Handle specific error types
      let errorTitle = "Signup Failed";
      let errorMessage = "Please try again later.";

      if (error.name === "AbortError") {
        errorTitle = "Request Timeout";
        errorMessage =
          "Request timed out. Please check your connection and try again.";
      } else if (error.message.includes("Server is not running")) {
        errorTitle = "Server Offline";
        errorMessage =
          "Backend server is not running. Please start the server and try again.";
      } else if (error.message.includes("User already exists")) {
        errorTitle = "Account Exists";
        errorMessage =
          "An account with this email already exists. Please sign in instead.";
      } else if (error.message.includes("Validation failed")) {
        errorTitle = "Validation Error";
        errorMessage = "Please check your information and try again.";
      } else if (
        error.message.includes("CORS") ||
        error.message.includes("NetworkError")
      ) {
        errorTitle = "Connection Error";
        errorMessage =
          "Unable to connect to server. Please check if backend is running on port 5000.";
      } else if (
        error.name === "TypeError" &&
        error.message.includes("fetch")
      ) {
        errorTitle = "Network Error";
        errorMessage =
          "Network connection failed. Please check your internet connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });

      // Set server status based on error type
      if (
        error.message.includes("Server is not running") ||
        error.message.includes("NetworkError") ||
        error.name === "TypeError"
      ) {
        setServerStatus("offline");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Test connection button handler
  const handleTestConnection = async () => {
    await testServerConnection();

    if (serverStatus === "online") {
      toast({
        title: "Server Online ✅",
        description: "Backend server is running and accessible.",
      });
    } else {
      toast({
        title: "Server Offline ❌",
        description: "Cannot connect to backend server on port 5000.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-secondary">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Join{" "}
              <span className="text-gradient bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                CureSight
              </span>
            </h1>
            <p className="text-muted-foreground">
              Create your account to start your personalized health journey with
              AI-powered insights.
            </p>
          </div>

          {/* Server Status Indicator */}
          <div className="flex items-center justify-center space-x-2">
            {serverStatus === "online" && (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-600">Server Online</span>
              </>
            )}
            {serverStatus === "offline" && (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-xs text-red-600">Server Offline</span>
              </>
            )}
            {serverStatus === "unknown" && (
              <span className="text-xs text-muted-foreground">
                Server Status Unknown
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTestConnection}
              className="text-xs h-6 px-2"
            >
              Test Connection
            </Button>
          </div>
        </div>

        <Card className="medical-card">
          <CardHeader className="text-center">
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Fill in your information to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      className="medical-input pl-10"
                      required
                      maxLength={50}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="medical-input"
                    required
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="medical-input pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Date of Birth & Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        updateField("dateOfBirth", e.target.value)
                      }
                      className="medical-input pl-10"
                      required
                      max={new Date().toISOString().split("T")[0]} // Prevent future dates
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => updateField("gender", value)}
                  >
                    <SelectTrigger className="medical-input">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Password Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      className="medical-input pl-10 pr-10"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        updateField("confirmPassword", e.target.value)
                      }
                      className="medical-input pl-10 pr-10"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Agreements */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeTerms"
                    checked={formData.agreeTerms}
                    onCheckedChange={(checked) =>
                      updateField("agreeTerms", !!checked)
                    }
                    className="mt-1"
                  />
                  <Label
                    htmlFor="agreeTerms"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and understand that CureSight is for informational purposes
                    only. *
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreePrivacy"
                    checked={formData.agreePrivacy}
                    onCheckedChange={(checked) =>
                      updateField("agreePrivacy", !!checked)
                    }
                    className="mt-1"
                  />
                  <Label
                    htmlFor="agreePrivacy"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    I acknowledge that I have read and agree to the{" "}
                    <Link
                      to="/privacy"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    . *
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="subscribeNewsletter"
                    checked={formData.subscribeNewsletter}
                    onCheckedChange={(checked) =>
                      updateField("subscribeNewsletter", !!checked)
                    }
                    className="mt-1"
                  />
                  <Label
                    htmlFor="subscribeNewsletter"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    I would like to receive health tips and updates via email.
                  </Label>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || serverStatus === "offline"}
                className="medical-button w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : serverStatus === "offline" ? (
                  <>
                    <WifiOff className="mr-2 h-4 w-4" />
                    Server Offline
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>

              {/* Debug Info (remove in production) */}
              {process.env.NODE_ENV === "development" && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Debug Info:</strong>
                    <br />
                    API URL: {API_BASE}
                    <br />
                    Server Status: {serverStatus}
                    <br />
                    Frontend Port: 8080
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Social Signup */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  disabled
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  disabled
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Button>
              </div>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/signin"
                  className="text-primary hover:underline font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Medical Disclaimer */}
        <div className="mt-8 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                <strong>Medical Disclaimer:</strong> CureSight provides health
                information and tools for educational purposes only. This
                service is not a substitute for professional medical advice,
                diagnosis, or treatment. Always seek the advice of qualified
                healthcare providers with any questions about your health.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
