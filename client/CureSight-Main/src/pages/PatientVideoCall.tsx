import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, 
  Settings, ArrowLeft, Clock, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

export default function PatientVideoCall() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
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
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Fetch doctor info
      await fetchDoctorInfo();

      // Setup WebRTC
      setupPeerConnection();

    } catch (error) {
      console.error('Error initializing call:', error);
      toast({
        title: "Camera/Microphone Error",
        description: "Please allow camera and microphone access.",
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

    socket.on('call-answer', async ({ answer }) => {
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

    socket.on('call-ended', () => {
      endCall();
    });

    socket.on('call-rejected', () => {
      toast({
        title: "Call Rejected",
        description: "The doctor is not available right now.",
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
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
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

      socketRef.current.emit('call-request', {
        to: doctorId,
        offer: offer,
        callerInfo: {
          id: user?._id,
          name: `${user?.firstName} ${user?.lastName}`,
          type: 'video'
        }
      });

      toast({
        title: "Calling Doctor...",
        description: "Please wait while we connect you.",
      });

    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: "Failed to start the call.",
        variant: "destructive"
      });
    }
  };

  const endCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('call-ended', { to: doctorId });
    }

    cleanup();
    setCallStatus('ended');

    toast({
      title: "Call Ended",
      description: "The video call has been ended.",
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

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 bg-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/my-appointments')}
            className="text-white hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {doctorInfo && (
            <div>
              <h1 className="text-xl font-bold">
                Video Call with Dr. {doctorInfo.firstName} {doctorInfo.lastName}
              </h1>
              <p className="text-gray-400">{doctorInfo.specialization}</p>
            </div>
          )}
        </div>

        {callStatus === 'connected' && (
          <div className="flex items-center space-x-2 text-green-400">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(callDuration)}</span>
          </div>
        )}
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video (Doctor) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-screen object-cover"
        />

        {/* Local Video (Patient) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
            You
          </div>
        </div>

        {/* Call Status Overlay */}
        {callStatus !== 'connected' && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center">
            <Card className="w-96">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  {callStatus === 'calling' ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                      <span>Calling Doctor...</span>
                    </>
                  ) : callStatus === 'ended' ? (
                    <>
                      <AlertCircle className="h-6 w-6 text-red-500" />
                      <span>Call Ended</span>
                    </>
                  ) : (
                    <>
                      <Video className="h-6 w-6 text-blue-500" />
                      <span>Ready to Call</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {callStatus === 'idle' && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Ready to start video call with your doctor
                    </p>
                    <Button onClick={startCall} className="w-full">
                      <Video className="h-4 w-4 mr-2" />
                      Start Video Call
                    </Button>
                  </div>
                )}
                
                {callStatus === 'calling' && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Connecting to your doctor...
                    </p>
                    <Button onClick={endCall} variant="destructive" className="w-full">
                      <PhoneOff className="h-4 w-4 mr-2" />
                      Cancel Call
                    </Button>
                  </div>
                )}

                {callStatus === 'ended' && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      The call has ended
                    </p>
                    <Button onClick={() => navigate('/my-appointments')} className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Appointments
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="p-6 bg-gray-800 flex items-center justify-center space-x-4">
        <Button
          variant={isAudioEnabled ? "secondary" : "destructive"}
          size="lg"
          onClick={toggleAudio}
          disabled={callStatus !== 'connected'}
        >
          {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={isVideoEnabled ? "secondary" : "destructive"}
          size="lg"
          onClick={toggleVideo}
          disabled={callStatus !== 'connected'}
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={endCall}
          disabled={callStatus === 'idle'}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>

        <Button variant="secondary" size="lg" disabled>
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
