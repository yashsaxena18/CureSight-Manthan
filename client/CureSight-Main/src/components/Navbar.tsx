import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Heart, 
  Menu, 
  Stethoscope, 
  FileText, 
  Users, 
  Play, 
  Pill, 
  Activity, 
  BarChart3,
  LogIn,
  UserPlus,
  Search,
  Shield,
  ChevronDown,
  Sparkles,
  User,
  LogOut,
  Settings,
  UserCheck,
  GraduationCap,
  Crown,
  Calendar,
  Clock,
  Video,
  Clipboard,
  Phone,
  Mail,
  MapPin,
  Star,
  Bell,
  Building,
  MessageSquare, // 🆕 Added for chat
  MonitorPlay   // 🆕 Added for video consultation
} from 'lucide-react';

// Import Auth Context
import { useAuth } from '../contexts/AuthContext';

// Patient main features (AI Health Tools)
const patientMainFeatures = [
  { name: 'AI Disease Predictor', href: '/symptom-checker', icon: Stethoscope, description: 'AI-powered symptom analysis' },
  { name: 'Report Analyzer', href: '/report-analyzer', icon: FileText, description: 'Medical report insights' },
  { name: 'Cancer Detection', href: '/cancer-detection', icon: Shield, description: 'Early detection screening' },
];

// 🔧 UPDATED: Patient navigation items - Changed My Appointments to My Consultations
const patientNavigationItems = [
  { name: 'Find Doctors', href: '/find-doctors', icon: Users },
  { name: 'My Consultations', href: '/my-consultations', icon: MessageSquare }, // 🔧 UPDATED: Changed to consultations
  { name: 'Emergency Practice', href: '/emergency-practice', icon: Play },
  { name: 'Medicine Comparison', href: '/medicine-comparison', icon: Pill },
];

// 🔧 UPDATED: Doctor main features (Doctor Tools) with proper routes
const doctorMainFeatures = [
  { name: 'Patient Records', href: '/doctor/patients', icon: FileText, description: 'Access patient medical records' },
  { name: 'Video Consultation', href: '/doctor/video-center', icon: Video, description: 'Real-time video consultations' },
  { name: 'Chat Center', href: '/doctor/chat-center', icon: MessageSquare, description: 'Real-time patient communication' },
  { name: 'Voice Calls', href: '/doctor/voice-center', icon: Phone, description: 'Audio-only consultations' },
  { name: 'Appointment Manager', href: '/doctor/appointments', icon: Calendar, description: 'Track and manage appointments' },
  { name: 'Prescription Pad', href: '/doctor/patients', icon: Clipboard, description: 'Digital prescription management' }
];

// Unverified doctor features
const unverifiedDoctorFeatures = [
  { name: 'Account Verification', href: '/doctor/verification', icon: Shield, description: 'Complete account verification' },
  { name: 'Profile Setup', href: '/doctor/profile', icon: User, description: 'Set up your doctor profile' },
];

// 🔧 UPDATED: Doctor navigation items (for verified doctors)
const verifiedDoctorNavigationItems = [
  { name: 'My Patients', href: '/doctor/patients', icon: Users },
  { name: 'Appointments', href: '/doctor/appointments', icon: Calendar }, // 🔧 FIXED: Proper appointments route
  { name: 'Schedule', href: '/doctor/schedule', icon: Clock },
];

// Unverified doctor navigation items
const unverifiedDoctorNavigationItems = [
  { name: 'Verification Status', href: '/doctor/verification', icon: Shield },
  { name: 'Profile Setup', href: '/doctor/profile', icon: User },
];

// Check if user is admin (temporary helper)
const isAdminUser = () => {
  const adminToken = localStorage.getItem('adminToken');
  const adminUser = localStorage.getItem('adminUser');
  return !!(adminToken && adminUser);
};

// Get admin user data
const getAdminUser = () => {
  try {
    const adminUser = localStorage.getItem('adminUser');
    return adminUser ? JSON.parse(adminUser) : null;
  } catch {
    return null;
  }
};

export const Navbar = () => {
  const { user, isAuthenticated, logout, isDoctor, isPatient, isVerifiedDoctor } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;
  const isMainFeatureActive = () => {
    if (isDoctor()) {
      return doctorMainFeatures.some(feature => isActive(feature.href));
    }
    return patientMainFeatures.some(feature => isActive(feature.href));
  };

  // Check if current user is admin
  const isAdmin = isAdminUser();
  const adminUser = getAdminUser();

  // Get current navigation items based on user role
  const getCurrentNavigationItems = () => {
    if (isDoctor()) {
      return isVerifiedDoctor() ? verifiedDoctorNavigationItems : unverifiedDoctorNavigationItems;
    }
    return patientNavigationItems;
  };

  // Get current main features based on user role
  const getCurrentMainFeatures = () => {
    if (isDoctor()) {
      return isVerifiedDoctor() ? doctorMainFeatures : unverifiedDoctorFeatures;
    }
    return patientMainFeatures;
  };

  // Get dropdown title based on user role
  const getDropdownTitle = () => {
    if (isDoctor()) {
      return isVerifiedDoctor() ? 'Doctor Tools' : 'Getting Started';
    }
    return 'AI Health Tools';
  };

  // Get dropdown icon based on user role
  const getDropdownIcon = () => {
    if (isDoctor()) {
      return isVerifiedDoctor() ? Stethoscope : Shield;
    }
    return Sparkles;
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setIsOpen(false);
    
    // Redirect based on user role
    if (isDoctor()) {
      navigate('/doctor-signin');
    } else {
      navigate('/signin');
    }
  };

  const handleAdminLogout = () => {
    // Clear admin data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    
    setIsUserMenuOpen(false);
    setIsOpen(false);
    navigate('/admin/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user display info based on role
  const getUserDisplayInfo = () => {
    if (isAdmin && adminUser) {
      return {
        name: `${adminUser.firstName} ${adminUser.lastName}`,
        email: adminUser.email,
        prefix: '',
        role: 'Admin',
        adminLevel: adminUser.adminLevel,
        specialization: null,
        hospital: null
      };
    }

    if (!user) return { name: '', email: '', prefix: '', role: '' };
    
    return {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      prefix: isDoctor() ? 'Dr. ' : '',
      role: isDoctor() ? 'Doctor' : 'Patient',
      specialization: isDoctor() ? user.specialization : null,
      hospital: isDoctor() ? user.hospitalAffiliation : null,
      verificationStatus: isDoctor() ? user.verificationStatus : null,
      isVerified: isDoctor() ? user.isVerified : null
    };
  };

  // Render authentication section
  const renderAuthSection = () => {
    // Admin user authentication
    if (isAdmin && adminUser) {
      const userInfo = getUserDisplayInfo();
      
      return (
        <div className="hidden sm:flex items-center space-x-3">
          {/* Admin Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-slate-100/80 hover:shadow-sm border border-slate-200"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-slate-600/20 to-slate-800/20">
                <Crown className="h-4 w-4 text-slate-700" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900 leading-none">
                  {userInfo.name}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {userInfo.adminLevel} Admin
                </p>
              </div>
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Admin Dropdown Menu */}
            <div
              className={`absolute top-full right-0 mt-2 w-72 bg-background/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl z-50 ${
                isUserMenuOpen 
                  ? 'opacity-100 visible translate-y-0 scale-100' 
                  : 'opacity-0 invisible -translate-y-2 scale-95'
              }`}
              style={{ 
                transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                transformOrigin: 'top right'
              }}
            >
              <div className="p-2">
                {/* Admin Info */}
                <div className="px-4 py-3 border-b border-border/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-slate-600/20 to-slate-800/20">
                      <Crown className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-foreground">
                          {userInfo.name}
                        </p>
                        <div className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">
                          {userInfo.adminLevel}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{userInfo.email}</p>
                      <p className="text-xs text-slate-600">Administrator</p>
                    </div>
                  </div>
                </div>

                {/* Admin Menu Items */}
                <div className="py-2 space-y-1">
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </Link>
                  
                  <Link
                    to="/admin/doctors/verification"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Doctor Verification</span>
                  </Link>

                  <Link
                    to="/admin/users"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                  >
                    <Users className="h-4 w-4" />
                    <span>User Management</span>
                  </Link>

                  <Link
                    to="/admin/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                  >
                    <Settings className="h-4 w-4" />
                    <span>System Settings</span>
                  </Link>

                  {/* Logout */}
                  <button
                    onClick={handleAdminLogout}
                    className="w-full flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Admin Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Regular user authentication (patient/doctor)
    if (isAuthenticated && user) {
      const userInfo = getUserDisplayInfo();
      
      return (
        <div className="hidden sm:flex items-center space-x-3">
          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-muted/80 hover:shadow-sm"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isDoctor() 
                  ? 'bg-gradient-to-r from-blue-500/20 to-green-500/20' 
                  : 'bg-gradient-to-r from-primary/20 to-secondary/20'
              }`}>
                {isDoctor() ? (
                  <Stethoscope className="h-4 w-4 text-blue-600" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground leading-none">
                  {userInfo.prefix}{userInfo.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isDoctor() ? userInfo.specialization : userInfo.email}
                </p>
              </div>
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown Menu */}
            <div
              className={`absolute top-full right-0 mt-2 w-72 bg-background/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl z-50 ${
                isUserMenuOpen 
                  ? 'opacity-100 visible translate-y-0 scale-100' 
                  : 'opacity-0 invisible -translate-y-2 scale-95'
              }`}
              style={{ 
                transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                transformOrigin: 'top right'
              }}
            >
              <div className="p-2">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-border/50">
                  <div className="flex items-center space-x-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isDoctor() 
                        ? 'bg-gradient-to-r from-blue-500/20 to-green-500/20' 
                        : 'bg-gradient-to-r from-primary/20 to-secondary/20'
                    }`}>
                      {isDoctor() ? (
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-foreground">
                          {userInfo.prefix}{userInfo.name}
                        </p>
                        <div className={`px-2 py-1 text-xs rounded-full ${
                          isDoctor() 
                            ? userInfo.isVerified 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isDoctor() 
                            ? userInfo.isVerified ? 'Verified Doctor' : 'Pending Verification'
                            : 'Patient'
                          }
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{userInfo.email}</p>
                      {isDoctor() && userInfo.hospital && (
                        <p className="text-xs text-muted-foreground">{userInfo.hospital}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2 space-y-1">
                  {/* Dashboard Link - Different for doctors and patients */}
                  <Link
                    to={isDoctor() ? "/doctor-dashboard" : "/dashboard"}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>{isDoctor() ? 'Doctor Dashboard' : 'Dashboard'}</span>
                  </Link>
                  
                  {/* Role-specific menu items */}
                  {isDoctor() ? (
                    <>
                      {isVerifiedDoctor() && (
                        <>
                          <Link
                            to="/doctor/patients"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                          >
                            <Users className="h-4 w-4" />
                            <span>My Patients</span>
                          </Link>
                          <Link
                            to="/doctor/my-consulatations"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                          >
                            <Calendar className="h-4 w-4" />
                            <span>Appointments</span>
                          </Link>
                          <Link
                            to="/doctor/schedule"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                          >
                            <Clock className="h-4 w-4" />
                            <span>Schedule</span>
                          </Link>
                        </>
                      )}
                      
                      <Link
                        to="/doctor/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      {/* 🔧 UPDATED: Changed My Appointments to My Consultations */}
                      <Link
                        to="/my-consultations"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>My Consultations</span>
                      </Link>
                      
                      <Link
                        to="/daily-monitoring"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                      >
                        <Activity className="h-4 w-4" />
                        <span>Daily Monitoring</span>
                      </Link>
                      
                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </>
                  )}

                  {/* Settings */}
                  <Link
                    to={isDoctor() ? "/doctor/settings" : "/settings"}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>

                  {/* Admin Access - Show only in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <>
                      <div className="border-t border-border/50 my-2"></div>
                      <Link
                        to="/admin/login"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    </>
                  )}

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="hidden sm:flex items-center space-x-3">
        {/* Patient Login */}
        <Button variant="outline" size="sm" className="border-border/60 hover:border-primary/30 nav-item transition-all duration-200" asChild>
          <Link to="/signin" className="flex items-center space-x-2">
            <LogIn className="h-4 w-4" />
            <span>Patient Login</span>
          </Link>
        </Button>

        {/* Doctor Login Button */}
        <Button variant="outline" size="sm" className="border-blue-200 hover:border-blue-400 text-blue-600 hover:text-blue-700 transition-all duration-200" asChild>
          <Link to="/doctor-signin" className="flex items-center space-x-2">
            <Stethoscope className="h-4 w-4" />
            <span>Doctor Login</span>
          </Link>
        </Button>

        {/* Admin Login Button - Show only in development */}
        {process.env.NODE_ENV === 'development' && (
          <Button variant="outline" size="sm" className="border-slate-200 hover:border-slate-400 text-slate-600 hover:text-slate-700 transition-all duration-200" asChild>
            <Link to="/admin/login" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          </Button>
        )}

        {/* Sign Up Button with Dropdown */}
        <div className="relative group">
          <Button size="sm" className="btn-primary medical-button shadow-md hover:shadow-lg" asChild>
            <Link to="/signup" className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Sign Up</span>
            </Link>
          </Button>
          
          {/* Sign Up Options Tooltip */}
          <div className="absolute top-full right-0 mt-2 w-48 bg-background/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div className="p-2 space-y-1">
              <Link
                to="/signup"
                className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
              >
                <User className="h-4 w-4" />
                <span>Patient Sign Up</span>
              </Link>
              <Link
                to="/doctor-signup"
                className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
              >
                <GraduationCap className="h-4 w-4" />
                <span>Doctor Sign Up</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render mobile auth section (keeping existing mobile code)
  const renderMobileAuthSection = () => {
    // Admin mobile menu
    if (isAdmin && adminUser) {
      const userInfo = getUserDisplayInfo();
      
      return (
        <div className="pt-6 mt-6 border-t border-border/50 space-y-1">
          {/* Admin Info */}
          <div className="flex items-center space-x-3 px-4 py-3 mb-4 bg-slate-50 rounded-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-slate-600/20 to-slate-800/20">
              <Crown className="h-5 w-5 text-slate-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className="font-medium text-foreground">
                  {userInfo.name}
                </p>
                <div className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">
                  Admin
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{userInfo.email}</p>
            </div>
          </div>

          {/* Admin Menu Items */}
          <Link
            to="/admin/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
          >
            <BarChart3 className="h-5 w-5" />
            <span>Admin Dashboard</span>
          </Link>

          <Link
            to="/admin/doctors/verification"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
          >
            <UserCheck className="h-5 w-5" />
            <span>Doctor Verification</span>
          </Link>

          <Link
            to="/admin/users"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
          >
            <Users className="h-5 w-5" />
            <span>User Management</span>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleAdminLogout}
            className="w-full flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span>Admin Logout</span>
          </button>
        </div>
      );
    }

    // Regular user mobile menu (existing code)
    if (isAuthenticated && user) {
      const userInfo = getUserDisplayInfo();
      
      return (
        <div className="pt-6 mt-6 border-t border-border/50 space-y-1">
          {/* User Info */}
          <div className="flex items-center space-x-3 px-4 py-3 mb-4 bg-muted/30 rounded-xl">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isDoctor() 
                ? 'bg-gradient-to-r from-blue-500/20 to-green-500/20' 
                : 'bg-gradient-to-r from-primary/20 to-secondary/20'
            }`}>
              {isDoctor() ? (
                <Stethoscope className="h-5 w-5 text-blue-600" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className="font-medium text-foreground">
                  {userInfo.prefix}{userInfo.name}
                </p>
                <div className={`px-2 py-1 text-xs rounded-full ${
                  isDoctor() 
                    ? userInfo.isVerified 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {isDoctor() 
                    ? userInfo.isVerified ? 'Verified' : 'Pending'
                    : 'Patient'
                  }
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{userInfo.email}</p>
            </div>
          </div>

          {/* Dashboard Link */}
          <Link
            to={isDoctor() ? "/doctor-dashboard" : "/dashboard"}
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
          >
            <BarChart3 className="h-5 w-5" />
            <span>{isDoctor() ? 'Doctor Dashboard' : 'Dashboard'}</span>
          </Link>

          {/* Role-specific Links */}
          {isDoctor() ? (
            <>
              {isVerifiedDoctor() && (
                <>
                  <Link
                    to="/doctor/patients"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                  >
                    <Users className="h-5 w-5" />
                    <span>My Patients</span>
                  </Link>
                  <Link
                    to="/doctor/appointments"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                  >
                    <Calendar className="h-5 w-5" />
                    <span>Appointments</span>
                  </Link>
                  <Link
                    to="/doctor/schedule"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                  >
                    <Clock className="h-5 w-5" />
                    <span>Schedule</span>
                  </Link>
                </>
              )}
              
              <Link
                to="/doctor/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
              >
                <User className="h-5 w-5" />
                <span>Profile</span>
              </Link>
            </>
          ) : (
            <>
              {/* 🔧 UPDATED: Mobile menu - Changed My Appointments to My Consultations */}
              <Link
                to="/my-consultations"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
              >
                <MessageSquare className="h-5 w-5" />
                <span>My Consultations</span>
              </Link>
              
              <Link
                to="/daily-monitoring"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
              >
                <Activity className="h-5 w-5" />
                <span>Daily Monitoring</span>
              </Link>
              
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
              >
                <User className="h-5 w-5" />
                <span>Profile</span>
              </Link>
            </>
          )}

          {/* Settings */}
          <Link
            to={isDoctor() ? "/doctor/settings" : "/settings"}
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>

          {/* Admin Access - Development only */}
          {process.env.NODE_ENV === 'development' && (
            <Link
              to="/admin/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
            >
              <Shield className="h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      );
    }

    return (
      <div className="pt-6 mt-6 border-t border-border/50 space-y-1">
        <Link
          to="/dashboard"
          onClick={() => setIsOpen(false)}
          className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
        >
          <BarChart3 className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>
        
        {/* Patient Login */}
        <Link
          to="/signin"
          onClick={() => setIsOpen(false)}
          className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
        >
          <LogIn className="h-5 w-5" />
          <span>Patient Login</span>
        </Link>

        {/* Doctor Login */}
        <Link
          to="/doctor-signin"
          onClick={() => setIsOpen(false)}
          className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
        >
          <Stethoscope className="h-5 w-5" />
          <span>Doctor Login</span>
        </Link>

        {/* Admin Login - Development only */}
        {process.env.NODE_ENV === 'development' && (
          <Link
            to="/admin/login"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
          >
            <Shield className="h-5 w-5" />
            <span>Admin Login</span>
          </Link>
        )}

        {/* Sign Up Options */}
        <div className="space-y-1">
          <Link
            to="/signup"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium bg-gradient-to-r from-primary/10 to-secondary/10 text-primary hover:from-primary/20 hover:to-secondary/20 transition-all duration-200"
          >
            <UserPlus className="h-5 w-5" />
            <span>Patient Sign Up</span>
          </Link>
          
          <Link
            to="/doctor-signup"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium bg-gradient-to-r from-blue-500/10 to-green-500/10 text-blue-600 hover:from-blue-500/20 hover:to-green-500/20 transition-all duration-200"
          >
            <GraduationCap className="h-5 w-5" />
            <span>Doctor Sign Up</span>
          </Link>
        </div>
      </div>
    );
  };

  const DropdownIcon = getDropdownIcon();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-2xl shadow-lg/20">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg ${
            isAdmin 
              ? 'bg-gradient-to-r from-slate-600 to-slate-800'
              : isDoctor()
              ? 'bg-gradient-to-r from-blue-500 to-green-500'
              : 'bg-gradient-to-r from-primary to-secondary'
          }`}>
            {isAdmin ? (
              <Shield className="h-7 w-7 text-white" />
            ) : isDoctor() ? (
              <Stethoscope className="h-7 w-7 text-white" />
            ) : (
              <Heart className="h-7 w-7 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-gradient leading-none">
              {isAdmin ? 'CureSight Admin' : 'CureSight'}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {isAdmin 
                ? 'Administrative Panel' 
                : isDoctor() 
                ? 'Doctor Portal'
                : 'AI Health Companion'
              }
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {/* Show different navigation based on user role and admin status */}
          {!isAdmin && (
            <>
              {/* Main Features Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  className={`group flex items-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isMainFeatureActive()
                      ? isDoctor()
                        ? 'bg-blue-100 text-blue-800 shadow-sm'
                        : 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:shadow-sm'
                  }`}
                >
                  <DropdownIcon className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span className="whitespace-nowrap">{getDropdownTitle()}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`absolute top-full left-0 mt-2 w-80 bg-background/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl z-50 ${
                    isDropdownOpen 
                      ? 'opacity-100 visible translate-y-0 scale-100 animate-slideDown' 
                      : 'opacity-0 invisible -translate-y-2 scale-95'
                  }`}
                  style={{ 
                    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                    transformOrigin: 'top'
                  }}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <div className="p-2">
                    {getCurrentMainFeatures().map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <Link
                          key={feature.name}
                          to={feature.href}
                          onClick={() => setIsDropdownOpen(false)}
                          className={`group flex items-start space-x-3 rounded-lg px-4 py-3 transition-all duration-200 ${
                            isActive(feature.href)
                              ? isDoctor()
                                ? 'bg-blue-100 text-blue-800 shadow-sm'
                                : 'bg-primary/10 text-primary shadow-sm'
                              : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:shadow-sm'
                          }`}
                        >
                          <div className={`p-2 rounded-lg transition-colors ${
                            isDoctor()
                              ? 'bg-blue-100 group-hover:bg-blue-200'
                              : 'bg-primary/10 group-hover:bg-primary/20'
                          }`}>
                            <Icon className={`h-4 w-4 ${
                              isDoctor() ? 'text-blue-700' : 'text-primary'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium transition-colors ${
                              isDoctor()
                                ? 'text-foreground group-hover:text-blue-800'
                                : 'text-foreground group-hover:text-primary'
                            }`}>
                              {feature.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {feature.description}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Regular Navigation Items */}
              {getCurrentNavigationItems().map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? isDoctor()
                          ? 'bg-blue-100 text-blue-800 shadow-sm'
                          : 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:shadow-sm'
                    }`}
                  >
                    <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span className="whitespace-nowrap">{item.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Right Section - Auth & Actions */}
        <div className="flex items-center space-x-3">
          {/* Dashboard - Hidden on mobile, show only if not authenticated and not admin */}
          {!isAuthenticated && !isAdmin && (
            <Button variant="ghost" size="sm" className="hidden md:flex" asChild>
              <Link to="/dashboard" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden lg:inline">Dashboard</span>
              </Link>
            </Button>
          )}
          
          {/* Render Auth Section */}
          {renderAuthSection()}

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden ml-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96">
              <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-border/50">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg ${
                  isAdmin 
                    ? 'bg-gradient-to-r from-slate-600 to-slate-800'
                    : isDoctor()
                    ? 'bg-gradient-to-r from-blue-500 to-green-500'
                    : 'bg-gradient-to-r from-primary to-secondary'
                }`}>
                  {isAdmin ? (
                    <Shield className="h-5 w-5 text-white" />
                  ) : isDoctor() ? (
                    <Stethoscope className="h-5 w-5 text-white" />
                  ) : (
                    <Heart className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gradient">
                    {isAdmin ? 'CureSight Admin' : 'CureSight'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isAdmin 
                      ? 'Administrative Panel' 
                      : isDoctor() 
                      ? 'Doctor Portal'
                      : 'AI Health Companion'
                    }
                  </span>
                </div>
              </div>
              
              <nav className="space-y-1">
                {/* Show navigation based on role and admin status */}
                {!isAdmin && (
                  <>
                    {/* Main Features Section */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 px-4 py-2">
                        <DropdownIcon className={`h-4 w-4 ${
                          isDoctor() ? 'text-blue-600' : 'text-primary'
                        }`} />
                        <span className="text-sm font-semibold text-foreground">{getDropdownTitle()}</span>
                      </div>
                      {getCurrentMainFeatures().map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link
                            key={feature.name}
                            to={feature.href}
                            onClick={() => setIsOpen(false)}
                            className={`group flex items-center space-x-3 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-200 ${
                              isActive(feature.href)
                                ? isDoctor()
                                  ? 'bg-blue-100 text-blue-800 shadow-sm'
                                  : 'bg-primary/10 text-primary shadow-sm'
                                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:shadow-sm'
                            }`}
                          >
                            <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                            <div className="flex-1">
                              <div className="font-medium">{feature.name}</div>
                              <div className="text-xs text-muted-foreground">{feature.description}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/50 my-4"></div>

                    {/* Other Navigation Items */}
                    {getCurrentNavigationItems().map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`group flex items-center space-x-3 rounded-xl px-4 py-4 text-sm font-medium transition-all duration-200 ${
                            isActive(item.href)
                              ? isDoctor()
                                ? 'bg-blue-100 text-blue-800 shadow-sm'
                                : 'bg-primary/10 text-primary shadow-sm'
                              : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:shadow-sm'
                          }`}
                        >
                          <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </>
                )}
                
                {/* Mobile Auth Section */}
                {renderMobileAuthSection()}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
