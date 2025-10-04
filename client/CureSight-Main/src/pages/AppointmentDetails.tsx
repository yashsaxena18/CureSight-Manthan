import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Calendar, Clock, User, Building, 
  MapPin, Phone, Video, MessageCircle, Star,
  Download, Pill, FileText, Monitor, Home
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const API_BASE = 'http://localhost:5000/api';

interface AppointmentDetail {
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
    phoneNumber?: string;
  };
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    dateOfBirth: string;
    gender: string;
  };
  appointmentDate: string;
  appointmentTime: string;
  appointmentMode: 'online' | 'clinic' | 'home-visit';
  type: string;
  status: string;
  symptoms: string;
  diagnosis?: string;
  doctorNotes?: string;
  patientNotes?: string;
  prescription: Array<{
    medicine: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
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
  canJoinOnline?: boolean;
  isOverdue?: boolean;
  timeUntilAppointment?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  createdAt: string;
}

export default function AppointmentDetails() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentDetails();
    }
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAppointment(data.appointment);
      } else {
        throw new Error('Failed to fetch appointment details');
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast({
        title: "Error",
        description: "Failed to load appointment details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-emerald-100 text-emerald-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no-show': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'online': return <Monitor className="h-4 w-4 text-green-600" />;
      case 'clinic': return <Building className="h-4 w-4 text-blue-600" />;
      case 'home-visit': return <Home className="h-4 w-4 text-purple-600" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-16 pb-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading appointment details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-16 pb-16 text-center">
            <h3 className="text-xl font-semibold mb-2">Appointment Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The appointment you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/appointments')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/appointments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Appointment Details</h1>
            <p className="text-muted-foreground mt-1">
              View complete appointment information
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(appointment.status)}>
            {appointment.status.toUpperCase()}
          </Badge>
          
          <Badge variant="outline" className="flex items-center space-x-1">
            {getModeIcon(appointment.appointmentMode)}
            <span className="capitalize">{appointment.appointmentMode}</span>
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Date:</span>
                    <span>{format(new Date(appointment.appointmentDate), 'PPP')}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Time:</span>
                    <span>{appointment.appointmentTime}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Type:</span>
                    <span className="capitalize">{appointment.type.replace('-', ' ')}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Fee:</span>
                    <span className="text-green-600 font-semibold">₹{appointment.consultationFee}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Payment:</span>
                    <Badge variant="outline" className="capitalize">
                      {appointment.paymentStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Method:</span>
                    <span className="capitalize">{appointment.paymentMethod}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location/Meeting Details */}
          {appointment.appointmentMode === 'clinic' && appointment.clinicDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Clinic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{appointment.doctor.hospitalAffiliation}</p>
                    <p className="text-muted-foreground">
                      {appointment.clinicDetails.address}
                    </p>
                    <p className="text-muted-foreground">
                      {appointment.clinicDetails.city}, {appointment.clinicDetails.state}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {appointment.appointmentMode === 'online' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="h-5 w-5 mr-2" />
                  Online Meeting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Online consultation via video call
                  </p>
                  
                  {appointment.canJoinOnline && (
                    <Button className="w-full" asChild>
                      <Link to={`/video-consultation/${appointment._id}`}>
                        <Video className="h-4 w-4 mr-2" />
                        Join Video Consultation
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Symptoms */}
          {appointment.symptoms && (
            <Card>
              <CardHeader>
                <CardTitle>Symptoms / Reason for Visit</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{appointment.symptoms}</p>
              </CardContent>
            </Card>
          )}

          {/* Diagnosis */}
          {appointment.diagnosis && (
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{appointment.diagnosis}</p>
              </CardContent>
            </Card>
          )}

          {/* Doctor's Notes */}
          {appointment.doctorNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Doctor's Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{appointment.doctorNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Prescription */}
          {appointment.prescription && appointment.prescription.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Pill className="h-5 w-5 mr-2" />
                  Prescription ({appointment.prescription.length} medicines)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {appointment.prescription.map((med, index) => (
                    <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-green-900">{med.medicine}</h4>
                        <Badge variant="outline" className="text-green-700">
                          {med.duration}
                        </Badge>
                      </div>
                      <div className="text-sm text-green-700 mb-1">
                        <strong>Dosage:</strong> {med.dosage} • <strong>Frequency:</strong> {med.frequency}
                      </div>
                      {med.instructions && (
                        <div className="text-sm text-green-600">
                          <strong>Instructions:</strong> {med.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rating */}
          {appointment.patientRating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  Your Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= appointment.patientRating!
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="font-medium">{appointment.patientRating}/5</span>
                </div>
                {appointment.patientReview && (
                  <p className="text-muted-foreground italic">"{appointment.patientReview}"</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Doctor Info */}
          <Card>
            <CardHeader>
              <CardTitle>Doctor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg">
                  Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                </h3>
                <p className="text-blue-600 font-medium">{appointment.doctor.specialization}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.doctor.hospitalAffiliation}
                </p>
              </div>

              {appointment.doctor.phoneNumber && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{appointment.doctor.phoneNumber}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointment.status === 'scheduled' && (
                <>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/chat/doctor/${appointment.doctor._id}`}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Doctor
                    </Link>
                  </Button>

                  {appointment.canJoinOnline && appointment.appointmentMode === 'online' && (
                    <Button className="w-full" asChild>
                      <Link to={`/video-consultation/${appointment._id}`}>
                        <Video className="h-4 w-4 mr-2" />
                        Join Online
                      </Link>
                    </Button>
                  )}
                </>
              )}

              {appointment.status === 'completed' && (
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              )}

              <Button variant="outline" className="w-full" asChild>
                <Link to="/book-appointment">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Another Appointment
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Appointment Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-2">
                <div>
                  <strong>Booked:</strong> {format(new Date(appointment.createdAt), 'PPp')}
                </div>
                {appointment.followUpRequired && appointment.followUpDate && (
                  <div>
                    <strong>Follow-up:</strong> {format(new Date(appointment.followUpDate), 'PPP')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
