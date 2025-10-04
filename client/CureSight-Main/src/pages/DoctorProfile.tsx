import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Star, MapPin, Clock, Calendar,
  GraduationCap, Building, Phone, Mail,
  Stethoscope, Award, Heart, CheckCircle,
  Languages, DollarSign, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  hospitalAffiliation: string;
  yearsOfExperience: number;
  consultationFee?: number;
  city?: string;
  state?: string;
  bio?: string;
  languages?: string[];
  availableDays?: string[];
  rating?: {
    average: number;
    count: number;
  };
  isVerified: boolean;
  phoneNumber?: string;
  email?: string;
}

const API_BASE = 'http://localhost:5000/api';

export default function DoctorProfile() {
  const { doctorId } = useParams();
  const { toast } = useToast();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchDoctorProfile();
  }, [doctorId]);

  const fetchDoctorProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/doctor-profile/${doctorId}`);
      
      if (response.ok) {
        const data = await response.json();
        setDoctor(data.doctor);
      } else {
        throw new Error('Doctor not found');
      }
    } catch (error) {
      console.error('Error fetching doctor:', error);
      toast({
        title: "Error",
        description: "Failed to load doctor profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (date: string) => {
    if (!date || !doctorId) return;
    
    try {
      const response = await fetch(`${API_BASE}/appointments/doctor/${doctorId}/slots?date=${date}`);
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, doctorId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-16 pb-16 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading doctor profile...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-16 pb-16 text-center">
              <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Doctor Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The doctor profile you're looking for is not available.
              </p>
              <Button asChild>
                <Link to="/find-doctors">Browse Other Doctors</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getNextAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
      
      if (doctor.availableDays?.includes(dayName)) {
        dates.push({
          date: date.toISOString().split('T')[0],
          display: date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })
        });
      }
    }
    
    return dates;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button variant="outline" asChild>
        <Link to="/find-doctors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Link>
      </Button>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Profile */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start space-x-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-green-500/20">
                  <Stethoscope className="h-12 w-12 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl mb-2">
                        Dr. {doctor.firstName} {doctor.lastName}
                      </CardTitle>
                      <CardDescription className="text-lg font-medium text-blue-600 mb-3">
                        {doctor.specialization}
                      </CardDescription>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-1" />
                          {doctor.hospitalAffiliation}
                        </div>
                        <div className="flex items-center">
                          <GraduationCap className="h-4 w-4 mr-1" />
                          {doctor.yearsOfExperience} years exp.
                        </div>
                        {doctor.rating && (
                          <div className="flex items-center text-yellow-600">
                            <Star className="h-4 w-4 mr-1 fill-current" />
                            <span className="font-medium">{doctor.rating.average}</span>
                            <span className="text-muted-foreground ml-1">
                              ({doctor.rating.count} reviews)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified Doctor
                      </Badge>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ₹{doctor.consultationFee || 500}
                        </div>
                        <div className="text-xs text-muted-foreground">consultation fee</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Tabs Content */}
          <Tabs defaultValue="about" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About Dr. {doctor.firstName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {doctor.bio ? (
                    <p className="text-muted-foreground leading-relaxed">
                      {doctor.bio}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No biography available for this doctor.
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                    <div className="space-y-4">
                      <h4 className="font-medium">Professional Details</h4>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center">
                          <Stethoscope className="h-4 w-4 mr-3 text-blue-600" />
                          <span className="text-muted-foreground mr-2">Specialization:</span>
                          <span className="font-medium">{doctor.specialization}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-3 text-green-600" />
                          <span className="text-muted-foreground mr-2">Hospital:</span>
                          <span className="font-medium">{doctor.hospitalAffiliation}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <GraduationCap className="h-4 w-4 mr-3 text-purple-600" />
                          <span className="text-muted-foreground mr-2">Experience:</span>
                          <span className="font-medium">{doctor.yearsOfExperience} years</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Contact & Location</h4>
                      
                      <div className="space-y-3 text-sm">
                        {(doctor.city || doctor.state) && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-3 text-red-600" />
                            <span className="text-muted-foreground mr-2">Location:</span>
                            <span className="font-medium">
                              {doctor.city}{doctor.city && doctor.state && ', '}{doctor.state}
                            </span>
                          </div>
                        )}
                        
                        {doctor.languages && doctor.languages.length > 0 && (
                          <div className="flex items-start">
                            <Languages className="h-4 w-4 mr-3 mt-0.5 text-orange-600" />
                            <span className="text-muted-foreground mr-2">Languages:</span>
                            <div className="flex flex-wrap gap-1">
                              {doctor.languages.map((language) => (
                                <Badge key={language} variant="secondary" className="text-xs">
                                  {language}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-3 text-green-600" />
                          <span className="text-muted-foreground mr-2">Consultation Fee:</span>
                          <span className="font-medium text-green-600">₹{doctor.consultationFee || 500}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="experience" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Experience</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Award className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Total Experience</h4>
                        <p className="text-2xl font-bold text-blue-600">{doctor.yearsOfExperience} Years</p>
                        <p className="text-sm text-muted-foreground">in {doctor.specialization}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Current Position</h4>
                        <p className="text-sm text-muted-foreground">
                          {doctor.specialization} at {doctor.hospitalAffiliation}
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Verification Status</h4>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified Professional
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  {doctor.rating ? (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4 p-4 bg-yellow-50 rounded-lg">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-yellow-600">{doctor.rating.average}</div>
                          <div className="flex items-center justify-center mb-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${
                                  i < Math.floor(doctor.rating!.average) 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                }`} 
                              />
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {doctor.rating.count} reviews
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">Overall Rating</h4>
                          <p className="text-sm text-muted-foreground">
                            Based on {doctor.rating.count} patient reviews and consultations.
                          </p>
                        </div>
                      </div>

                      <div className="text-center py-8 text-muted-foreground">
                        <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p>Individual reviews will be displayed here</p>
                        <p className="text-sm">Feature coming soon</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p>No reviews available yet</p>
                      <p className="text-sm">Be the first to review this doctor</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Booking */}
        <div className="space-y-6">
          {/* Quick Booking Card */}
          <Card>
            <CardHeader>
              <CardTitle>Book Appointment</CardTitle>
              <CardDescription>
                Schedule your consultation with Dr. {doctor.firstName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  ₹{doctor.consultationFee || 500}
                </div>
                <div className="text-sm text-muted-foreground">Consultation Fee</div>
              </div>

              <Button className="w-full" size="lg" asChild>
                <Link to={`/book-appointment/${doctor._id}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </Link>
              </Button>

              <div className="text-center">
                <div className="text-sm text-muted-foreground">
                  Available for consultations
                </div>
                {doctor.availableDays && doctor.availableDays.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {doctor.availableDays.map((day) => (
                      <Badge key={day} variant="outline" className="text-xs capitalize">
                        {day}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Experience</span>
                <span className="font-medium">{doctor.yearsOfExperience} years</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Consultation</span>
                <span className="font-medium">₹{doctor.consultationFee || 500}</span>
              </div>
              
              {doctor.rating && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                    <span className="font-medium">{doctor.rating.average}</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Available
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
