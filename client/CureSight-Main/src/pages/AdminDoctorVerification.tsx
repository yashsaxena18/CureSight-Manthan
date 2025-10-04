import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Search, Eye, CheckCircle, XCircle, 
  Clock, Filter, RefreshCw, AlertTriangle,
  FileText, Stethoscope, Building, Calendar,
  GraduationCap, Phone, MapPin
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
  medicalLicenseNumber: string;
  phoneNumber: string;
  city?: string;
  state?: string;
  verificationStatus: 'pending' | 'in_review' | 'verified' | 'rejected';
  isVerified: boolean;
  createdAt: string;
  bio?: string;
}

const API_BASE = 'http://localhost:5000/api';

export default function AdminDoctorVerification() {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<PendingDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDoctors, setTotalDoctors] = useState(0);

  useEffect(() => {
    fetchDoctors();
  }, [currentPage, statusFilter]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`${API_BASE}/admin/doctors/pending?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors);
        setTotalPages(data.pagination.pages);
        setTotalDoctors(data.pagination.total);
      } else {
        throw new Error('Failed to fetch doctors');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending doctors. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
          notes: 'Quick approval by admin'
        })
      });

      if (response.ok) {
        toast({
          title: "Doctor Approved! ✅",
          description: `Dr. ${doctorName} has been successfully verified and approved.`
        });
        fetchDoctors();
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
          notes: 'Quick rejection by admin'
        })
      });

      if (response.ok) {
        toast({
          title: "Doctor Rejected",
          description: `Dr. ${doctorName} has been rejected. Reason: ${reason}`
        });
        fetchDoctors();
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

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Users className="h-8 w-8 text-blue-600" />
            <span>Doctor Verification</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve doctor applications - {totalDoctors} total
          </p>
        </div>
        
        <Button onClick={fetchDoctors} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, hospital, or specialization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={fetchDoctors}>
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Doctors List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : doctors.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {doctors.map((doctor) => (
              <Card key={doctor._id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-green-500/20">
                        <Stethoscope className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </CardTitle>
                        <CardDescription>{doctor.specialization}</CardDescription>
                      </div>
                    </div>
                    
                    <Badge className={getStatusColor(doctor.verificationStatus)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(doctor.verificationStatus)}
                        <span className="capitalize">{doctor.verificationStatus}</span>
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <Building className="h-4 w-4 mr-2" />
                        {doctor.hospitalAffiliation}
                      </div>
                      
                      <div className="flex items-center text-muted-foreground">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        {doctor.yearsOfExperience} years exp.
                      </div>
                      
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="h-4 w-4 mr-2" />
                        {doctor.phoneNumber}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <FileText className="h-4 w-4 mr-2" />
                        License: {doctor.medicalLicenseNumber}
                      </div>
                      
                      {(doctor.city || doctor.state) && (
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          {doctor.city}{doctor.city && doctor.state && ', '}{doctor.state}
                        </div>
                      )}
                      
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        Applied: {new Date(doctor.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="font-medium">Email:</span>
                    <span className="ml-2">{doctor.email}</span>
                  </div>

                  {doctor.bio && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        <span className="font-medium">Bio:</span> {doctor.bio}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <Link to={`/admin/doctors/${doctor._id}/review`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Review Details
                      </Link>
                    </Button>
                    
                    {doctor.verificationStatus === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => quickApprove(doctor._id, `${doctor.firstName} ${doctor.lastName}`)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Quick Approve
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
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = i + Math.max(1, currentPage - 2);
                  if (page > totalPages) return null;
                  
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button 
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Doctors Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || statusFilter !== 'all'
                ? "No doctors match your search criteria. Try adjusting your filters."
                : "No pending doctor applications at the moment. All caught up!"
              }
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <Button onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                fetchDoctors();
              }}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
