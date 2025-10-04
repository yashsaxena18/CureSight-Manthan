import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, Clock, Stethoscope, Building, 
  MapPin, Phone, Star, RefreshCw, AlertCircle,
  CheckCircle, XCircle, Eye, MessageCircle, Video,
  Monitor, Home, Filter, CalendarDays, Timer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';

interface Appointment {
  _id: string;
  doctor: {
    _id: string;
    firstName: string;
    lastName: string;
    specialization: string;
    hospitalAffiliation: string;
    consultationFee: number;
    address?: string;
    city?: string;
    state?: string;
  };
  appointmentDate: string;
  appointmentTime: string;
  appointmentMode: 'online' | 'clinic' | 'home-visit';
  type: string;
  status: string;
  realTimeStatus?: string;
  symptoms: string;
  diagnosis?: string;
  patientNotes?: string;
  consultationFee: number;
  paymentStatus: string;
  paymentMethod: string;
  patientRating?: number;
  patientReview?: string;
  clinicDetails?: {
    address: string;
    city: string;
    state: string;
  };
  onlineMeetingDetails?: {
    meetingId: string;
    meetingLink: string;
    platform: string;
  };
  isUpcoming: boolean;
  timeUntilAppointment?: string;
  canJoinOnline?: boolean;
  createdAt: string;
}

export default function MyAppointments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const socketRef = useRef<any>(null);

  // States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [dateFilter, setDateFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState({
    total: 0,
    upcoming: 0,
    online: 0,
    clinic: 0
  });

  // Real-time socket connection
  useEffect(() => {
    initializeSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    fetchAppointments();
    // Refresh every minute for real-time status updates
    const interval = setInterval(() => {
      fetchAppointments();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [activeTab, dateFilter, modeFilter]);

  const initializeSocket = () => {
    socketRef.current = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('authToken'),
        userId: user?._id,
        userType: 'patient'
      }
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Appointments socket connected');
    });

    // Real-time appointment updates
    socketRef.current.on('appointment-updated', (data: any) => {
      console.log('🔄 Appointment updated in real-time:', data);
      fetchAppointments();
      toast({
        title: "Appointment Updated",
        description: `Your appointment has been ${data.status}`,
      });
    });

    socketRef.current.on('appointment-reminder', (data: any) => {
      toast({
        title: "Appointment Reminder",
        description: `Your appointment with Dr. ${data.doctorName} is in ${data.timeRemaining}`,
      });
    });
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        ...(activeTab === 'upcoming' && { upcoming: 'true' }),
        ...(activeTab !== 'all' && activeTab !== 'upcoming' && { status: activeTab }),
        ...(modeFilter !== 'all' && { mode: modeFilter }),
        ...(dateFilter === 'today' && { 
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }),
        ...(dateFilter === 'week' && { 
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }),
        ...(dateFilter === 'month' && { 
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
      });

      const response = await fetch(`${API_BASE}/appointments/my-appointments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Appointments fetched:', data);
        
        let filteredAppointments = data.appointments || [];
        
        // Client-side search filter
        if (searchTerm) {
          filteredAppointments = filteredAppointments.filter((apt: Appointment) =>
            `${apt.doctor.firstName} ${apt.doctor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.symptoms.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        setAppointments(filteredAppointments);
        setSummary(data.summary || { total: 0, upcoming: 0, online: 0, clinic: 0 });
      } else {
        throw new Error('Failed to fetch appointments');
      }
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointments.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const rateAppointment = async (appointmentId: string, rating: number, review?: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/appointments/${appointmentId}/rate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, review })
      });

      if (response.ok) {
        toast({
          title: "Thank You!",
          description: "Your rating has been submitted."
        });
        fetchAppointments();
      } else {
        throw new Error('Failed to submit rating');
      }
    } catch (error) {
      console.error('❌ Error rating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string, realTimeStatus?: string) => {
    const statusToUse = realTimeStatus || status;
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-emerald-100 text-emerald-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no-show': 'bg-gray-100 text-gray-800',
      'soon': 'bg-orange-100 text-orange-800',
      'overdue': 'bg-red-100 text-red-800',
      'missed': 'bg-red-200 text-red-900'
    };
    return colors[statusToUse] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string, realTimeStatus?: string) => {
    const statusToUse = realTimeStatus || status;
    switch (statusToUse) {
      case 'scheduled': return <Clock className="h-3 w-3" />;
      case 'confirmed': return <CheckCircle className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      case 'soon': return <Timer className="h-3 w-3" />;
      case 'overdue': return <AlertCircle className="h-3 w-3" />;
      case 'missed': return <XCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'online': return <Monitor className="h-4 w-4 text-green-600" />;
      case 'clinic': return <Building className="h-4 w-4 text-blue-600" />;
      case 'home-visit': return <Home className="h-4 w-4 text-purple-600" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'PPP');
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Manage your healthcare appointments
          </p>
        </div>
        <Button onClick={fetchAppointments} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-sm text-muted-foreground">Total Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{summary.upcoming}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Monitor className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{summary.online}</p>
                <p className="text-sm text-muted-foreground">Online Consultations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{summary.clinic}</p>
                <p className="text-sm text-muted-foreground">Clinic Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Mode Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="online">Online Only</SelectItem>
                <SelectItem value="clinic">Clinic Only</SelectItem>
                <SelectItem value="home-visit">Home Visit</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search by doctor or symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {loading ? (
            <div className="grid gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : appointments.length > 0 ? (
            <div className="grid gap-6">
              {appointments.map((appointment) => (
                <Card key={appointment._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-green-500/20">
                        <Stethoscope className="h-8 w-8 text-blue-600" />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                            </h3>
                            <p className="text-blue-600 font-medium">{appointment.doctor.specialization}</p>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Building className="h-4 w-4 mr-1" />
                              {appointment.doctor.hospitalAffiliation}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(appointment.status, appointment.realTimeStatus)}>
                              {getStatusIcon(appointment.status, appointment.realTimeStatus)}
                              <span className="ml-1 capitalize">{appointment.realTimeStatus || appointment.status}</span>
                            </Badge>
                            
                            <Badge variant="outline" className="flex items-center space-x-1">
                              {getModeIcon(appointment.appointmentMode)}
                              <span className="capitalize">{appointment.appointmentMode}</span>
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center text-muted-foreground">
                              <CalendarDays className="h-4 w-4 mr-2" />
                              <span>{getDateLabel(appointment.appointmentDate)}</span>
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>{appointment.appointmentTime}</span>
                              {appointment.timeUntilAppointment && (
                                <span className="ml-2 text-green-600 font-medium">
                                  (in {appointment.timeUntilAppointment})
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center text-muted-foreground">
                              <span className="font-medium mr-2">Type:</span>
                              <span className="capitalize">{appointment.type.replace('-', ' ')}</span>
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <span className="font-medium mr-2">Fee:</span>
                              <span className="text-green-600 font-medium">₹{appointment.consultationFee}</span>
                            </div>
                          </div>
                        </div>

                        {/* Location Details */}
                        {appointment.appointmentMode === 'clinic' && appointment.clinicDetails && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-blue-900">Clinic Address:</p>
                                <p className="text-sm text-blue-700">
                                  {appointment.clinicDetails.address}, {appointment.clinicDetails.city}, {appointment.clinicDetails.state}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {appointment.symptoms && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm">
                              <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                            </p>
                          </div>
                        )}

                        {appointment.diagnosis && (
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-sm">
                              <span className="font-medium">Diagnosis:</span> {appointment.diagnosis}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/appointments/${appointment._id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Link>
                          </Button>
                          
                          {appointment.canJoinOnline && appointment.appointmentMode === 'online' && (
                            <Button size="sm" asChild>
                              <Link to={`/video-consultation/${appointment._id}`}>
                                <Video className="h-4 w-4 mr-1" />
                                Join Online
                              </Link>
                            </Button>
                          )}
                          
                          {appointment.status === 'scheduled' && (
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/chat/doctor/${appointment.doctor._id}`}>
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Contact Doctor
                              </Link>
                            </Button>
                          )}
                          
                          {appointment.status === 'completed' && !appointment.patientRating && (
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <Button
                                  key={rating}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => rateAppointment(appointment._id, rating)}
                                  className="p-1 h-8 w-8"
                                >
                                  <Star className="h-4 w-4 text-yellow-500" />
                                </Button>
                              ))}
                            </div>
                          )}

                          {appointment.patientRating && (
                            <Badge variant="outline" className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span>Rated {appointment.patientRating}/5</span>
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Booked: {format(new Date(appointment.createdAt), 'PPp')} • 
                          Payment: {appointment.paymentStatus} • 
                          Mode: {appointment.appointmentMode}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Appointments Found</h3>
                <p className="text-muted-foreground mb-6">
                  {activeTab === 'upcoming' 
                    ? "You don't have any upcoming appointments."
                    : `No ${activeTab} appointments found.`
                  }
                </p>
                <Button asChild>
                  <Link to="/find-doctors">
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Find Doctors
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
