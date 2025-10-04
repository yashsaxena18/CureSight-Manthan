import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState(null);

  // Load user data on app start
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Enhanced logging with role info
        const userType = userData.role === 'doctor' ? 'Doctor' : 'Patient';
        const displayName = userData.role === 'doctor' 
          ? `Dr. ${userData.firstName} ${userData.lastName}` 
          : `${userData.firstName} ${userData.lastName}`;
          
        console.log(`✅ ${userType} loaded from localStorage:`, displayName);
        
        // Log additional info for doctors
        if (userData.role === 'doctor') {
          console.log('🏥 Specialization:', userData.specialization);
          console.log('🔍 Verification Status:', userData.verificationStatus);
          console.log('✅ Is Verified:', userData.isVerified);
          
          // Auto-check verification status if not verified
          if (!userData.isVerified && userData.verificationStatus === 'pending') {
            console.log('🔄 Auto-checking verification status...');
            setTimeout(() => refreshUserStatus(), 2000);
          }
        }
        
      } catch (error) {
        console.error('❌ Error parsing stored user data:', error);
        logout();
      }
    }
    
    setIsLoading(false);
  }, []);

  // 🔄 REFRESH USER STATUS FUNCTION (MAIN FIX)
  const refreshUserStatus = useCallback(async () => {
    const currentToken = localStorage.getItem('authToken');
    const currentUser = localStorage.getItem('user');
    
    if (!currentToken || !currentUser) {
      console.log('⚠️ No token or user data to refresh');
      return false;
    }
    
    try {
      const userData = JSON.parse(currentUser);
      
      // Only check for doctors
      if (userData.role !== 'doctor') {
        console.log('ℹ️ Skipping status check - not a doctor');
        return false;
      }
      
      console.log('🔄 Checking doctor verification status...', userData.email);
      
      const response = await fetch('http://localhost:5000/api/doctor/profile', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const updatedDoctor = data.doctor;
        
        console.log('📥 Server response:', {
          email: updatedDoctor.email,
          verificationStatus: updatedDoctor.verificationStatus,
          isVerified: updatedDoctor.isVerified
        });
        
        // Check if verification status changed
        const statusChanged = 
          updatedDoctor.isVerified !== userData.isVerified || 
          updatedDoctor.verificationStatus !== userData.verificationStatus;
        
        if (statusChanged) {
          const oldStatus = userData.verificationStatus;
          const newStatus = updatedDoctor.verificationStatus;
          
          console.log(`🔄 Status change detected: ${oldStatus} → ${newStatus}`);
          console.log(`✅ Verification change: ${userData.isVerified} → ${updatedDoctor.isVerified}`);
          
          // Create updated user data
          const newUserData = { 
            ...userData, 
            ...updatedDoctor,
            // Keep essential fields
            id: userData.id,
            role: 'doctor'
          };
          
          // Update localStorage
          localStorage.setItem('user', JSON.stringify(newUserData));
          
          // Update state
          setUser(newUserData);
          setLastStatusCheck(new Date());
          
          // Log success
          if (updatedDoctor.isVerified && !userData.isVerified) {
            console.log('🎉 Doctor account verified! Status updated.');
            
            // You can add toast notification here if you have toast context
            if (window.showToast) {
              window.showToast({
                title: "Account Verified! ✅",
                description: "Your doctor account has been verified and approved!",
                type: "success"
              });
            }
          }
          
          return true; // Status updated
        } else {
          console.log('ℹ️ No status change detected');
          setLastStatusCheck(new Date());
          return false; // No change
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch doctor profile:', response.status, errorData);
        
        // If token is invalid, logout
        if (response.status === 401) {
          console.log('🔓 Token expired, logging out...');
          logout();
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Error refreshing user status:', error);
      return false;
    }
  }, []);

  // Auto refresh for unverified doctors
  useEffect(() => {
    if (user?.role === 'doctor' && !user?.isVerified) {
      console.log('🔄 Starting auto-refresh for unverified doctor');
      
      // Check every 30 seconds
      const interval = setInterval(() => {
        console.log('⏰ Auto-checking verification status...');
        refreshUserStatus();
      }, 30000);

      return () => {
        console.log('🛑 Stopping auto-refresh');
        clearInterval(interval);
      };
    }
  }, [user, refreshUserStatus]);

  const login = (userData, authToken) => {
    const userType = userData.role === 'doctor' ? 'Doctor' : 'Patient';
    const displayName = userData.role === 'doctor' 
      ? `Dr. ${userData.firstName} ${userData.lastName}` 
      : `${userData.firstName} ${userData.lastName}`;
      
    console.log(`🔐 ${userType} logging in:`, displayName);
    
    // Enhanced logging for doctors
    if (userData.role === 'doctor') {
      console.log('🏥 Hospital:', userData.hospitalAffiliation);
      console.log('💼 Specialization:', userData.specialization);
      console.log('🔍 Verified:', userData.isVerified ? 'Yes' : 'Pending');
      console.log('📊 Status:', userData.verificationStatus);
    }
    
    // Store in localStorage
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Update state
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
    
    // Start status checking for unverified doctors
    if (userData.role === 'doctor' && !userData.isVerified) {
      console.log('🔄 Starting verification status monitoring...');
      setTimeout(() => refreshUserStatus(), 5000); // Check after 5 seconds
    }
  };

  const logout = () => {
    const userType = user?.role === 'doctor' ? 'Doctor' : 'Patient';
    const displayName = user?.role === 'doctor' 
      ? `Dr. ${user.firstName} ${user.lastName}` 
      : `${user?.firstName} ${user?.lastName}`;
      
    console.log(`🚪 ${userType} logging out:`, displayName);
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Clear state
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setLastStatusCheck(null);
  };

  // Helper functions for role-based logic
  const isDoctor = () => {
    return user?.role === 'doctor';
  };

  const isPatient = () => {
    return user?.role === 'patient' || (!user?.role && user); // Default to patient if no role but user exists
  };

  const isVerifiedDoctor = () => {
    return isDoctor() && user?.isVerified === true;
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    
    if (isDoctor()) {
      return `Dr. ${user.firstName} ${user.lastName}`;
    }
    
    return `${user.firstName} ${user.lastName}`;
  };

  const getUserInfo = () => {
    if (!user) return null;

    const baseInfo = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      fullName: user.fullName || `${user.firstName} ${user.lastName}`,
      displayName: getUserDisplayName(),
      role: user.role || 'patient',
      isDoctor: isDoctor(),
      isPatient: isPatient(),
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    // Add doctor-specific info
    if (isDoctor()) {
      return {
        ...baseInfo,
        specialization: user.specialization,
        hospitalAffiliation: user.hospitalAffiliation,
        yearsOfExperience: user.yearsOfExperience,
        isVerified: user.isVerified || false,
        verificationStatus: user.verificationStatus || 'pending',
        phoneNumber: user.phoneNumber,
        city: user.city,
        state: user.state,
        consultationFee: user.consultationFee,
        rating: user.rating,
        patientsConsulted: user.patientsConsulted,
        medicalLicenseNumber: user.medicalLicenseNumber
      };
    }

    // Add patient-specific info
    return {
      ...baseInfo,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender
    };
  };

  const getDashboardPath = () => {
    if (isDoctor()) {
      return '/doctor-dashboard';
    }
    return '/dashboard';
  };

  const getProfilePath = () => {
    if (isDoctor()) {
      return '/doctor-profile';
    }
    return '/profile';
  };

  const getSettingsPath = () => {
    if (isDoctor()) {
      return '/doctor-settings';
    }
    return '/settings';
  };

  // Update user data (for profile updates, verification status changes, etc.)
  const updateUser = (updatedUserData) => {
    console.log('🔄 Updating user data:', {
      email: updatedUserData.email || user?.email,
      changes: Object.keys(updatedUserData)
    });
    
    const newUserData = { ...user, ...updatedUserData };
    
    // Update localStorage
    localStorage.setItem('user', JSON.stringify(newUserData));
    
    // Update state
    setUser(newUserData);
    
    console.log('✅ User data updated successfully');
    
    // If verification status updated, log it
    if (updatedUserData.isVerified !== undefined || updatedUserData.verificationStatus) {
      console.log('🔍 Verification status updated:', {
        isVerified: newUserData.isVerified,
        status: newUserData.verificationStatus
      });
    }
  };

  // Check if user has specific permissions
  const hasPermission = (permission) => {
    if (!user) return false;

    const permissions = {
      // Doctor permissions
      'view_patients': isVerifiedDoctor(),
      'create_prescriptions': isVerifiedDoctor(),
      'access_medical_records': isVerifiedDoctor(),
      'doctor_dashboard': isDoctor(),
      'consultation_booking': isVerifiedDoctor(),
      'doctor_profile_edit': isDoctor(),
      
      // Patient permissions
      'book_appointments': isPatient(),
      'view_medical_history': isAuthenticated,
      'symptom_checker': isAuthenticated,
      'health_monitoring': isAuthenticated,
      'patient_profile_edit': isPatient(),
      
      // Common permissions
      'profile_edit': isAuthenticated,
      'settings_access': isAuthenticated
    };

    return permissions[permission] || false;
  };

  // Get redirect path based on user role and verification status
  const getRedirectPath = () => {
    if (!isAuthenticated) return '/signin';
    
    if (isDoctor()) {
      return '/doctor-dashboard';
    }
    
    return '/dashboard';
  };

  // Check if doctor needs verification
  const needsVerification = () => {
    return isDoctor() && !isVerifiedDoctor();
  };

  // Get verification status info
  const getVerificationInfo = () => {
    if (!user || !isDoctor()) return null;
    
    return {
      isVerified: user.isVerified || false,
      status: user.verificationStatus || 'pending',
      needsVerification: needsVerification(),
      statusMessage: getVerificationStatusMessage(),
      lastChecked: lastStatusCheck
    };
  };

  const getVerificationStatusMessage = () => {
    if (!isDoctor()) return null;
    
    const status = user?.verificationStatus || 'pending';
    
    const messages = {
      'pending': 'Your account is pending verification by our medical team.',
      'in_review': 'Your account is currently under review by our medical team.',
      'verified': 'Your account has been verified and approved.',
      'rejected': 'Your account verification was rejected. Please contact support.'
    };
    
    return messages[status] || 'Verification status unknown.';
  };

  // Manual refresh function that can be called from components
  const checkVerificationStatus = async () => {
    console.log('🔄 Manual verification status check requested');
    return await refreshUserStatus();
  };

  const value = {
    // Core state
    user,
    token,
    isLoading,
    isAuthenticated,
    
    // Actions
    login,
    logout,
    updateUser,
    
    // Helper functions
    isDoctor,
    isPatient,
    isVerifiedDoctor,
    getUserDisplayName,
    getUserInfo,
    hasPermission,
    needsVerification,
    
    // Navigation helpers
    getDashboardPath,
    getProfilePath,
    getSettingsPath,
    getRedirectPath,
    
    // Verification helpers
    getVerificationInfo,
    getVerificationStatusMessage,
    checkVerificationStatus,
    refreshUserStatus,
    lastStatusCheck,
    
    // User data (for backward compatibility)
    userInfo: getUserInfo()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
