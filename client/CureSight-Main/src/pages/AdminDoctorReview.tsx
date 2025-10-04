import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, CheckCircle, XCircle, FileText, 
  Stethoscope, Building, GraduationCap, Phone,
  Mail, MapPin, Calendar, User, Clock,
  AlertTriangle, RefreshCw, Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DoctorDetail {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  specialization: string;
  medicalLicenseNumber: string;
  yearsOfExperience: number;
  hospitalAffiliation: string;
  city?: string;
  state?: string;
  bio?: string;
  consultationFee?: number;
  languages?: string[];
  availableDays?: string[];
  verificationStatus: string;
  isVerified: boolean;
  verificationNotes?: string;
  createdAt: string;
  agreements?: {
    termsAccepted?: {
      accepted: boolean;
      acceptedAt: string;
    };
    privacyAccepted?: {
      accepted: boolean;
      acceptedAt: string;
    };
  };
}

const API_BASE = 'http://localhost:5000/api';

const documentTypes = [
  'Medical Degree Certificate',
  'Medical License Document',
  'Hospital Affiliation Letter',
  'Identity Proof',
  'Address Proof',
  'Recent Photograph'
];

export default function AdminDoctorReview() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form states
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [requestedDocuments, setRequestedDocuments] = useState<string[]>([]);
  const [documentRequestMessage, setDocumentRequestMessage] = useState('');

  useEffect(() => {
    fetchDoctorDetails();
  }, [doctorId]);

  const fetchDoctorDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/doctors/${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDoctor(data.doctor);
        setApprovalNotes(data.doctor.verificationNotes || '');
      } else {
        throw new Error('Failed to fetch doctor details');
      }
    } catch (error) {
      console.error('Error fetching doctor:', error);
      toast({
        title: "Error",
        description: "Failed to fetch doctor details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const approveDoctor = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/doctors/${doctorId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: approvalNotes || 'Approved after thorough review'
        })
      });

      if (response.ok) {
        toast({
          title: "Doctor Approved! ✅",
          description: `Dr. ${doctor?.firstName} ${doctor?.lastName} has been successfully verified and approved.`
        });
        navigate('/admin/doctors/verification');
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
    } finally {
      setActionLoading(false);
    }
  };

  const rejectDoctor = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/doctors/${doctorId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: rejectionReason,
          notes: rejectionNotes
        })
      });

      if (response.ok) {
        toast({
          title: "Doctor Rejected",
          description: `Dr. ${doctor?.firstName} ${doctor?.lastName} has been rejected.`
        });
        navigate('/admin/doctors/verification');
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
    } finally {
      setActionLoading(false);
    }
  };

  const requestDocuments = async () => {
    if (requestedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to request.",
        variant: "destructive"
      });
      return;
    }

    if (!documentRequestMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please provide a message explaining the document request.",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/doctors/${doctorId}/request-documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentTypes: requestedDocuments,
          message: documentRequestMessage
        })
      });

      if (response.ok) {
        toast({
          title: "Documents Requested",
          description: `Document request sent to Dr. ${doctor?.firstName} ${doctor?.lastName}.`
        });
        fetchDoctorDetails();
      } else {
        throw new Error('Document request failed');
      }
    } catch (error) {
      console.error('Error requesting documents:', error);
      toast({
        title: "Request Failed",
        description: "Failed to request documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-16 pb-16 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading doctor details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-16 pb-16 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p>Doctor not found</p>
            <Button onClick={() => navigate('/admin/doctors/verification')} className="mt-4">
              Back to Verification List
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/doctors/verification')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold">
              Doctor Verification Review
            </h1>
            <p className="text-muted-foreground">
              Review application for Dr. {doctor.firstName} {doctor.lastName}
            </p>
          </div>
        </div>
        
        <Badge className={getStatusColor(doctor.verificationStatus)}>
          <span className="capitalize">{doctor.verificationStatus}</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Doctor Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-green-500/20">
                  <Stethoscope className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    Dr. {doctor.firstName} {doctor.lastName}
                  </CardTitle>
                  <CardDescription>{doctor.specialization}</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{doctor.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{doctor.phoneNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Experience</p>
                      <p className="text-sm text-muted-foreground">{doctor.yearsOfExperience} years</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">License Number</p>
                      <p className="text-sm text-muted-foreground">{doctor.medicalLicenseNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Hospital</p>
                      <p className="text-sm text-muted-foreground">{doctor.hospitalAffiliation}</p>
                    </div>
                  </div>
                  
                  {(doctor.city || doctor.state) && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">
                          {doctor.city}{doctor.city && doctor.state && ', '}{doctor.state}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Application Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(doctor.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {doctor.bio && (
                <div>
                  <p className="font-medium mb-2">Professional Bio</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{doctor.bio}</p>
                  </div>
                </div>
              )}

              {doctor.languages && doctor.languages.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Languages</p>
                  <div className="flex flex-wrap gap-2">
                    {doctor.languages.map((language) => (
                      <Badge key={language} variant="outline">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {doctor.availableDays && doctor.availableDays.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Available Days</p>
                  <div className="flex flex-wrap gap-2">
                    {doctor.availableDays.map((day) => (
                      <Badge key={day} variant="outline">
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {doctor.consultationFee && (
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Consultation Fee</p>
                    <p className="text-sm text-muted-foreground">₹{doctor.consultationFee}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agreements */}
          {doctor.agreements && (
            <Card>
              <CardHeader>
                <CardTitle>Legal Agreements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctor.agreements.termsAccepted && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Terms of Service</p>
                        <p className="text-sm text-muted-foreground">
                          Accepted on {new Date(doctor.agreements.termsAccepted.acceptedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {doctor.agreements.privacyAccepted && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Privacy Policy</p>
                        <p className="text-sm text-muted-foreground">
                          Accepted on {new Date(doctor.agreements.privacyAccepted.acceptedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Badge className={getStatusColor(doctor.verificationStatus)} variant="outline">
                  <span className="capitalize">{doctor.verificationStatus}</span>
                </Badge>
                
                {doctor.verificationNotes && (
                  <div>
                    <p className="font-medium mb-2">Previous Notes</p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">{doctor.verificationNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Approval Section */}
          {doctor.verificationStatus !== 'verified' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Approve Doctor</CardTitle>
                <CardDescription>
                  Approve this doctor for platform access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="approvalNotes">Approval Notes (Optional)</Label>
                  <Textarea
                    id="approvalNotes"
                    placeholder="Add any notes about the approval..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={approveDoctor}
                  disabled={actionLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Doctor
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Rejection Section */}
          {doctor.verificationStatus !== 'rejected' && doctor.verificationStatus !== 'verified' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Reject Application</CardTitle>
                <CardDescription>
                  Reject this doctor application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Enter the reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rejectionNotes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="rejectionNotes"
                    placeholder="Add any additional notes..."
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                
                <Button 
                  onClick={rejectDoctor}
                  disabled={actionLoading || !rejectionReason.trim()}
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject Application
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Request Documents Section */}
          {doctor.verificationStatus === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Request Documents</CardTitle>
                <CardDescription>
                  Request additional documents from doctor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Required Documents</Label>
                  <div className="space-y-2">
                    {documentTypes.map((docType) => (
                      <div key={docType} className="flex items-center space-x-2">
                        <Checkbox
                          id={docType}
                          checked={requestedDocuments.includes(docType)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setRequestedDocuments([...requestedDocuments, docType]);
                            } else {
                              setRequestedDocuments(requestedDocuments.filter(d => d !== docType));
                            }
                          }}
                        />
                        <Label htmlFor={docType} className="text-sm cursor-pointer">
                          {docType}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="documentMessage">Message to Doctor *</Label>
                  <Textarea
                    id="documentMessage"
                    placeholder="Explain what documents are needed and why..."
                    value={documentRequestMessage}
                    onChange={(e) => setDocumentRequestMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={requestDocuments}
                  disabled={actionLoading || requestedDocuments.length === 0 || !documentRequestMessage.trim()}
                  variant="outline"
                  className="w-full"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Request Documents
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
