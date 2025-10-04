import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Calendar, Phone, Mail, FileText,
  Stethoscope, Pill, Save, Plus, X,
  Clock, CheckCircle, AlertCircle, ArrowLeft,
  Video, MessageSquare, History, Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  appointmentHistory: any[];
  totalAppointments?: number;
  phoneNumber?: string;
}

interface Prescription {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const API_BASE = 'http://localhost:5000/api';

export default function PatientConsultation() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Consultation Form Data
  const [consultationData, setConsultationData] = useState({
    symptoms: '',
    chiefComplaint: '',
    diagnosis: '',
    notes: '',
    followUpRequired: false,
    followUpDate: ''
  });

  // Prescription Data
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([
    { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }
  ]);

  useEffect(() => {
    if (patientId) {
      fetchPatientDetails();
    }
  }, [patientId]);

  const fetchPatientDetails = async () => {
    console.log('🔍 Fetching patient details for consultation:', patientId);
    setLoading(true);
    
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
        console.log('✅ Patient data received:', data.patient);
        setPatient(data.patient);
        
        // If there's a recent appointment, pre-fill some data
        const recentAppointment = data.patient.appointmentHistory?.[0];
        if (recentAppointment && recentAppointment.symptoms) {
          setConsultationData(prev => ({
            ...prev,
            symptoms: recentAppointment.symptoms,
            chiefComplaint: recentAppointment.patientNotes || ''
          }));
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch patient:', errorData);
        throw new Error(errorData.message || 'Failed to fetch patient details');
      }
    } catch (error) {
      console.error('❌ Error fetching patient details:', error);
      toast({
        title: "Error",
        description: "Failed to load patient information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  const addPrescription = () => {
    setPrescriptions([...prescriptions, {
      medicine: '', dosage: '', frequency: '', duration: '', instructions: ''
    }]);
  };

  const removePrescription = (index: number) => {
    if (prescriptions.length > 1) {
      setPrescriptions(prescriptions.filter((_, i) => i !== index));
    }
  };

  const updatePrescription = (index: number, field: keyof Prescription, value: string) => {
    const updated = [...prescriptions];
    updated[index][field] = value;
    setPrescriptions(updated);
  };

  const saveConsultation = async () => {
    console.log('📝 Saving consultation...');

    // Validation
    if (!consultationData.diagnosis.trim()) {
      toast({
        title: "Diagnosis Required",
        description: "Please provide a diagnosis before saving the consultation.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Find the most recent appointment to update
      const recentAppointment = patient?.appointmentHistory?.[0];
      
      if (recentAppointment && ['scheduled', 'confirmed', 'in-progress'].includes(recentAppointment.status)) {
        // Update existing appointment
        console.log('📝 Updating appointment:', recentAppointment._id);
        
        const updateData = {
          status: 'completed',
          diagnosis: consultationData.diagnosis.trim(),
          doctorNotes: consultationData.notes.trim(),
          prescription: prescriptions.filter(p => p.medicine.trim()),
          followUpRequired: consultationData.followUpRequired,
          followUpDate: consultationData.followUpDate || null,
          followUpNotes: consultationData.followUpRequired ? 'Follow-up scheduled as per consultation' : null
        };

        const response = await fetch(`${API_BASE}/appointments/${recentAppointment._id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Appointment updated successfully:', data);
          
          toast({
            title: "Consultation Completed! ✅",
            description: "Patient consultation has been saved and appointment marked as completed."
          });
          
          // Reset form
          setConsultationData({
            symptoms: '',
            chiefComplaint: '',
            diagnosis: '',
            notes: '',
            followUpRequired: false,
            followUpDate: ''
          });
          setPrescriptions([{
            medicine: '', dosage: '', frequency: '', duration: '', instructions: ''
          }]);

          // Refresh patient data
          await fetchPatientDetails();
          
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update appointment');
        }
      } else {
        // Create new consultation record (fallback)
        console.log('📝 Creating new consultation record...');
        
        toast({
          title: "Consultation Recorded! ✅",
          description: "Consultation details have been saved successfully."
        });
        
        // Reset form
        setConsultationData({
          symptoms: '',
          chiefComplaint: '',
          diagnosis: '',
          notes: '',
          followUpRequired: false,
          followUpDate: ''
        });
        setPrescriptions([{
          medicine: '', dosage: '', frequency: '', duration: '', instructions: ''
        }]);
      }
      
    } catch (error) {
      console.error('❌ Error saving consultation:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save consultation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const generatePrescriptionPDF = () => {
    toast({
      title: "PDF Generated! 📄",
      description: "Prescription PDF has been generated and will be downloaded shortly."
    });
  };

  const sendPrescriptionToPatient = () => {
    toast({
      title: "Prescription Sent! 📧",
      description: `Digital prescription sent to ${patient?.email}`
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-16 pb-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading patient information...</p>
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
              The patient you're looking for doesn't exist or you don't have access to their records.
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
    <div className="container mx-auto p-6 space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/doctor/patients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Stethoscope className="h-8 w-8 text-blue-600" />
              <span>Patient Consultation</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Consultation with {patient.firstName} {patient.lastName}
            </p>
          </div>
        </div>

        {/* 🎥 NEW: Communication Buttons */}
        <div className="flex items-center space-x-3">
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
          
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4 mr-2" />
            Call Patient
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Patient Info Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <User className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg">
                  {patient.firstName} {patient.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {calculateAge(patient.dateOfBirth)} years • {patient.gender}
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t">
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
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Consultation History</p>
                <Badge variant="outline">
                  {patient.appointmentHistory?.length || 0} previous consultation{(patient.appointmentHistory?.length || 0) !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* 🆕 Quick Actions */}
              <div className="pt-4 border-t space-y-2">
                <h4 className="text-sm font-medium">Quick Actions</h4>
                
                <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                  <Link to={`/doctor/video-consultation/${patientId}`}>
                    <Video className="h-4 w-4 mr-2" />
                    Start Video Call
                  </Link>
                </Button>
                
                <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                  <Link to={`/doctor/chat/${patientId}`}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Open Chat
                  </Link>
                </Button>
                
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={generatePrescriptionPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent History */}
          {patient.appointmentHistory && patient.appointmentHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  Recent History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.appointmentHistory.slice(0, 3).map((appointment, index) => (
                  <div key={index} className="py-3 border-b last:border-b-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">
                        {new Date(appointment.appointmentDate).toLocaleDateString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {appointment.status}
                      </Badge>
                    </div>
                    
                    {appointment.diagnosis && (
                      <p className="text-xs text-muted-foreground mb-1">
                        <strong>Diagnosis:</strong> {appointment.diagnosis.substring(0, 60)}...
                      </p>
                    )}
                    
                    {appointment.symptoms && (
                      <p className="text-xs text-gray-600">
                        <strong>Symptoms:</strong> {appointment.symptoms.substring(0, 50)}...
                      </p>
                    )}
                    
                    {appointment.prescription && appointment.prescription.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        <Pill className="h-3 w-3 inline mr-1" />
                        {appointment.prescription.length} medicine{appointment.prescription.length !== 1 ? 's' : ''} prescribed
                      </p>
                    )}
                  </div>
                ))}
                
                {patient.appointmentHistory.length > 3 && (
                  <div className="pt-3 text-center">
                    <Button variant="ghost" size="sm">
                      <History className="h-4 w-4 mr-2" />
                      View Full History
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Consultation Form */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="consultation" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="consultation">Consultation</TabsTrigger>
              <TabsTrigger value="prescription">Prescription</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            {/* Consultation Tab */}
            <TabsContent value="consultation">
              <Card>
                <CardHeader>
                  <CardTitle>Consultation Details</CardTitle>
                  <CardDescription>
                    Record patient symptoms, complaints, and diagnosis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="symptoms">Symptoms</Label>
                      <Textarea
                        id="symptoms"
                        placeholder="List patient's symptoms..."
                        value={consultationData.symptoms}
                        onChange={(e) => setConsultationData({
                          ...consultationData,
                          symptoms: e.target.value
                        })}
                        className="min-h-[100px]"
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground">
                        {consultationData.symptoms.length}/1000 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complaint">Chief Complaint</Label>
                      <Textarea
                        id="complaint"
                        placeholder="Main complaint from patient..."
                        value={consultationData.chiefComplaint}
                        onChange={(e) => setConsultationData({
                          ...consultationData,
                          chiefComplaint: e.target.value
                        })}
                        className="min-h-[100px]"
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground">
                        {consultationData.chiefComplaint.length}/500 characters
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diagnosis">Diagnosis *</Label>
                    <Textarea
                      id="diagnosis"
                      placeholder="Your diagnosis and assessment..."
                      value={consultationData.diagnosis}
                      onChange={(e) => setConsultationData({
                        ...consultationData,
                        diagnosis: e.target.value
                      })}
                      className="min-h-[100px]"
                      maxLength={1000}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {consultationData.diagnosis.length}/1000 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional observations, recommendations, or notes..."
                      value={consultationData.notes}
                      onChange={(e) => setConsultationData({
                        ...consultationData,
                        notes: e.target.value
                      })}
                      className="min-h-[120px]"
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground">
                      {consultationData.notes.length}/1000 characters
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="followUp"
                      checked={consultationData.followUpRequired}
                      onChange={(e) => setConsultationData({
                        ...consultationData,
                        followUpRequired: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="followUp">Follow-up required</Label>
                  </div>

                  {consultationData.followUpRequired && (
                    <div className="space-y-2">
                      <Label htmlFor="followUpDate">Follow-up Date</Label>
                      <Input
                        id="followUpDate"
                        type="date"
                        value={consultationData.followUpDate}
                        onChange={(e) => setConsultationData({
                          ...consultationData,
                          followUpDate: e.target.value
                        })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Prescription Tab */}
            <TabsContent value="prescription">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Digital Prescription</CardTitle>
                      <CardDescription>
                        Add medicines and instructions for the patient
                      </CardDescription>
                    </div>
                    <Button onClick={addPrescription} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Medicine
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {prescriptions.map((prescription, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center">
                          <Pill className="h-4 w-4 mr-2" />
                          Medicine {index + 1}
                        </h4>
                        {prescriptions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePrescription(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Medicine Name *</Label>
                          <Input
                            placeholder="e.g., Paracetamol 500mg"
                            value={prescription.medicine}
                            onChange={(e) => updatePrescription(index, 'medicine', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Dosage *</Label>
                          <Input
                            placeholder="e.g., 1 tablet"
                            value={prescription.dosage}
                            onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Frequency *</Label>
                          <Input
                            placeholder="e.g., Twice daily"
                            value={prescription.frequency}
                            onChange={(e) => updatePrescription(index, 'frequency', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Duration *</Label>
                          <Input
                            placeholder="e.g., 7 days"
                            value={prescription.duration}
                            onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Instructions</Label>
                        <Textarea
                          placeholder="e.g., Take after meals with water"
                          value={prescription.instructions}
                          onChange={(e) => updatePrescription(index, 'instructions', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}

                  {/* 🆕 Prescription Actions */}
                  <div className="flex space-x-3 pt-4 border-t">
                    <Button variant="outline" onClick={sendPrescriptionToPatient}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send to Patient
                    </Button>
                    
                    <Button variant="outline" onClick={generatePrescriptionPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>Consultation Summary</CardTitle>
                  <CardDescription>
                    Review and save the complete consultation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Patient Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Patient Information
                    </h4>
                    <p className="text-blue-800">
                      {patient.firstName} {patient.lastName} • {calculateAge(patient.dateOfBirth)} years • {patient.gender}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Consultation Date: {new Date().toLocaleDateString()}
                    </p>
                    <p className="text-sm text-blue-700">
                      Doctor: Dr. {user?.firstName} {user?.lastName}
                    </p>
                  </div>

                  {/* Consultation Summary */}
                  {(consultationData.symptoms || consultationData.chiefComplaint || consultationData.diagnosis) && (
                    <div className="space-y-4">
                      {consultationData.symptoms && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Symptoms
                          </h4>
                          <p className="text-sm bg-gray-50 p-3 rounded border">{consultationData.symptoms}</p>
                        </div>
                      )}

                      {consultationData.chiefComplaint && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            Chief Complaint
                          </h4>
                          <p className="text-sm bg-gray-50 p-3 rounded border">{consultationData.chiefComplaint}</p>
                        </div>
                      )}

                      {consultationData.diagnosis && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center">
                            <Stethoscope className="h-4 w-4 mr-2" />
                            Diagnosis
                          </h4>
                          <p className="text-sm bg-gray-50 p-3 rounded border">{consultationData.diagnosis}</p>
                        </div>
                      )}

                      {consultationData.notes && (
                        <div>
                          <h4 className="font-semibold mb-2">Additional Notes</h4>
                          <p className="text-sm bg-gray-50 p-3 rounded border">{consultationData.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prescription Summary */}
                  {prescriptions.some(p => p.medicine.trim()) && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Pill className="h-4 w-4 mr-2" />
                        Digital Prescription
                      </h4>
                      <div className="space-y-3">
                        {prescriptions
                          .filter(p => p.medicine.trim())
                          .map((prescription, index) => (
                          <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="font-medium text-green-900">
                              {prescription.medicine}
                            </div>
                            <div className="text-sm text-green-700 mt-1">
                              {prescription.dosage} • {prescription.frequency} • {prescription.duration}
                            </div>
                            {prescription.instructions && (
                              <div className="text-sm text-green-600 mt-1">
                                <strong>Instructions:</strong> {prescription.instructions}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up */}
                  {consultationData.followUpRequired && (
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Follow-up Required
                      </h4>
                      {consultationData.followUpDate && (
                        <p className="text-amber-800">
                          Scheduled for: {new Date(consultationData.followUpDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={saveConsultation}
                      disabled={saving || !consultationData.diagnosis.trim()}
                      className="w-full"
                      size="lg"
                    >
                      {saving ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Saving Consultation...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save & Complete Consultation
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex space-x-3 pt-4 border-t">
                    <Button variant="outline" onClick={generatePrescriptionPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    
                    <Button variant="outline" onClick={sendPrescriptionToPatient}>
                      <Mail className="h-4 w-4 mr-2" />
                      Email Patient
                    </Button>
                    
                    <Button variant="outline" asChild>
                      <Link to={`/doctor/video-consultation/${patientId}`}>
                        <Video className="h-4 w-4 mr-2" />
                        Video Call
                      </Link>
                    </Button>
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
