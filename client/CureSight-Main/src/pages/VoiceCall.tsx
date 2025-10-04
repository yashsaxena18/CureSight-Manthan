import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX,
  User, Clock, MessageSquare, Send, ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';

export default function VoiceCall() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const [patient, setPatient] = useState<any>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  // Chat states
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    initializeSocket();
    fetchPatientDetails();
    initializeAudio();
    
    return () => {
      cleanup();
    };
  }, [patientId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallActive]);

  const initializeSocket = () => {
    socketRef.current = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('authToken'),
        userId: user?._id,
        userType: 'doctor'
      }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Voice call socket connected');
      setConnectionStatus('connected');
    });

    socket.on('voice-call-request', async ({ from, offer }) => {
      await handleIncomingCall(offer);
    });

    socket.on('voice-call-answer', async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('voice-call-ended', () => {
      endCall();
    });
  };

  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      console.log('✅ Audio initialized for voice call');
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access for voice calls.",
        variant: "destructive"
      });
    }
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
        setPatient(data.patient);
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.ontrack = (event) => {
      console.log('🎵 Remote audio stream received');
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          to: patientId,
          candidate: event.candidate
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        setIsCallActive(true);
        setIsConnecting(false);
      } else if (peerConnection.connectionState === 'disconnected') {
        endCall();
      }
    };

    return peerConnection;
  };

  const startCall = async () => {
    if (!socketRef.current || !localStream) return;

    console.log('📞 Starting voice call...');
    setIsConnecting(true);
    
    try {
      const peerConnection = createPeerConnection();
      
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await peerConnection.setLocalDescription(offer);
      
      socketRef.current.emit('voice-call-request', {
        to: patientId,
        offer: offer,
        callerInfo: {
          id: user?._id,
          name: `Dr. ${user?.firstName} ${user?.lastName}`,
          type: 'voice'
        }
      });

      toast({
        title: "Calling Patient...",
        description: `Voice call to ${patient?.firstName} ${patient?.lastName}`
      });

    } catch (error) {
      console.error('❌ Error starting voice call:', error);
      setIsConnecting(false);
    }
  };

  const handleIncomingCall = async (offer: RTCSessionDescriptionInit) => {
    try {
      const peerConnection = createPeerConnection();
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      if (socketRef.current) {
        socketRef.current.emit('voice-call-answer', {
          to: patientId,
          answer: answer
        });
      }
      
      setIsCallActive(true);
    } catch (error) {
      console.error('❌ Error handling incoming voice call:', error);
    }
  };

  const endCall = () => {
    console.log('📞 Ending voice call...');
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit('voice-call-ended', { to: patientId });
    }

    setIsCallActive(false);
    setIsConnecting(false);
    setCallDuration(0);
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    toast({
      title: "Call Ended",
      description: "Voice call completed successfully."
    });
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerOn ? 0.5 : 1;
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Preparing voice call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex flex-col">
      {/* Hidden audio elements */}
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />

      {/* Header */}
      <div className="bg-black bg-opacity-30 text-white p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/patients')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
          Voice Call • {connectionStatus}
        </Badge>
      </div>

      {/* Main Call Interface */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-white max-w-md">
          {/* Patient Avatar */}
          <div className="w-40 h-40 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-20 w-20 text-white" />
          </div>

          {/* Patient Info */}
          <h2 className="text-2xl font-bold mb-2">
            {patient?.firstName} {patient?.lastName}
          </h2>
          
          {/* Call Status */}
          <div className="text-lg mb-8">
            {isCallActive && (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span>Connected • {formatTime(callDuration)}</span>
              </div>
            )}
            {isConnecting && (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Calling...</span>
              </div>
            )}
            {!isCallActive && !isConnecting && (
              <span className="text-gray-300">Ready to call</span>
            )}
          </div>

          {/* Call Controls */}
          <div className="flex items-center justify-center space-x-6">
            {/* Audio Toggle */}
            <Button
              variant={isAudioOn ? "ghost" : "destructive"}
              size="lg"
              onClick={toggleAudio}
              className="rounded-full w-16 h-16 text-white hover:bg-white hover:bg-opacity-20"
              disabled={!isCallActive && !isConnecting}
            >
              {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>

            {/* Call/End Call Button */}
            <Button
              variant={isCallActive || isConnecting ? "destructive" : "default"}
              size="lg"
              onClick={isCallActive || isConnecting ? endCall : startCall}
              className="rounded-full w-20 h-20 text-white"
              disabled={connectionStatus !== 'connected'}
            >
              {isCallActive || isConnecting ? (
                <PhoneOff className="h-8 w-8" />
              ) : (
                <Phone className="h-8 w-8" />
              )}
            </Button>

            {/* Speaker Toggle */}
            <Button
              variant={isSpeakerOn ? "ghost" : "secondary"}
              size="lg"
              onClick={toggleSpeaker}
              className="rounded-full w-16 h-16 text-white hover:bg-white hover:bg-opacity-20"
              disabled={!isCallActive}
            >
              {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
            </Button>
          </div>

          {/* Additional Actions */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            <Button
              variant="outline"
              onClick={() => setShowChat(!showChat)}
              className="text-white border-white hover:bg-white hover:text-black"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Overlay */}
      {showChat && (
        <div className="absolute bottom-0 right-0 w-80 h-96 bg-white rounded-tl-lg shadow-lg flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Voice Call Chat</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {chatMessages.map((message, index) => (
              <div key={index} className="mb-2">
                <div className={`p-2 rounded ${
                  message.sender === 'doctor' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
                }`}>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
              />
              <Button size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="bg-black bg-opacity-30 text-white p-2 text-center text-sm">
        Real-time Voice Communication • High Quality Audio
      </div>
    </div>
  );
}
