import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Calendar, Phone, Mail, FileText, Pill, 
  Heart, Activity, Download, Upload, Video, MessageSquare,
  Clock, MapPin, AlertCircle, CheckCircle, ArrowLeft,
  Stethoscope, TestTube, FileImage, Send, Paperclip,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth: string;
  gender: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
  bloodGroup?: string;
  height?: string;
  weight?: string;
}

interface Consultation {
  _id: string;
  appointmentDate?: string;
  consultationDate?: string;
  appointmentTime?: string;
  consultationTime?: string;
  symptoms: string;
  diagnosis: string;
  doctorNotes: string;
  prescription: Array<{
    medicine: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  status: string;
  followUpRequired: boolean;
  followUpDate?: string;
  createdAt: string;
  patient?: {
    firstName: string;
    lastName: string;
  };
  doctor?: {
    _id: string;
    firstName: string;
    lastName: string;
    specialization: string;
  };
  source?: string;
}

interface Message {
  _id: string;
  sender: string;
  recipient: string;
  senderType: 'doctor' | 'patient';
  content: string;
  type: 'text' | 'prescription' | 'file';
  read: boolean;
  createdAt: string;
  senderName?: string;
}

interface HealthRecord {
  _id: string;
  type: 'lab_report' | 'xray' | 'mri' | 'prescription' | 'note';
  title: string;
  description: string;
  fileUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
  tags: string[];
}

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const socketRef = useRef<any>(null);

  // States
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  
  // Real-time chat
  const [newMessage, setNewMessage] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (patientId) {
      initializeSocket();
      fetchAllData();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [patientId]);

  const initializeSocket = () => {
    socketRef.current = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('authToken'),
        userId: user?._id,
        userType: 'doctor'
      }
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Patient detail socket connected');
      setIsOnline(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsOnline(false);
    });

    // Real-time data updates
    socketRef.current.on('patient-updated', (data: any) => {
      if (data.patientId === patientId) {
        console.log('🔄 Patient data updated in real-time');
        fetchPatientDetails();
        toast({
          title: "Patient Updated",
          description: "Patient information updated in real-time"
        });
      }
    });

    socketRef.current.on('consultation-added', (data: any) => {
      if (data.patientId === patientId) {
        console.log('📋 New consultation added');
        fetchAllConsultationData();
        toast({
          title: "New Consultation Added",
          description: "Patient consultation history updated"
        });
      }
    });

    // Real-time chat messages
    socketRef.current.on('new-message', (message: Message) => {
      console.log('💬 New message received:', message);
      setMessages(prev => [...prev, message]);
      
      toast({
        title: "New Message",
        description: `Message from ${message.senderName || 'Patient'}`,
      });
    });
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPatientDetails(),
        fetchAllConsultationData(),
        fetchHealthRecords(),
        fetchChatHistory()
      ]);
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load patient data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "Patient data updated successfully"
    });
  };

  const fetchPatientDetails = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/doctor/patients/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Patient details fetched:', data);
        setPatient(data.patient);
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch patient details`);
      }
    } catch (error) {
      console.error('❌ Error fetching patient details:', error);
    }
  };

  const fetchAllConsultationData = async () => {
    console.log('🔍 Fetching ALL consultation data...');
    
    try {
      const token = localStorage.getItem('authToken');
      
      // Try multiple endpoints to get consultation data
      const endpoints = [
        `${API_BASE}/doctor/patients/${patientId}/consultations`,
        `${API_BASE}/consultation/patient/${patientId}/history`,
        `${API_BASE}/appointments/doctor/appointments?patientId=${patientId}`,
      ];

      let allConsultations: Consultation[] = [];

      for (const endpoint of endpoints) {
        try {
          console.log(`📡 Trying endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Data from ${endpoint}:`, data);
            
            let consultationData = [];
            
            // Handle different response formats
            if (data.consultations) {
              consultationData = data.consultations;
            } else if (data.appointments) {
              consultationData = data.appointments;
            } else if (Array.isArray(data)) {
              consultationData = data;
            }
            
            if (consultationData.length > 0) {
              console.log(`✅ Found ${consultationData.length} consultations from ${endpoint}`);
              
              // Transform data to consistent format
              const transformedData = consultationData.map((item: any) => ({
                _id: item._id,
                appointmentDate: item.appointmentDate || item.consultationDate,
                consultationDate: item.consultationDate || item.appointmentDate,
                appointmentTime: item.appointmentTime || item.consultationTime,
                consultationTime: item.consultationTime || item.appointmentTime,
                symptoms: item.symptoms || '',
                diagnosis: item.diagnosis || '',
                doctorNotes: item.doctorNotes || '',
                prescription: item.prescription || [],
                status: item.status || 'completed',
                followUpRequired: item.followUpRequired || false,
                followUpDate: item.followUpDate,
                createdAt: item.createdAt || item.appointmentDate,
                patient: item.patient,
                doctor: item.doctor || {
                  _id: user?._id,
                  firstName: user?.firstName,
                  lastName: user?.lastName,
                  specialization: user?.specialization || 'General Medicine'
                },
                source: endpoint.includes('consultation') ? 'consultation' : 'appointment'
              }));
              
              allConsultations = [...allConsultations, ...transformedData];
            }
          }
        } catch (endpointError) {
          console.log(`⚠️ Endpoint ${endpoint} failed:`, endpointError);
        }
      }

      // Remove duplicates based on _id
      const uniqueConsultations = allConsultations.filter((consultation, index, self) => 
        index === self.findIndex(c => c._id === consultation._id)
      );

      // Sort by date (most recent first)
      uniqueConsultations.sort((a, b) => {
        const dateA = new Date(a.consultationDate || a.appointmentDate || a.createdAt);
        const dateB = new Date(b.consultationDate || b.appointmentDate || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      console.log(`✅ Final consultations count: ${uniqueConsultations.length}`);
      console.log('📋 Consultations data:', uniqueConsultations);
      
      setConsultations(uniqueConsultations);

    } catch (error) {
      console.error('❌ Error fetching consultation data:', error);
      setConsultations([]);
    }
  };

  const fetchHealthRecords = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/doctor/patients/${patientId}/health-records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Health records fetched:', data);
        setHealthRecords(data.records || []);
      } else {
        console.log('⚠️ Health records endpoint not available');
        setHealthRecords([]);
      }
    } catch (error) {
      console.error('❌ Error fetching health records:', error);
      setHealthRecords([]);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/doctor/patients/${patientId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Chat history fetched:', data);
        setMessages(data.messages || []);
      } else {
        console.log('⚠️ Chat history endpoint not available');
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error fetching chat history:', error);
      setMessages([]);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const sendQuickMessage = async () => {
    if (!newMessage.trim() || !socketRef.current) return;
    
    const messageData = {
      id: Date.now().toString(),
      senderId: user?._id,
      senderType: 'doctor',
      content: newMessage.trim(),
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };
    
    const optimisticMessage: Message = {
      _id: messageData.id,
      sender: user?._id || '',
      recipient: patientId || '',
      senderType: 'doctor',
      content: messageData.content,
      type: 'text',
      read: false,
      createdAt: new Date().toISOString(),
      senderName: `Dr. ${user?.firstName} ${user?.lastName}`
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    socketRef.current.emit('send-message', {
      to: patientId,
      message: messageData
    });
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/doctor/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: patientId,
          content: messageData.content,
          type: 'text'
        })
      });

      if (response.ok) {
        console.log('✅ Message saved to database');
      }
    } catch (error) {
      console.error('❌ Error saving message:', error);
    }

    toast({
      title: "Message Sent",
      description: "Quick message sent to patient"
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'completed': 'bg-emerald-100 text-emerald-800',
      'cancelled': 'bg-red-100 text-red-800',
      'in-progress': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-16 pb-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading patient details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-16 pb-16 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Patient Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The patient you're looking for doesn't exist or you don't have access.
            </p>
            <Button onClick={() => navigate('/doctor/patients')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/doctor/patients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <span>Patient Records</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete medical records for {patient.firstName} {patient.lastName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Badge variant={isOnline ? "default" : "secondary"} className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span>{isOnline ? 'Real-time Active' : 'Offline'}</span>
          </Badge>
          
          <Button variant="outline" size="sm" asChild>
            <Link to={`/doctor/video-consultation/${patientId}`}>
              <Video className="h-4 w-4 mr-2" />
              Video Call
            </Link>
          </Button>
          
          <Button variant="outline" size="sm" asChild>
            <Link to={`/doctor/chat/${patientId}`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Link>
          </Button>
          
          <Button size="sm" asChild>
            <Link to={`/doctor/consultation/${patientId}`}>
              <Stethoscope className="h-4 w-4 mr-2" />
              New Consultation
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient Info Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <User className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="font-semibold text-xl">
                  {patient.firstName} {patient.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {calculateAge(patient.dateOfBirth)} years • {patient.gender}
                </p>
                {patient.bloodGroup && (
                  <Badge variant="outline" className="mt-2">
                    Blood Group: {patient.bloodGroup}
                  </Badge>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="break-all">{patient.email}</span>
                </div>
                
                {patient.phoneNumber && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{patient.phoneNumber}</span>
                  </div>
                )}
                
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
                </div>

                {patient.address && (
                  <div className="flex items-start text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
                    <span>{patient.address}</span>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="pt-4 border-t space-y-2">
                <h4 className="text-sm font-medium">Quick Stats</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="font-bold text-blue-600">{consultations.length}</div>
                    <div className="text-xs text-muted-foreground">Consultations</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-bold text-green-600">{healthRecords.length}</div>
                    <div className="text-xs text-muted-foreground">Records</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Quick Message
                {isOnline && <Badge variant="outline" className="ml-2 text-xs">Live</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Recent messages preview */}
              {messages.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-2 mb-3 p-2 bg-gray-50 rounded">
                  {messages.slice(-3).map((message) => (
                    <div
                      key={message._id}
                      className={`text-xs p-2 rounded ${
                        message.senderType === 'doctor'
                          ? 'bg-blue-100 text-blue-800 ml-4'
                          : 'bg-gray-100 text-gray-800 mr-4'
                      }`}
                    >
                      <div className="font-medium">
                        {message.senderType === 'doctor' ? 'You' : 'Patient'}
                      </div>
                      <div>{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {formatMessageTime(message.createdAt)}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="text-xs text-gray-500 italic mr-4">
                      Patient is typing...
                    </div>
                  )}
                </div>
              )}

              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendQuickMessage()}
                disabled={!isOnline}
              />
              <Button 
                onClick={sendQuickMessage} 
                disabled={!newMessage.trim() || !isOnline}
                className="w-full"
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {isOnline ? 'Send Message' : 'Offline'}
              </Button>
              
              <div className="text-xs text-center text-muted-foreground">
                {messages.length} total messages • {isOnline ? 'Real-time active' : 'Offline mode'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="consultations">
                Consultations
                {consultations.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {consultations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="prescriptions">
                Prescriptions
                {consultations.filter(c => c.prescription?.length > 0).length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {consultations.filter(c => c.prescription?.length > 0).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="records">
                Health Records
                {healthRecords.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {healthRecords.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest consultations and health updates</CardDescription>
                </CardHeader>
                <CardContent>
                  {consultations.slice(0, 5).map((consultation, index) => (
                    <div key={consultation._id || index} className="flex items-start space-x-3 py-3 border-b last:border-b-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">
                            Consultation - {new Date(consultation.consultationDate || consultation.appointmentDate || consultation.createdAt).toLocaleDateString()}
                          </h4>
                          <Badge className={getStatusColor(consultation.status)}>
                            {consultation.status}
                          </Badge>
                        </div>
                        {consultation.diagnosis && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {consultation.diagnosis.length > 100 
                              ? `${consultation.diagnosis.substring(0, 100)}...`
                              : consultation.diagnosis
                            }
                          </p>
                        )}
                        {consultation.symptoms && (
                          <p className="text-xs text-gray-500 mt-1">
                            Symptoms: {consultation.symptoms.length > 80 
                              ? `${consultation.symptoms.substring(0, 80)}...`
                              : consultation.symptoms
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {consultations.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No consultations yet</p>
                      <Button variant="outline" size="sm" className="mt-2" asChild>
                        <Link to={`/doctor/consultation/${patientId}`}>
                          Start First Consultation
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Medical History */}
              {patient.medicalHistory && patient.medicalHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Medical History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {patient.medicalHistory.map((item, index) => (
                        <Badge key={index} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Allergies */}
              {patient.allergies && patient.allergies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                      Allergies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {patient.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Real-time Chat Preview */}
              {messages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Recent Messages
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/doctor/chat/${patientId}`}>
                          View All
                        </Link>
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {messages.slice(-5).map((message) => (
                        <div
                          key={message._id}
                          className={`flex ${message.senderType === 'doctor' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs p-2 rounded-lg text-sm ${
                              message.senderType === 'doctor'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <div>{message.content}</div>
                            <div className={`text-xs mt-1 ${
                              message.senderType === 'doctor' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {formatMessageTime(message.createdAt)}
                              {message.senderType === 'doctor' && (
                                <span className="ml-1">
                                  {message.read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Consultations Tab - FIXED WITH REAL DATA */}
            <TabsContent value="consultations" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Consultation History</CardTitle>
                      <CardDescription>
                        {consultations.length > 0 
                          ? `${consultations.length} consultations found`
                          : 'All consultations and appointments'
                        }
                      </CardDescription>
                    </div>
                    <Button size="sm" asChild>
                      <Link to={`/doctor/consultation/${patientId}`}>
                        <Stethoscope className="h-4 w-4 mr-2" />
                        New Consultation
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {consultations.map((consultation, index) => (
                      <Card key={consultation._id || index} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">
                                {new Date(consultation.consultationDate || consultation.appointmentDate || consultation.createdAt).toLocaleDateString()}
                                {(consultation.consultationTime || consultation.appointmentTime) && 
                                  ` at ${consultation.consultationTime || consultation.appointmentTime}`
                                }
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {consultation.doctor?.firstName && consultation.doctor?.lastName 
                                  ? `Dr. ${consultation.doctor.firstName} ${consultation.doctor.lastName}`
                                  : `Dr. ${user?.firstName || 'Unknown'} ${user?.lastName || 'Doctor'}`
                                }
                                {consultation.doctor?.specialization && ` • ${consultation.doctor.specialization}`}
                              </p>
                              <div className="text-xs text-gray-500 mt-1">
                                Source: {consultation.source || 'system'} • ID: {consultation._id}
                              </div>
                            </div>
                            <Badge className={getStatusColor(consultation.status)}>
                              {consultation.status}
                            </Badge>
                          </div>
                          
                          {consultation.symptoms && (
                            <div className="mb-3">
                              <h5 className="font-medium text-sm mb-1">Symptoms:</h5>
                              <p className="text-sm text-muted-foreground">{consultation.symptoms}</p>
                            </div>
                          )}
                          
                          {consultation.diagnosis && (
                            <div className="mb-3">
                              <h5 className="font-medium text-sm mb-1">Diagnosis:</h5>
                              <p className="text-sm">{consultation.diagnosis}</p>
                            </div>
                          )}
                          
                          {consultation.doctorNotes && (
                            <div className="mb-3">
                              <h5 className="font-medium text-sm mb-1">Doctor's Notes:</h5>
                              <p className="text-sm text-muted-foreground">{consultation.doctorNotes}</p>
                            </div>
                          )}
                          
                          {consultation.prescription && consultation.prescription.length > 0 && (
                            <div className="mb-3">
                              <h5 className="font-medium text-sm mb-2 flex items-center">
                                <Pill className="h-4 w-4 mr-1" />
                                Prescription ({consultation.prescription.length} medicines):
                              </h5>
                              <div className="space-y-2">
                                {consultation.prescription.map((med, medIndex) => (
                                  <div key={medIndex} className="bg-green-50 p-2 rounded border">
                                    <div className="font-medium text-sm text-green-900">{med.medicine}</div>
                                    <div className="text-xs text-green-700">
                                      {med.dosage} • {med.frequency} • {med.duration}
                                    </div>
                                    {med.instructions && (
                                      <div className="text-xs text-green-600 mt-1">
                                        Instructions: {med.instructions}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {consultation.followUpRequired && (
                            <Badge variant="outline" className="text-amber-700 border-amber-200">
                              Follow-up Required
                              {consultation.followUpDate && (
                                <span className="ml-2">({new Date(consultation.followUpDate).toLocaleDateString()})</span>
                              )}
                            </Badge>
                          )}

                          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                            Created: {new Date(consultation.createdAt || consultation.consultationDate || consultation.appointmentDate).toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {consultations.length === 0 && (
                      <div className="text-center py-12">
                        <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Consultations Yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Start the first consultation with this patient.
                        </p>
                        <Button asChild>
                          <Link to={`/doctor/consultation/${patientId}`}>
                            <Stethoscope className="h-4 w-4 mr-2" />
                            Start Consultation
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Prescriptions Tab - FIXED WITH REAL DATA */}
            <TabsContent value="prescriptions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Pill className="h-5 w-5 mr-2" />
                    All Prescriptions
                  </CardTitle>
                  <CardDescription>
                    {consultations.filter(c => c.prescription?.length > 0).length > 0
                      ? `${consultations.filter(c => c.prescription?.length > 0).length} prescriptions found`
                      : 'Complete prescription history'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {consultations
                      .filter(c => c.prescription && c.prescription.length > 0)
                      .map((consultation, index) => (
                      <Card key={consultation._id || index} className="border-l-4 border-l-green-500">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">
                                {new Date(consultation.consultationDate || consultation.appointmentDate || consultation.createdAt).toLocaleDateString()}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Prescribed by {consultation.doctor?.firstName && consultation.doctor?.lastName 
                                  ? `Dr. ${consultation.doctor.firstName} ${consultation.doctor.lastName}`
                                  : `Dr. ${user?.firstName || 'Unknown'} ${user?.lastName || 'Doctor'}`
                                }
                              </p>
                              {consultation.diagnosis && (
                                <p className="text-xs text-muted-foreground">
                                  For: {consultation.diagnosis}
                                </p>
                              )}
                            </div>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                          
                          <div className="space-y-3">
                            {consultation.prescription.map((med, medIndex) => (
                              <div key={medIndex} className="bg-green-50 p-3 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-green-900">{med.medicine}</h5>
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
                          
                          <div className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                            Total medicines: {consultation.prescription.length} • 
                            Date: {new Date(consultation.consultationDate || consultation.appointmentDate || consultation.createdAt).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {consultations.filter(c => c.prescription?.length > 0).length === 0 && (
                      <div className="text-center py-12">
                        <Pill className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Prescriptions Yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Prescriptions will appear here after consultations with prescribed medicines.
                        </p>
                        <Button asChild>
                          <Link to={`/doctor/consultation/${patientId}`}>
                            <Stethoscope className="h-4 w-4 mr-2" />
                            Start Consultation
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Health Records Tab */}
            <TabsContent value="records" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <FileImage className="h-5 w-5 mr-2" />
                        Health Records
                      </CardTitle>
                      <CardDescription>
                        {healthRecords.length > 0
                          ? `${healthRecords.length} records found`
                          : 'Lab reports, X-rays, MRIs, and other medical documents'
                        }
                      </CardDescription>
                    </div>
                    <Button size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Record
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {healthRecords.map((record) => (
                      <Card key={record._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <TestTube className="h-5 w-5 text-blue-600" />
                              <div>
                                <h4 className="font-medium">{record.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {record.type.replace('_', ' ').toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">
                              {new Date(record.uploadedAt).toLocaleDateString()}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">{record.description}</p>
                          
                          {record.tags && record.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {record.tags.map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <FileText className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                            Uploaded by: {record.uploadedBy} • 
                            {new Date(record.uploadedAt).toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {healthRecords.length === 0 && (
                      <div className="col-span-full text-center py-12">
                        <FileImage className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Health Records</h3>
                        <p className="text-muted-foreground mb-6">
                          Upload lab reports, X-rays, and other medical documents for this patient.
                        </p>
                        <Button>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload First Record
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
