import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Search, MapPin, Star, Calendar, 
  Filter, Clock, GraduationCap, Building, 
  Phone, Mail, Stethoscope, ChevronRight,
  Heart, Award, DollarSign, RefreshCw,
  Navigation, Shield, Verified
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

// Google Maps Integration
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

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
  rating?: {
    average: number;
    count: number;
  };
  bio?: string;
  languages?: string[];
  availableDays?: string[];
  isVerified: boolean;
  // New Google Maps fields
  location?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  distance?: number;
  isOnline?: boolean;
}

const API_BASE = 'http://localhost:5000/api';
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

const specializations = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Neurology', 'Orthopedics',
  'Pediatrics', 'Psychiatry', 'Gynecology', 'ENT', 'Ophthalmology',
  'Urology', 'Oncology'
];

const cities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 
  'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam'
];

export default function FindDoctors() {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDoctors, setTotalDoctors] = useState(0);
  
  // New states for Maps & Location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [mapLoaded, setMapLoaded] = useState(false);

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    fetchDoctors();
    loadGoogleMaps();
    getUserLocation();
  }, [currentPage, selectedSpecialization, selectedCity, sortBy]);

  useEffect(() => {
    if (mapLoaded && doctors.length > 0) {
      addDoctorMarkers();
    }
  }, [mapLoaded, doctors, showVerifiedOnly]);

  // Load Google Maps
  const loadGoogleMaps = () => {
    if (window.google) {
      initializeMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initMap`;
    script.async = true;
    script.defer = true;

    window.initMap = initializeMap;
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current) return;

    const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India center
    
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 5,
      center: userLocation || defaultCenter,
      styles: [
        {
          featureType: 'poi.medical',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });

    setMapLoaded(true);
    addDoctorMarkers();
  };

  const addDoctorMarkers = () => {
    if (!mapInstanceRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const doctorsToShow = showVerifiedOnly ? doctors.filter(d => d.isVerified) : doctors;

    doctorsToShow.forEach(doctor => {
      // Use city-based coordinates if specific coordinates not available
      const coordinates = doctor.location?.coordinates || getCityCoordinates(doctor.city || 'Delhi');
      
      const marker = new window.google.maps.Marker({
        position: coordinates,
        map: mapInstanceRef.current,
        title: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        icon: {
          url: doctor.isVerified ? 
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNSIgcj0iMTUiIGZpbGw9IiMxMEI5ODEiLz4KPC9zdmc+' :
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNSIgcj0iMTUiIGZpbGw9IiNGNTk5NTkiLz4KPC9zdmc+',
          scaledSize: new window.google.maps.Size(30, 30)
        }
      });

      // Info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; max-width: 280px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <h3 style="margin: 0; color: #1f2937; font-size: 16px;">Dr. ${doctor.firstName} ${doctor.lastName}</h3>
              ${doctor.isVerified ? '<span style="margin-left: 8px; background: #10b981; color: white; padding: 2px 6px; border-radius: 12px; font-size: 10px;">✓ Verified</span>' : ''}
            </div>
            <p style="margin: 0 0 6px 0; color: #3b82f6; font-size: 14px; font-weight: 500;">${doctor.specialization}</p>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">${doctor.hospitalAffiliation}</p>
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              ${doctor.rating ? `
                <span style="color: #f59e0b; font-size: 14px;">★</span>
                <span style="margin-left: 4px; font-size: 14px; font-weight: 500;">${doctor.rating.average}</span>
                <span style="margin-left: 4px; color: #6b7280; font-size: 12px;">(${doctor.rating.count} reviews)</span>
              ` : ''}
            </div>
            <div style="display: flex; justify-content: between; align-items: center;">
              <span style="font-size: 13px; color: #374151;">Fee: ₹${doctor.consultationFee || 500}</span>
              ${doctor.distance ? `<span style="margin-left: 12px; font-size: 12px; color: #6b7280;">${doctor.distance.toFixed(1)} km away</span>` : ''}
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  };

  // Get city coordinates (fallback)
  const getCityCoordinates = (city: string) => {
    const cityCoords: { [key: string]: { lat: number; lng: number } } = {
      'Mumbai': { lat: 19.0760, lng: 72.8777 },
      'Delhi': { lat: 28.7041, lng: 77.1025 },
      'Bangalore': { lat: 12.9716, lng: 77.5946 },
      'Chennai': { lat: 13.0827, lng: 80.2707 },
      'Kolkata': { lat: 22.5726, lng: 88.3639 },
      'Hyderabad': { lat: 17.3850, lng: 78.4867 },
      'Pune': { lat: 18.5204, lng: 73.8567 },
      'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
      'Jaipur': { lat: 26.9124, lng: 75.7873 },
      'Lucknow': { lat: 26.8467, lng: 80.9462 }
    };
    return cityCoords[city] || { lat: 20.5937, lng: 78.9629 };
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(location);
            mapInstanceRef.current.setZoom(12);
          }

          toast({
            title: "Location Detected",
            description: "Showing doctors near your location",
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  };

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(sortBy && { sortBy })
      });

      // Add filters only if not 'all'
      if (selectedSpecialization !== 'all') {
        params.append('specialization', selectedSpecialization);
      }
      if (selectedCity !== 'all') {
        params.append('city', selectedCity);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      // Add location params if available
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', '50'); // 50km radius
      }

      const response = await fetch(`${API_BASE}/auth/doctors?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalDoctors(data.pagination?.total || 0);
      } else {
        throw new Error('Failed to fetch doctors');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch doctors. Please try again.",
        variant: "destructive"
      });
      setDoctors([]);
      setTotalPages(1);
      setTotalDoctors(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDoctors();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSpecialization('all');
    setSelectedCity('all');
    setSortBy('rating');
    setCurrentPage(1);
    setShowVerifiedOnly(false);
    setTimeout(() => {
      fetchDoctors();
    }, 100);
  };

  const getDisplayedDoctors = () => {
    return showVerifiedOnly ? doctors.filter(d => d.isVerified) : doctors;
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gradient">Find Expert Doctors</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Connect with verified healthcare professionals with Google Maps integration
        </p>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="xl:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctors by name, hospital, or condition..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            {/* Specialization Filter */}
            <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
              <SelectTrigger>
                <SelectValue placeholder="All Specializations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specializations</SelectItem>
                {specializations.map((spec) => (
                  <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* City Filter */}
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button onClick={handleSearch} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Enhanced Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t">
            {/* Results Info & Location */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                {totalDoctors > 0
                  ? `Showing ${getDisplayedDoctors().length} of ${totalDoctors} ${showVerifiedOnly ? 'verified ' : ''}doctors`
                  : 'No doctors found'}
              </div>
              
              <Button
                onClick={getUserLocation}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <Navigation className="h-4 w-4 mr-1" />
                Near Me
              </Button>
            </div>

            {/* View Controls */}
            <div className="flex items-center space-x-4">
              {/* Verified Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="verified-only"
                  checked={showVerifiedOnly}
                  onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="verified-only" className="text-sm font-medium flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-green-600" />
                  Verified Only
                </label>
              </div>

              {/* View Mode Toggle */}
              <div className="flex border rounded-lg">
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className="rounded-r-none"
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'map' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('map')}
                  className="rounded-l-none"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="experience">Most Experienced</SelectItem>
                  <SelectItem value="fee">Consultation Fee</SelectItem>
                  <SelectItem value="distance">Nearest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {viewMode === 'map' ? (
        /* Map View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-red-500" />
                  <span>Doctor Locations</span>
                  <Badge variant="outline" className="ml-2">
                    {getDisplayedDoctors().length} doctors
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  ref={mapRef}
                  className="w-full h-[600px] rounded-lg border border-gray-300"
                />
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Verified Doctors</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span>Other Doctors</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setViewMode('list')}
                    variant="outline"
                    size="sm"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    List View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar with doctor cards */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {getDisplayedDoctors().map((doctor) => (
              <Card key={doctor._id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-green-500/20 flex-shrink-0">
                      <Stethoscope className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm truncate">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </h4>
                        {doctor.isVerified && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            ✓
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 font-medium mb-1">{doctor.specialization}</p>
                      <p className="text-xs text-gray-600 mb-2 truncate">{doctor.hospitalAffiliation}</p>
                      
                      <div className="flex items-center justify-between text-xs">
                        {doctor.rating && (
                          <div className="flex items-center text-yellow-600">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            <span>{doctor.rating.average}</span>
                          </div>
                        )}
                        <span className="text-green-600 font-semibold">₹{doctor.consultationFee || 500}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t flex justify-between">
                    <Button variant="outline" size="sm" className="text-xs px-2 py-1" asChild>
                      <Link to={`/doctors/${doctor._id}`}>View</Link>
                    </Button>
                    <Button size="sm" className="text-xs px-2 py-1" asChild>
                      <Link to={`/book-appointment/${doctor._id}`}>Book</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* List View - Your Original Design */
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : getDisplayedDoctors().length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getDisplayedDoctors().map((doctor) => (
                  <Card key={doctor._id} className="hover:shadow-lg transition-shadow group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start space-x-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-green-500/20 flex-shrink-0">
                          <Stethoscope className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                                Dr. {doctor.firstName} {doctor.lastName}
                              </CardTitle>
                              <CardDescription className="font-medium text-blue-600">
                                {doctor.specialization}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <Award className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                              {doctor.isOnline && (
                                <div className="flex items-center justify-center">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                                  <span className="text-xs text-green-600">Online</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Hospital & Experience */}
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{doctor.hospitalAffiliation}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <GraduationCap className="h-4 w-4 mr-2" />
                            <span>{doctor.yearsOfExperience} years exp.</span>
                          </div>
                          
                          {doctor.rating && (
                            <div className="flex items-center text-yellow-600">
                              <Star className="h-4 w-4 mr-1 fill-current" />
                              <span className="font-medium">{doctor.rating.average}</span>
                              <span className="text-muted-foreground ml-1">
                                ({doctor.rating.count})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      {(doctor.city || doctor.state) && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{doctor.city}{doctor.city && doctor.state && ', '}{doctor.state}</span>
                          </div>
                          {doctor.distance && (
                            <span className="text-blue-600 font-medium">
                              {doctor.distance.toFixed(1)} km away
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bio */}
                      {doctor.bio && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {doctor.bio}
                        </p>
                      )}

                      {/* Languages */}
                      {doctor.languages && doctor.languages.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doctor.languages.slice(0, 3).map((language) => (
                            <Badge key={language} variant="secondary" className="text-xs">
                              {language}
                            </Badge>
                          ))}
                          {doctor.languages.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{doctor.languages.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Fee & Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600">
                            ₹{doctor.consultationFee || 500}
                          </span>
                          <span className="text-xs text-muted-foreground">consultation</span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/doctors/${doctor._id}`}>
                              View Profile
                            </Link>
                          </Button>
                          <Button size="sm" asChild>
                            <Link to={`/book-appointment/${doctor._id}`}>
                              <Calendar className="h-4 w-4 mr-1" />
                              Book Now
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination - Your Original */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
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
                  No doctors match your search criteria. Try adjusting your filters or search terms.
                </p>
                <Button onClick={clearFilters}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
