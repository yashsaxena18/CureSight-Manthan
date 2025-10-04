import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Settings, Shield, Bell, Eye, EyeOff,
  Save, RefreshCw, AlertTriangle, CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'http://localhost:5000/api';

export default function DoctorSettings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    appointmentReminders: true,
    patientMessages: true,
    systemUpdates: false
  });

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showContactInfo: true,
    allowPatientReviews: true
  });

  const updatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords don't match. Please check and try again.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Weak Password",
        description: "New password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/doctor/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        toast({
          title: "Password Updated! ✅",
          description: "Your password has been changed successfully."
        });
        
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Password update failed');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Update Failed",
        description: (error as Error).message || "Failed to update password.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/doctor/notification-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationSettings)
      });

      if (response.ok) {
        toast({
          title: "Settings Updated! ✅",
          description: "Your notification preferences have been saved."
        });
      }
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update notification settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deactivateAccount = async () => {
    if (window.confirm('Are you sure you want to deactivate your account? This action can be reversed by contacting support.')) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/doctor/deactivate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          toast({
            title: "Account Deactivated",
            description: "Your account has been deactivated. Contact support to reactivate."
          });
          logout();
        }
      } catch (error) {
        console.error('Error deactivating account:', error);
        toast({
          title: "Deactivation Failed",
          description: "Failed to deactivate account. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <span>Account Settings</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account security, notifications, and privacy settings
        </p>
      </div>

      <div className="space-y-8">
        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security Settings</span>
            </CardTitle>
            <CardDescription>
              Update your password and manage account security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">
                    Dr. {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-blue-700">
                    {user?.email} • Account created: {new Date(user?.createdAt || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Password Change */}
            <div className="space-y-4">
              <h4 className="font-semibold">Change Password</h4>
              
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value
                    })}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-muted-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value
                      })}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-muted-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value
                    })}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <Button 
                onClick={updatePassword}
                disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notification Settings</span>
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="emailNotifications"
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => setNotificationSettings({
                    ...notificationSettings,
                    emailNotifications: !!checked
                  })}
                />
                <div>
                  <Label htmlFor="emailNotifications" className="cursor-pointer">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive important updates via email
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="appointmentReminders"
                  checked={notificationSettings.appointmentReminders}
                  onCheckedChange={(checked) => setNotificationSettings({
                    ...notificationSettings,
                    appointmentReminders: !!checked
                  })}
                />
                <div>
                  <Label htmlFor="appointmentReminders" className="cursor-pointer">
                    Appointment Reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about upcoming appointments
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="patientMessages"
                  checked={notificationSettings.patientMessages}
                  onCheckedChange={(checked) => setNotificationSettings({
                    ...notificationSettings,
                    patientMessages: !!checked
                  })}
                />
                <div>
                  <Label htmlFor="patientMessages" className="cursor-pointer">
                    Patient Messages
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications for patient inquiries and messages
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="systemUpdates"
                  checked={notificationSettings.systemUpdates}
                  onCheckedChange={(checked) => setNotificationSettings({
                    ...notificationSettings,
                    systemUpdates: !!checked
                  })}
                />
                <div>
                  <Label htmlFor="systemUpdates" className="cursor-pointer">
                    System Updates
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Platform updates and new feature announcements
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={updateNotificationSettings} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Notification Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Danger Zone</span>
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">
                Deactivate Account
              </h4>
              <p className="text-sm text-red-700 mb-4">
                Temporarily deactivate your doctor account. You can contact support to reactivate it later. 
                This will hide your profile from patients and cancel all upcoming appointments.
              </p>
              <Button 
                variant="destructive" 
                onClick={deactivateAccount}
                className="bg-red-600 hover:bg-red-700"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Deactivate Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
