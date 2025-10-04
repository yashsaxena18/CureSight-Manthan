import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX,
  Settings, ArrowLeft, Clock, AlertCircle, Stethoscope,
  User, Building, Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

export default function PatientVoiceCall() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (doctorId && user) {
      initializeCall();
      setupSocket();
    }

    return () => {
      cleanup();
    };
  }, [doctorId, user]);

  const initializeCall = async () => {
    try {
      // Get user media (audio only)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });

      localStreamRef.current = stream;
      await fetchDoctorInfo();
      setupPeerConnection();

    } catch (error) {
      console.error('Error initializing voice call:', error);
      toast({
        title: "Microphone Error",
        description: "Please allow microphone access for voice calls.",
        variant: "destructive"
      });
    }
  };

  const fetchDoctorInfo = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/appointments/doctor/profile/${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDoctorInfo(data.doctor);
      }
    } catch (error) {
      console.error('Error fetching doctor info:', error);
    }
  };

  const setupSocket = () => {
    const token = localStorage.getItem('authToken');
    
    socketRef.current = io('http://localhost:5000', {
      auth: {
        token: token,
        userType: 'patient'
      }
    });

    const socket = socketRef.current;

    socket.on('voice-call-answer', async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(answer);
        setCallStatus('connected');
        startCallTimer();
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(candidate);
      }
    });

    socket.on('voice-call-ended', () => {
      endCall();
    });

    socket.on('voice-call-failed', ({ reason }) => {
      toast({
        title: "Call Failed",
        description: reason || "Unable to connect voice call.",
        variant: "destructive"
      });
      setCallStatus('ended');
    });
  };

  const setupPeerConnection = () => {
    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    const pc = peerConnectionRef.current;

    // Add local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          to: doctorId,
          candidate: event.candidate
        });
      }
    };
  };

  const startCall = async () => {
    if (!peerConnectionRef.current || !socketRef.current) return;

    try {
      setCallStatus('calling');
      
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      socketRef.current.emit('voice-call-request', {
        to: doctorId,
        offer: offer,
        callerInfo: {
          id: user?._id,
          name: `${user?.firstName} ${user?.lastName}`,
          type: 'voice'
        }
      });

      toast({
        title: "Calling Doctor...",
        description: "Please wait while we connect your voice call.",
      });

    } catch (error) {
      console.error('Error starting voice call:', error);
      toast({
        title: "Call Failed",
        description: "Failed to start the voice call.",
        variant: "destructive"
      });
    }
  };

  const endCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('voice-call-ended', { to: doctorId });
    }

    cleanup();
    setCallStatus('ended');

    toast({
      title: "Call Ended",
      description: "The voice call has been ended.",
    });
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (remoteAudioRef.current) {
      // Toggle speaker/earpiece (implementation depends on device capabilities)
      remoteAudioRef.current.volume = isSpeakerOn ? 0.5 : 1.0;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white flex flex-col">
      {/* Hidden remote audio element */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
      />

      {/* Header */}
      <div className="p-4 bg-black bg-opacity-20 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/patient/consultations')}
          className="text-white hover:bg-white hover:bg-opacity-20"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {callStatus === 'connected' && (
          <div className="flex items-center space-x-2 text-green-300">
            <Clock className="h-4 w-4" />
            <span className="font-mono text-lg">{formatDuration(callDuration)}</span>
          </div>
        )}
      </div>

      {/* Main Call Interface */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md bg-white bg-opacity-10 backdrop-blur-md border-white border-opacity-20">
          <CardHeader className="text-center">
            <CardTitle className="text-white">
              {callStatus === 'calling' && "Calling..."}
              {callStatus === 'connected' && "Voice Call"}
              {callStatus === 'ended' && "Call Ended"}
              {callStatus === 'idle' && "Voice Call"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {doctorInfo && (
              <div className="text-center space-y-4">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                    <Stethoscope className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Dr. {doctorInfo.firstName} {doctorInfo.lastName}
                  </h2>
                  <p className="text-blue-200">{doctorInfo.specialization}</p>
                  <p className="text-sm text-gray-300">{doctorInfo.hospitalAffiliation}</p>
                  
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    {doctorInfo.isVerified && (
                      <Badge className="bg-green-500">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Call Status Messages */}
            <div className="text-center">
              {callStatus === 'calling' && (
                <div className="space-y-2">
                  <div className="animate-pulse">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Phone className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <p className="text-white">Connecting your voice call...</p>
                  <p className="text-sm text-blue-200">Please wait while the doctor answers</p>
                </div>
              )}

              {callStatus === 'connected' && (
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                    <Phone className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-green-300">Connected</p>
                  <p className="text-sm text-blue-200">Voice call in progress</p>
                </div>
              )}

              {callStatus === 'ended' && (
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <PhoneOff className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-red-300">Call ended</p>
                  <p className="text-sm text-blue-200">Thank you for your consultation</p>
                </div>
              )}

              {callStatus === 'idle' && (
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Phone className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white">Ready to call</p>
                  <p className="text-sm text-blue-200">Start your voice consultation</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              {callStatus === 'idle' && (
                <Button 
                  onClick={startCall}
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 w-16 h-16 rounded-full"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              )}

              {callStatus === 'calling' && (
                <Button 
                  onClick={endCall}
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 w-16 h-16 rounded-full"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              )}

              {callStatus === 'connected' && (
                <>
                  <Button
                    onClick={toggleAudio}
                    size="lg"
                    variant={isAudioEnabled ? "secondary" : "destructive"}
                    className="w-12 h-12 rounded-full"
                  >
                    {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </Button>

                  <Button
                    onClick={toggleSpeaker}
                    size="lg"
                    variant={isSpeakerOn ? "default" : "secondary"}
                    className="w-12 h-12 rounded-full"
                  >
                    {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </Button>

                  <Button 
                    onClick={endCall}
                    size="lg"
                    className="bg-red-500 hover:bg-red-600 w-16 h-16 rounded-full"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </>
              )}

              {callStatus === 'ended' && (
                <Button 
                  onClick={() => navigate('/patient/consultations')}
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Consultations
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      {callStatus === 'connected' && (
        <div className="p-4 bg-black bg-opacity-20 text-center">
          <p className="text-sm text-blue-200">
            Secure voice consultation • End-to-end encrypted
          </p>
        </div>
      )}
    </div>
  );
}
