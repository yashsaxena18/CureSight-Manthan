import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
  Monitor, MessageSquare, FileText, Pill, User, Clock, Send,
  ArrowLeft, Settings, Volume2, Maximize, Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  dateOfBirth: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'doctor' | 'patient';
  message: string;
  timestamp: Date;
  type: 'text' | 'prescription' | 'file';
}

export default function VideoConsultation() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  // States
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // WebRTC states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    initializeSocket();
    fetchPatientDetails();
    initializeMedia();
    
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
      console.log('✅ Socket connected');
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnectionStatus('disconnected');
    });

    // WebRTC signaling events
    socket.on('call-request', async ({ from, offer }) => {
      console.log('📞 Incoming call from:', from);
      await handleIncomingCall(offer);
    });

    socket.on('call-answer', async ({ answer }) => {
      console.log('✅ Call answered');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      console.log('🧊 ICE candidate received');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('call-ended', () => {
      console.log('📞 Call ended by remote peer');
      endCall();
    });

    // Chat events
    socket.on('new-message', (message: ChatMessage) => {
      console.log('💬 New message received:', message);
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('user-online', ({ userId }) => {
      console.log('🟢 User online:', userId);
    });

    socket.on('user-offline', ({ userId }) => {
      console.log('🔴 User offline:', userId);
    });
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

    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('🎥 Remote stream received');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('🧊 Sending ICE candidate');
        socketRef.current.emit('ice-candidate', {
          to: patientId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        setIsCallActive(true);
        setIsConnecting(false);
      } else if (peerConnection.connectionState === 'disconnected') {
        endCall();
      }
    };

    return peerConnection;
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
      console.error('❌ Error fetching patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      console.log('✅ Media initialized');
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      toast({
        title: "Camera/Microphone Access Required",
        description: "Please allow camera and microphone access for video consultation.",
        variant: "destructive"
      });
    }
  };

  const startCall = async () => {
    if (!socketRef.current || !localStream) {
      toast({
        title: "Connection Error",
        description: "Unable to start call. Please check your connection.",
        variant: "destructive"
      });
      return;
    }

    console.log('🎥 Starting video call...');
    setIsConnecting(true);
    
    try {
      const peerConnection = createPeerConnection();
      
      // Create offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await peerConnection.setLocalDescription(offer);
      
      // Send call request to patient
      socketRef.current.emit('call-request', {
        to: patientId,
        offer: offer,
        callerInfo: {
          id: user?._id,
          name: `Dr. ${user?.firstName} ${user?.lastName}`,
          type: 'video'
        }
      });

      toast({
        title: "Calling Patient...",
        description: `Connecting to ${patient?.firstName} ${patient?.lastName}`
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (isConnecting) {
          setIsConnecting(false);
          toast({
            title: "Call Timeout",
            description: "Patient did not answer the call.",
            variant: "destructive"
          });
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Error starting call:', error);
      setIsConnecting(false);
      toast({
        title: "Call Failed",
        description: "Unable to start video call. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleIncomingCall = async (offer: RTCSessionDescriptionInit) => {
    try {
      const peerConnection = createPeerConnection();
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      if (socketRef.current) {
        socketRef.current.emit('call-answer', {
          to: patientId,
          answer: answer
        });
      }
      
      setIsCallActive(true);
    } catch (error) {
      console.error('❌ Error handling incoming call:', error);
    }
  };

  const endCall = () => {
    console.log('📞 Ending video call...');
    
    // Clean up peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Notify other peer
    if (socketRef.current) {
      socketRef.current.emit('call-ended', { to: patientId });
    }

    // Reset states
    setIsCallActive(false);
    setIsConnecting(false);
    setCallDuration(0);
    
    // Clear remote video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    toast({
      title: "Call Ended",
      description: "Video consultation completed successfully."
    });
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
        
        toast({
          title: videoTrack.enabled ? "Camera On" : "Camera Off",
          description: `Camera ${videoTrack.enabled ? 'enabled' : 'disabled'}`
        });
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
        
        toast({
          title: audioTrack.enabled ? "Microphone On" : "Microphone Off",
          description: `Microphone ${audioTrack.enabled ? 'enabled' : 'disabled'}`
        });
      }
    }
  };

  const shareScreen = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Replace video track in peer connection
        if (peerConnectionRef.current && localStream) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = peerConnectionRef.current.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          // Return to camera
          if (localStream && peerConnectionRef.current) {
            const videoTrack = localStream.getVideoTracks()[0];
            const sender = peerConnectionRef.current.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          }
          initializeMedia();
        };

        toast({
          title: "Screen Sharing Started",
          description: "Your screen is now being shared"
        });

      } else {
        // Stop screen sharing
        setIsScreenSharing(false);
        initializeMedia();
        
        toast({
          title: "Screen Sharing Stopped",
          description: "Returned to camera view"
        });
      }
    } catch (error) {
      console.error('❌ Error sharing screen:', error);
      toast({
        title: "Screen Share Failed",
        description: "Unable to share screen. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: user?._id || '',
      senderType: 'doctor',
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };
    
    // Send via socket
    socketRef.current.emit('send-message', {
      to: patientId,
      message
    });
    
    // Add to local state
    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const sendPrescription = () => {
    if (!socketRef.current) return;

    const prescriptionMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: user?._id || '',
      senderType: 'doctor',
      message: 'Digital Prescription: Paracetamol 500mg - Take 1 tablet twice daily after meals for 5 days',
      timestamp: new Date(),
      type: 'prescription'
    };
    
    socketRef.current.emit('send-message', {
      to: patientId,
      message: prescriptionMessage
    });
    
    setChatMessages(prev => [...prev, prescriptionMessage]);
    
    toast({
      title: "Prescription Sent! 💊",
      description: "Digital prescription shared with patient"
    });
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
          <p>Preparing video consultation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/patients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">
                {patient?.firstName} {patient?.lastName}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>
                  {isCallActive && `Connected • ${formatTime(callDuration)}`}
                  {isConnecting && 'Connecting...'}
                  {!isCallActive && !isConnecting && connectionStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
            {connectionStatus === 'connected' ? (
              <>
                <Shield className="h-3 w-3 mr-1" />
                Real-time Connected
              </>
            ) : (
              'Connecting...'
            )}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 relative bg-black">
          {/* Remote Video (Patient) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Call Status Overlay */}
          {!isCallActive && (
            <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-50">
              <div className="text-center">
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold mb-2">Connecting...</h3>
                    <p className="text-gray-400">
                      Calling {patient?.firstName} {patient?.lastName}
                    </p>
                  </>
                ) : (
                  <>
                    <Video className="h-24 w-24 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-xl font-semibold mb-2">Video Consultation</h3>
                    <p className="text-gray-400 mb-6">
                      Ready to start video call with {patient?.firstName}
                    </p>
                    <Button 
                      onClick={startCall} 
                      size="lg" 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={connectionStatus !== 'connected'}
                    >
                      <Video className="h-5 w-5 mr-2" />
                      Start Video Call
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Local Video (Doctor) - Picture in Picture */}
          <div className="absolute bottom-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
              Dr. {user?.firstName}
            </div>
          </div>

          {/* Video Controls */}
          {(isCallActive || isConnecting) && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-gray-800 bg-opacity-90 rounded-full px-6 py-3">
              <Button
                variant={isVideoOn ? "ghost" : "destructive"}
                size="sm"
                onClick={toggleVideo}
                className="rounded-full text-white hover:bg-gray-700"
                disabled={isConnecting}
              >
                {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              
              <Button
                variant={isAudioOn ? "ghost" : "destructive"}
                size="sm"
                onClick={toggleAudio}
                className="rounded-full text-white hover:bg-gray-700"
                disabled={isConnecting}
              >
                {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              
              <Button
                variant={isScreenSharing ? "default" : "ghost"}
                size="sm"
                onClick={shareScreen}
                className="rounded-full text-white hover:bg-gray-700"
                disabled={isConnecting}
              >
                <Monitor className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className="rounded-full text-white hover:bg-gray-700"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={endCall}
                className="rounded-full"
                disabled={isConnecting}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Real-time Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-white border-l flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Real-time Chat
                <Badge variant="outline" className="ml-2 text-xs">
                  {connectionStatus === 'connected' ? 'Live' : 'Offline'}
                </Badge>
              </h3>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderType === 'doctor' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      message.senderType === 'doctor'
                        ? 'bg-blue-500 text-white'
                        : message.type === 'prescription'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.type === 'prescription' && (
                      <div className="flex items-center mb-1">
                        <Pill className="h-3 w-3 mr-1" />
                        <span className="text-xs font-semibold">Prescription</span>
                      </div>
                    )}
                    <p>{message.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                  disabled={connectionStatus !== 'connected'}
                />
                <Button 
                  size="sm" 
                  onClick={sendMessage}
                  disabled={connectionStatus !== 'connected' || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex space-x-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={sendPrescription}
                  disabled={connectionStatus !== 'connected'}
                >
                  <Pill className="h-4 w-4 mr-1" />
                  Prescription
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={connectionStatus !== 'connected'}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Share File
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 text-white p-2 text-center text-sm">
        <div className="flex items-center justify-center space-x-4">
          <span>Real-time Video Consultation</span>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>
              {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {isCallActive && (
            <span className="text-green-400">
              Call Duration: {formatTime(callDuration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
