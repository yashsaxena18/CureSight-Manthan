import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, Users, Search, PhoneCall, Clock,
  UserCheck, Activity, Mic, Video
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = 'http://localhost:5000/api';

export default function VoiceCenterDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPatientsForVoice();
  }, []);

  const fetchPatientsForVoice = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/doctor/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((item: any) =>
    item.patient?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.patient?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.patient?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Phone className="h-8 w-8 text-purple-600" />
            <span>Voice Call Center</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            High-quality voice consultations with patients
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="flex items-center space-x-2">
            <Mic className="h-3 w-3 text-green-500" />
            <span>Audio Ready</span>
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{patients.length}</p>
                <p className="text-sm text-muted-foreground">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <PhoneCall className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Active Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Calls Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Mic className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">0m</p>
                <p className="text-sm text-muted-foreground">Call Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients to start voice call..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients List for Voice Calls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map((item: any) => (
            <Card key={item.patient._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {item.patient.firstName} {item.patient.lastName}
                    </CardTitle>
                    <CardDescription>
                      Last consultation: {new Date(item.lastAppointment).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {item.patient.email}
                </div>
                
                <div className="flex space-x-2">
                  <Button className="flex-1" asChild>
                    <Link to={`/doctor/voice-call/${item.patient._id}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Start Voice Call
                    </Link>
                  </Button>
                  
                  <Button variant="outline" asChild>
                    <Link to={`/doctor/video-consultation/${item.patient._id}`}>
                      <Video className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-16">
                <Phone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Patients Found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery 
                    ? `No patients match "${searchQuery}"`
                    : "You don't have any patients yet for voice calls."
                  }
                </p>
                <Button asChild>
                  <Link to="/doctor/patients">
                    <Users className="h-4 w-4 mr-2" />
                    View All Patients
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
