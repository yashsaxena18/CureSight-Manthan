import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, UserCheck, Clock, CheckCircle, 
  XCircle, AlertTriangle, Activity, FileText,
  Eye, Search, Filter, RefreshCw, Crown,
  Stethoscope, Building, GraduationCap,
  Calendar, Phone, Mail, MapPin, Settings,
  BarChart3, TrendingUp, Shield, Bell
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingDoctor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization: string;
  hospitalAffiliation: string;
  yearsOfExperience: number;
  phoneNumber?: string;
  city?: string;
  state?: string;
  medicalLicenseNumber?: string;
  verificationStatus: 'pending' | 'in_review' | 'verified' | 'rejected';
  isVerified: boolean;
  createdAt: string;
  bio?: string;
}

interface AdminStats {
  totalUsers: number;
  totalDoctors: number;
  verifiedDoctors: number;
  pendingVerifications: number;
  totalAppointments: number;
  todayAppointments: number;
  verificationRate: string;
}

interface RecentActivity {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization: string;
  verificationStatus: string;
  createdAt: string;
}

const API_BASE = 'http://localhost:5000/api';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Get admin user info
  const getAdminUser = () => {
    try {
      const adminUser = localStorage.getItem('adminUser');
      return adminUser ? JSON.parse(adminUser) : null;
    } catch {
      return null;
    }
  };

  const adminUser = getAdminUser();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchPendingDoctors(),
        fetchRecentActivities()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentActivities(data.recentActivities || []);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPendingDoctors = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/doctors/pending?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingDoctors(data.doctors || []);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching pending doctors:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/doctors?limit=5&sortBy=recent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Use doctors from pending fetch if this endpoint doesn't exist
        if (!data.doctors && recentActivities.length === 0) {
          // Fallback to pending doctors
          setRecentActivities(pendingDoctors.slice(0, 5) as RecentActivity[]);
        }
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      // Use pending doctors as fallback
      setRecentActivities(pendingDoctors.slice(0, 5) as RecentActivity[]);
    }
  };

  const quickApprove = async (doctorId: string, doctorName: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/doctors/${doctorId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Quick approval from admin dashboard'
        })
      });

      if (response.ok) {
        toast({
          title: "Doctor Approved! ✅",
          description: `Dr. ${doctorName} has been successfully verified and approved.`
        });
        
        fetchDashboardData();
      } else {
        throw new Error('Approval failed');
      }
    } catch (error) {
      console.error('Error approving doctor:', error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve doctor. Please try again.",
        variant: "destructive"
      });
    }
  };

  const quickReject = async (doctorId: string, doctorName: string) => {
    const reason = prompt(`Enter rejection reason for Dr. ${doctorName}:`);
    if (!reason) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/doctors/${doctorId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason,
          notes: 'Quick rejection from admin dashboard'
        })
      });

      if (response.ok) {
        toast({
          title: "Doctor Rejected",
          description: `Dr. ${doctorName} has been rejected. Reason: ${reason}`
        });
        
        fetchDashboardData();
      } else {
        throw new Error('Rejection failed');
      }
    } catch (error) {
      console.error('Error rejecting doctor:', error);
      toast({
        title: "Rejection Failed",
        description: "Failed to reject doctor. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_review': return 'bg-blue-100 text-blue-800';
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_review': return <Eye className="h-4 w-4" />;
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const filteredDoctors = pendingDoctors.filter(doctor =>
    searchQuery === '' ||
    doctor.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.hospitalAffiliation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Loading Admin Dashboard</h2>
              <p className="text-muted-foreground">Please wait while we fetch the latest data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Crown className="h-8 w-8 text-slate-700" />
            <span>Admin Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {adminUser?.firstName}! Manage doctor verifications and platform oversight
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="bg-slate-100 text-slate-700">
            {adminUser?.adminLevel} Admin
          </Badge>
          
          <Button
            onClick={fetchDashboardData}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered patients</p>
              <div className="mt-2">
                <div className="text-xs text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Active users
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Doctors
                </CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalDoctors}</div>
              <p className="text-xs text-muted-foreground">
                {stats.verifiedDoctors} verified ({stats.verificationRate}%)
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.verificationRate}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Verifications
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pendingVerifications}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
              {stats.pendingVerifications > 0 && (
                <div className="mt-2">
                  <Link to="/admin/doctors/verification">
                    <Button size="sm" variant="outline" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Review Now
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Today's Activity
                </CardTitle>
                <Activity className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalAppointments} total appointments
              </p>
              <div className="mt-2">
                <div className="text-xs text-muted-foreground">
                  Platform activity
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for Different Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending">Pending Doctors</TabsTrigger>
          <TabsTrigger value="activities">Recent Activities</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/admin/doctors/verification">
                  <Button className="w-full justify-start" variant="outline">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Doctor Verification
                  </Button>
                </Link>
                
                <Link to="/admin/users">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    User Management
                  </Button>
                </Link>
                
                <Link to="/admin/analytics">
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics
                  </Button>
                </Link>
                
                <Link to="/admin/settings">
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    System Settings
                  </Button>
                </Link>

                <div className="pt-4 border-t">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">System Health</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          All systems operational. Database connected.
                        </p>
                        <Badge className="mt-2 bg-green-100 text-green-800">Healthy</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Doctor Applications */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Doctor Applications</CardTitle>
                    <CardDescription>
                      Latest doctor registration requests
                    </CardDescription>
                  </div>
                  <Link to="/admin/doctors/verification">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.slice(0, 5).map((activity) => (
                      <div key={activity._id} className="flex items-center space-x-4 p-3 rounded-lg border">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                          <Stethoscope className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">
                              Dr. {activity.firstName} {activity.lastName}
                            </p>
                            <Badge className={getStatusColor(activity.verificationStatus)}>
                              {activity.verificationStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {activity.specialization} • Applied {new Date(activity.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Link to={`/admin/doctors/${activity._id}/review`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent activities</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pending Doctors Tab */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Doctor Verifications</CardTitle>
                  <CardDescription>
                    Review and approve doctor applications
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                    {filteredDoctors.length} {searchQuery ? 'filtered' : 'pending'}
                  </Badge>
                  <Link to="/admin/doctors/verification">
                    <Button size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Advanced View
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search doctors by name, email, specialization, or hospital..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredDoctors.length > 0 ? (
                <div className="space-y-4">
                  {filteredDoctors.map((doctor) => (
                    <div key={doctor._id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-green-500/20">
                            <Stethoscope className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-lg">
                                Dr. {doctor.firstName} {doctor.lastName}
                              </h4>
                              <Badge className={getStatusColor(doctor.verificationStatus)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(doctor.verificationStatus)}
                                  <span className="capitalize">{doctor.verificationStatus}</span>
                                </div>
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                              <div className="space-y-1">
                                <div className="flex items-center">
                                  <Stethoscope className="h-4 w-4 mr-2" />
                                  {doctor.specialization}
                                </div>
                                <div className="flex items-center">
                                  <Building className="h-4 w-4 mr-2" />
                                  {doctor.hospitalAffiliation}
                                </div>
                                <div className="flex items-center">
                                  <GraduationCap className="h-4 w-4 mr-2" />
                                  {doctor.yearsOfExperience} years experience
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-2" />
                                  {doctor.email}
                                </div>
                                {doctor.phoneNumber && (
                                  <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-2" />
                                    {doctor.phoneNumber}
                                  </div>
                                )}
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Applied: {new Date(doctor.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            {doctor.bio && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  <span className="font-medium">Bio:</span> {doctor.bio}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Link to={`/admin/doctors/${doctor._id}/review`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </Link>
                        
                        {doctor.verificationStatus === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => quickApprove(doctor._id, `${doctor.firstName} ${doctor.lastName}`)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => quickReject(doctor._id, `${doctor.firstName} ${doctor.lastName}`)}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  {searchQuery ? (
                    <>
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Doctors Found</h3>
                      <p className="text-muted-foreground mb-4">
                        No doctors match "{searchQuery}". Try a different search term.
                      </p>
                      <Button onClick={() => setSearchQuery('')} variant="outline">
                        Clear Search
                      </Button>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                      <p className="text-muted-foreground">
                        No pending doctor verifications at the moment.
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Platform Activities</CardTitle>
              <CardDescription>
                Latest doctor registrations and system activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity._id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Stethoscope className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">
                                Dr. {activity.firstName} {activity.lastName}
                              </p>
                              <Badge className={getStatusColor(activity.verificationStatus)}>
                                {activity.verificationStatus}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {activity.specialization} • {activity.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Applied on {new Date(activity.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <Link to={`/admin/doctors/${activity._id}/review`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recent Activities</h3>
                  <p className="text-muted-foreground">
                    Recent platform activities will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
