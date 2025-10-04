import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Save, ArrowLeft, Plus, Trash2, Calendar, Clock,
  Stethoscope, Pill, FileText, User, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = 'http://localhost:5000/api';

interface Medicine {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function NewConsultation() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Form states
  const [formData, setFormData] = useState({
    symptoms: '',
    diagnosis: '',
    doctorNotes: '',
    followUpRequired: false,
    followUpDate: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: new Date().toTimeString().slice(0, 5)
  });

  const [prescription, setPrescription] = useState<Medicine[]>([
    { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }
  ]);

  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addMedicine = () => {
    setPrescription(prev => [...prev, 
      { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }
    ]);
  };

  const removeMedicine = (index: number) => {
    if (prescription.length > 1) {
      setPrescription(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateMedicine = (index: number, field: string, value: string) => {
    setPrescription(prev => prev.map((med, i) => 
      i === index ? { ...med, [field]: value } : med
    ));
  };

  const saveConsultation = async () => {
    if (!formData.symptoms.trim()) {
      toast({
        title: "Validation Error",
        description: "Symptoms are required",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('authToken');
      
      // Filter out empty medicines
      const validPrescription = prescription.filter(med => med.medicine.trim());

      const consultationData = {
        patientId,
        ...formData,
        prescription: validPrescription,
        followUpDate: formData.followUpRequired && formData.followUpDate 
          ? formData.followUpDate 
          : null
      };

      console.log('💾 Saving consultation:', consultationData);

      const response = await fetch(`${API_BASE}/consultation/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(consultationData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Consultation saved:', data);

        toast({
          title: "Consultation Saved! ✅",
          description: "Patient consultation record has been saved successfully."
        });

        // Redirect to patient detail page
        navigate(`/doctor/patient-detail/${patientId}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save consultation');
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

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate(`/doctor/patient-detail/${patientId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Stethoscope className="h-8 w-8 text-blue-600" />
              <span>New Consultation</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Record patient consultation details
            </p>
          </div>
        </div>

        <Button onClick={saveConsultation} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Consultation'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Consultation Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Consultation Details</CardTitle>
              <CardDescription>Record the patient consultation information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Date
                  </label>
                  <Input
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Time
                  </label>
                  <Input
                    type="time"
                    value={formData.appointmentTime}
                    onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Symptoms / Chief Complaints *
                </label>
                <Textarea
                  placeholder="Describe patient's symptoms and complaints..."
                  value={formData.symptoms}
                  onChange={(e) => handleInputChange('symptoms', e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Diagnosis
                </label>
                <Textarea
                  placeholder="Medical diagnosis and findings..."
                  value={formData.diagnosis}
                  onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  <User className="h-4 w-4 inline mr-1" />
                  Doctor's Notes
                </label>
                <Textarea
                  placeholder="Additional notes and observations..."
                  value={formData.doctorNotes}
                  onChange={(e) => handleInputChange('doctorNotes', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Prescription */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Pill className="h-5 w-5 mr-2" />
                    Prescription
                  </CardTitle>
                  <CardDescription>Add medicines and instructions</CardDescription>
                </div>
                <Button onClick={addMedicine} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medicine
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prescription.map((medicine, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Medicine #{index + 1}</h4>
                      {prescription.length > 1 && (
                        <Button
                          onClick={() => removeMedicine(index)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Medicine name"
                        value={medicine.medicine}
                        onChange={(e) => updateMedicine(index, 'medicine', e.target.value)}
                      />
                      <Input
                        placeholder="Dosage (e.g., 500mg)"
                        value={medicine.dosage}
                        onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                      />
                      <Input
                        placeholder="Frequency (e.g., Twice daily)"
                        value={medicine.frequency}
                        onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                      />
                      <Input
                        placeholder="Duration (e.g., 7 days)"
                        value={medicine.duration}
                        onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                      />
                    </div>

                    <Input
                      placeholder="Instructions (e.g., Take after meals)"
                      value={medicine.instructions}
                      onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Follow-up */}
          <Card>
            <CardHeader>
              <CardTitle>Follow-up Required?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="followUp"
                  checked={formData.followUpRequired}
                  onChange={(e) => handleInputChange('followUpRequired', e.target.checked)}
                />
                <label htmlFor="followUp" className="text-sm font-medium">
                  Patient needs follow-up appointment
                </label>
              </div>

              {formData.followUpRequired && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Follow-up Date</label>
                  <Input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={saveConsultation} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Consultation'}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/doctor/patient-detail/${patientId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Symptoms field is required</p>
              <p>• Add diagnosis for better record keeping</p>
              <p>• Include detailed prescription instructions</p>
              <p>• Set follow-up if needed</p>
              <p>• All data is saved securely</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
