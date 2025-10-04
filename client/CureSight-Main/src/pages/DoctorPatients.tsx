import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, Search, Calendar, FileText, 
  Phone, Mail, User, Clock, Stethoscope,
  MessageSquare, Video, Shield, Circle,
  Send, X, Mic, MicOff, VideoOff,
  PhoneOff, VolumeX, Volume2, Pill
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { io, Socket } from 'socket.io-client';

interface Patient {
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
    gender: string;
    createdAt: string;
    isOnline?: boolean;
    hasUnreadMessages?: boolean;
  };
  lastAppointment: string;
  appointmentCount: number;
  lastConsultation: any;
}

interface Message {
  _id: string;
  sender: string;
  senderName: string;
  senderType: 'doctor' | 'patient';
  content: string;
  type: 'text' | 'prescription';
  timestamp: string;
  read: boolean;
  prescriptionData?: any;
}

interface CommunicationModalData {
  patientId: string;
  patientInfo: {
    firstName: string;
    lastName: string;
    email: string;
    age: number;
    gender: string;
    isOnline: boolean;
  };
}

const API_BASE = 'http://localhost:5000/api';

export default function DoctorPatients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 🆕 Communication States
  const [communicationModal, setCommunicationModal] = useState<CommunicationModalData | null>(null);
  const [activeCommTab, setActiveCommTab] = useState<'chat' | 'video' | 'voice'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // 🆕 Call States  
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // 🆕 WebRTC States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  // 🆕 Refs
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchPatients();
  }, [currentPage, searchQuery]);

  // 🆕 Initialize Socket when communication modal opens
  useEffect(() => {
    if (communicationModal && user) {
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        console.log('🔌 Disconnecting doctor socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      cleanup();
    };
  }, [communicationModal, user]);

  // 🆕 Setup media streams
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  // 🆕 Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 🆕 Call timer
  useEffect(() => {
    if (isVideoCallActive || isVoiceCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isVideoCallActive, isVoiceCallActive]);

  const fetchPatients = async () => {
    console.log('🔍 Fetching patients...');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`${API_BASE}/doctor/patients?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Patients data received:', data);
        
        // 🆕 Enhanced patients with communication data
        const enhancedPatients = (data.patients || []).map((item: Patient) => ({
          ...item,
          patient: {
            ...item.patient,
            isOnline: Math.random() > 0.4, // Mock online status
            hasUnreadMessages: Math.random() > 0.7 // Mock unread messages
          }
        }));
        
        setPatients(enhancedPatients);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        console.error('❌ Failed to fetch patients:', response.status);
        const errorData = await response.json();
        console.error('Error details:', errorData);
        setPatients([]);
      }
    } catch (error) {
      console.error('❌ Error fetching patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Real Socket.IO Connection - Doctor Side
  const initializeSocket = () => {
    const token = localStorage.getItem('authToken');
    if (!token || !communicationModal || !user) return;

    console.log('🔌 Initializing Doctor Socket.IO connection...');
    
    socketRef.current = io('http://localhost:5000', {
      auth: {
        token: token,
        userType: 'doctor',
        userName: `Dr. ${user.firstName} ${user.lastName}`
      },
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // ================== CONNECTION EVENTS ==================
    socket.on('connect', () => {
      console.log('✅ Doctor socket connected:', socket.id);
      setIsConnected(true);
      
      toast({
        title: "Connected! 🔗",
        description: "Real-time communication enabled",
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Doctor socket disconnected:', reason);
      setIsConnected(false);
      
      toast({
        title: "Disconnected",
        description: "Connection lost. Reconnecting...",
        variant: "destructive"
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Doctor socket connection error:', error);
      setIsConnected(false);
      
      toast({
        title: "Connection Error",
        description: "Failed to connect to server",
        variant: "destructive"
      });
    });

    // ================== REAL-TIME CHAT EVENTS ==================
    socket.on('new-message', (message: Message) => {
      console.log('💬 Doctor received new message:', message);
      
      setMessages(prev => [...prev, {
        ...message,
        senderName: message.senderName || (message.senderType === 'patient' ? communicationModal.patientInfo.firstName : 'Doctor')
      }]);

      // Show notification if from patient
      if (message.senderType === 'patient') {
        toast({
          title: "New Message 💬",
          description: `${message.senderName}: ${message.content}`,
        });
      }
    });

    socket.on('user-typing', ({ userId, isTyping: userTyping }) => {
      if (userId === communicationModal.patientId) {
        setIsTyping(userTyping);
        
        if (userTyping) {
          // Clear typing after 3 seconds of no activity
          setTimeout(() => setIsTyping(false), 3000);
        }
      }
    });

    socket.on('message-delivered', ({ messageId, deliveredAt }) => {
      console.log('✅ Message delivered to patient:', messageId);
    });

    socket.on('message-read', ({ messageId, readBy, readAt }) => {
      console.log('📖 Message read by patient:', messageId);
    });

    // ================== VIDEO CALL EVENTS ==================
    socket.on('call-request', async (callData) => {
      console.log('📹 Doctor received call request:', callData);
      setCallStatus('ringing');
      setCurrentCall(callData);
      setActiveCommTab('video');

      toast({
        title: "Incoming Video Call 📹",
        description: `${communicationModal.patientInfo.firstName} is calling you`,
        duration: 10000,
      });
    });

    socket.on('call-answer', async ({ answer, answererInfo }) => {
      console.log('✅ Doctor call answered:', answererInfo);
      
      if (peerConnection && answer) {
        try {
          await peerConnection.setRemoteDescription(answer);
          setCallStatus('connected');
          
          toast({
            title: "Call Connected! ✅",
            description: `Connected with ${communicationModal.patientInfo.firstName}`,
          });
        } catch (error) {
          console.error('❌ Error setting remote description:', error);
        }
      }
    });

    socket.on('call-ended', ({ endedBy }) => {
      console.log('📞 Call ended by patient:', endedBy);
      endCall();
      
      toast({
        title: "Call Ended",
        description: `Call ended by ${endedBy.firstName}`,
      });
    });

    socket.on('call-rejected', ({ rejectedBy }) => {
      console.log('❌ Call rejected by patient:', rejectedBy);
      setCallStatus('ended');
      cleanup();
      
      toast({
        title: "Call Rejected",
        description: `Call rejected by ${communicationModal.patientInfo.firstName}`,
        variant: "destructive"
      });
    });

    // ================== VOICE CALL EVENTS ==================
    socket.on('voice-call-request', async (callData) => {
      console.log('📞 Doctor received voice call:', callData);
      setCallStatus('ringing');
      setCurrentCall({ ...callData, type: 'voice' });
      setActiveCommTab('voice');

      toast({
        title: "Incoming Voice Call 📞",
        description: `${communicationModal.patientInfo.firstName} is calling you`,
        duration: 10000,
      });
    });

    socket.on('voice-call-answer', async ({ answer, answererInfo }) => {
      console.log('✅ Doctor voice call answered:', answererInfo);
      
      if (peerConnection && answer) {
        try {
          await peerConnection.setRemoteDescription(answer);
          setCallStatus('connected');
          setIsVoiceCallActive(true);
        } catch (error) {
          console.error('❌ Error in voice call answer:', error);
        }
      }
    });

    socket.on('voice-call-ended', ({ endedBy }) => {
      console.log('📞 Voice call ended by patient');
      endVoiceCall();
    });

    // ================== WebRTC ICE CANDIDATES ==================
    socket.on('ice-candidate', async ({ candidate }) => {
      console.log('🧊 Doctor received ICE candidate');
      
      if (peerConnection && candidate) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error);
        }
      }
    });

    // ================== ERROR HANDLING ==================
    socket.on('error', (error) => {
      console.error('❌ Doctor socket error:', error);
      
      toast({
        title: "Communication Error",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    });
  };

  // 🆕 WebRTC Setup
  const setupPeerConnection = (isVideo: boolean = true) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('🧊 Doctor sending ICE candidate');
        socketRef.current.emit('ice-candidate', {
          to: communicationModal?.patientId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('📺 Doctor received remote stream');
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Doctor connection state:', pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        endCall();
      }
    };

    setPeerConnection(pc);
    return pc;
  };

  // 🆕 Communication Functions
  const openCommunicationHub = (patientItem: Patient) => {
    setCommunicationModal({
      patientId: patientItem.patient._id,
      patientInfo: {
        firstName: patientItem.patient.firstName,
        lastName: patientItem.patient.lastName,
        email: patientItem.patient.email,
        age: calculateAge(patientItem.patient.dateOfBirth),
        gender: patientItem.patient.gender,
        isOnline: patientItem.patient.isOnline || false
      }
    });
    
    // Reset states
    setMessages([]);
    setActiveCommTab('chat');
    setIsConnected(false);
    setCallStatus('idle');
    setIsVideoCallActive(false);
    setIsVoiceCallActive(false);
  };

  const closeCommunicationHub = () => {
    setCommunicationModal(null);
    setMessages([]);
    setIsTyping(false);
    setIsConnected(false);
    endCall();
    cleanup();
  };

  // 🆕 Real Message Sending
  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current || !isConnected) return;

    const messageData = {
      content: newMessage.trim(),
      type: 'text',
      timestamp: new Date().toISOString()
    };

    // Send via Socket.IO
    socketRef.current.emit('send-message', {
      to: communicationModal?.patientId,
      message: messageData
    });

    // Add to local messages immediately
    const localMessage: Message = {
      _id: `temp_${Date.now()}`,
      sender: user?._id || '',
      senderName: `Dr. ${user?.firstName} ${user?.lastName}`,
      senderType: 'doctor',
      content: messageData.content,
      timestamp: messageData.timestamp,
      type: 'text',
      read: false
    };

    setMessages(prev => [...prev, localMessage]);
    setNewMessage('');

    // Stop typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    sendTypingIndicator(false);
  };

  // 🆕 Send Prescription Function
  const sendPrescription = () => {
    if (!socketRef.current || !isConnected) return;

    const prescriptionData = {
      medicines: [
        {
          name: 'Paracetamol 500mg',
          dosage: '1 tablet',
          frequency: 'Twice daily',
          duration: '5 days',
          instructions: 'Take after meals with water'
        },
        {
          name: 'Vitamin D3',
          dosage: '1 capsule',
          frequency: 'Once daily',
          duration: '30 days',
          instructions: 'Take with breakfast'
        }
      ],
      notes: 'Take plenty of rest and fluids. Follow up if symptoms persist.',
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const prescriptionMessage = {
      content: `Digital Prescription: ${prescriptionData.medicines.map(m => m.name).join(', ')}`,
      type: 'prescription',
      timestamp: new Date().toISOString(),
      prescriptionData
    };

    socketRef.current.emit('send-message', {
      to: communicationModal?.patientId,
      message: prescriptionMessage
    });

    // Add to local messages
    const localMessage: Message = {
      _id: `prescription_${Date.now()}`,
      sender: user?._id || '',
      senderName: `Dr. ${user?.firstName} ${user?.lastName}`,
      senderType: 'doctor',
      content: prescriptionMessage.content,
      timestamp: prescriptionMessage.timestamp,
      type: 'prescription',
      read: false,
      prescriptionData
    };

    setMessages(prev => [...prev, localMessage]);

    toast({
      title: "Prescription Sent! 💊",
      description: "Digital prescription shared with patient",
    });
  };

  // 🆕 Typing Indicator
  const sendTypingIndicator = (typing: boolean) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing', {
        to: communicationModal?.patientId,
        isTyping: typing
      });
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (value.length > 0) {
      sendTypingIndicator(true);
      
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout to stop typing after 1 second of inactivity
      const timeout = setTimeout(() => {
        sendTypingIndicator(false);
      }, 1000);
      
      setTypingTimeout(timeout);
    } else {
      sendTypingIndicator(false);
    }
  };

  // 🆕 Real Video Call
  const startVideoCall = async () => {
    if (!socketRef.current || !isConnected) {
      toast({
        title: "Connection Required",
        description: "Please wait for connection to establish",
        variant: "destructive"
      });
      return;
    }

    try {
      setCallStatus('calling');
      setActiveCommTab('video');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);
      
      // Setup peer connection
      const pc = setupPeerConnection(true);
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send call request via Socket.IO
      socketRef.current.emit('call-request', {
        to: communicationModal?.patientId,
        offer: offer,
        callerInfo: {
          id: user?._id,
          name: `Dr. ${user?.firstName} ${user?.lastName}`,
          type: 'video'
        }
      });

      setIsVideoCallActive(true);
      setCallDuration(0);

      toast({
        title: "Calling Patient... 📹",
        description: `Calling ${communicationModal?.patientInfo.firstName}`,
      });

    } catch (error) {
      console.error('❌ Error starting video call:', error);
      setCallStatus('ended');
      
      toast({
        title: "Camera Access Required",
        description: "Please allow camera and microphone access",
        variant: "destructive"
      });
    }
  };

  // 🆕 Real Voice Call
  const startVoiceCall = async () => {
    if (!socketRef.current || !isConnected) {
      toast({
        title: "Connection Required",
        description: "Please wait for connection to establish",
        variant: "destructive"
      });
      return;
    }

    try {
      setCallStatus('calling');
      setActiveCommTab('voice');
      
      // Get user media (audio only)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });

      setLocalStream(stream);
      
      // Setup peer connection
      const pc = setupPeerConnection(false);
      
      // Add tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send voice call request
      socketRef.current.emit('voice-call-request', {
        to: communicationModal?.patientId,
        offer: offer,
        callerInfo: {
          id: user?._id,
          name: `Dr. ${user?.firstName} ${user?.lastName}`,
          type: 'voice'
        }
      });

      setIsVoiceCallActive(true);
      setCallDuration(0);

      toast({
        title: "Calling Patient... 📞",
        description: `Calling ${communicationModal?.patientInfo.firstName}`,
      });

    } catch (error) {
      console.error('❌ Error starting voice call:', error);
      setCallStatus('ended');
      
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access",
        variant: "destructive"
      });
    }
  };

  // 🆕 Answer Incoming Call
  const answerCall = async () => {
    if (!currentCall || !socketRef.current) return;

    try {
      const isVideo = currentCall.type !== 'voice';
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      });

      setLocalStream(stream);
      
      // Setup peer connection
      const pc = setupPeerConnection(isVideo);
      
      // Add tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set remote description
      await pc.setRemoteDescription(currentCall.offer);
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer
      if (currentCall.type === 'voice') {
        socketRef.current.emit('voice-call-answer', {
          to: currentCall.from,
          answer: answer
        });
        setIsVoiceCallActive(true);
      } else {
        socketRef.current.emit('call-answer', {
          to: currentCall.from,
          answer: answer
        });
        setIsVideoCallActive(true);
      }

      setCallStatus('connected');
      setCallDuration(0);

    } catch (error) {
      console.error('❌ Error answering call:', error);
      rejectCall();
    }
  };

  // 🆕 Reject Call
  const rejectCall = () => {
    if (!currentCall || !socketRef.current) return;

    socketRef.current.emit('call-rejected', {
      to: currentCall.from
    });

    setCallStatus('ended');
    setCurrentCall(null);
    cleanup();
  };

  // 🆕 End Call
  const endCall = () => {
    if (socketRef.current && communicationModal) {
      if (isVideoCallActive) {
        socketRef.current.emit('call-ended', {
          to: communicationModal.patientId
        });
      } else if (isVoiceCallActive) {
        socketRef.current.emit('voice-call-ended', {
          to: communicationModal.patientId
        });
      }
    }

    setCallStatus('ended');
    setIsVideoCallActive(false);
    setIsVoiceCallActive(false);
    setCurrentCall(null);
    cleanup();

    const duration = Math.floor(callDuration / 60) + ':' + String(callDuration % 60).padStart(2, '0');
    toast({
      title: "Call Ended",
      description: `Call duration: ${duration}`,
    });
  };

  const endVoiceCall = () => {
    endCall();
  };

  // 🆕 Cleanup function
  const cleanup = () => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    // Clear remote stream
    setRemoteStream(null);
    
    // Reset video refs
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        toast({
          title: audioTrack.enabled ? "Audio Unmuted" : "Audio Muted",
          description: audioTrack.enabled ? "Your microphone is on" : "Your microphone is off"
        });
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        toast({
          title: videoTrack.enabled ? "Video On" : "Video Off",
          description: videoTrack.enabled ? "Your camera is on" : "Your camera is off"
        });
      }
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Hidden audio element for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Users className="h-8 w-8 text-blue-600" />
            <span>My Patients</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and communicate with your patients
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={fetchPatients}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patients Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      ) : patients.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((item) => (
              <Card key={item.patient._id} className="hover:shadow-lg transition-shadow bg-gradient-to-r from-white to-blue-50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {item.patient.firstName} {item.patient.lastName}
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-2">
                          <span>{calculateAge(item.patient.dateOfBirth)} years • {item.patient.gender}</span>
                          <Circle className={`w-2 h-2 rounded-full ${
                            item.patient.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <span className={item.patient.isOnline ? 'text-green-600' : 'text-gray-500'}>
                            {item.patient.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    {item.patient.hasUnreadMessages && (
                      <Badge variant="destructive" className="text-xs animate-pulse">
                        New messages
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      {item.patient.email}
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      Last visit: {formatDate(item.lastAppointment)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {item.appointmentCount} consultation{item.appointmentCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    {/* 🆕 Updated Button Layout with Real Communication Hub */}
                    <div className="space-y-2 pt-2">
                      {/* Primary Real Communication Hub Button */}
                      <Button 
                        onClick={() => openCommunicationHub(item)}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Open Communication Hub
                        {item.patient.hasUnreadMessages && (
                          <Badge variant="destructive" className="ml-2 w-2 h-2 p-0 animate-pulse" />
                        )}
                      </Button>

                      {/* Secondary Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/doctor/patient-detail/${item.patient._id}`}>
                            <FileText className="h-4 w-4 mr-2" />
                            Records
                          </Link>
                        </Button>
                        
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/doctor/consultation/${item.patient._id}`}>
                            <Stethoscope className="h-4 w-4 mr-2" />
                            Consult
                          </Link>
                        </Button>
                      </div>

                      {/* Quick Communication Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            openCommunicationHub(item);
                            setTimeout(() => setActiveCommTab('video'), 100);
                          }}
                          disabled={!item.patient.isOnline}
                        >
                          <Video className="h-3 w-3 mr-1" />
                          Video
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            openCommunicationHub(item);
                            setTimeout(() => setActiveCommTab('voice'), 100);
                          }}
                          disabled={!item.patient.isOnline}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Voice
                        </Button>
                      </div>
                    </div>
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
            <h3 className="text-xl font-semibold mb-2">No Patients Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? `No patients match "${searchQuery}". Try a different search term.`
                : "You don't have any patients yet. Start accepting appointments to see them here."
              }
            </p>
            {searchQuery && (
              <Button onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 🆕 Real Communication Hub Modal */}
      <Dialog open={!!communicationModal} onOpenChange={(open) => !open && closeCommunicationHub()}>
        <DialogContent className="max-w-5xl h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-semibold">
                    {communicationModal?.patientInfo.firstName} {communicationModal?.patientInfo.lastName}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Circle className={`w-2 h-2 rounded-full ${
                      communicationModal?.patientInfo.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span>{communicationModal?.patientInfo.isOnline ? 'Online' : 'Offline'}</span>
                    <span>•</span>
                    <span>{communicationModal?.patientInfo.age} years • {communicationModal?.patientInfo.gender}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant={isConnected ? "default" : "secondary"} className="animate-pulse">
                  {isConnected ? '🟢 Connected' : '🔄 Connecting...'}
                </Badge>
                
                <Button variant="ghost" size="sm" onClick={closeCommunicationHub}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Tab Navigation */}
          <div className="flex border-b px-6">
            <Button
              variant={activeCommTab === 'chat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCommTab('chat')}
              className="rounded-none"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
              {messages.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {messages.length}
                </Badge>
              )}
            </Button>
            
            <Button
              variant={activeCommTab === 'video' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCommTab('video')}
              className="rounded-none"
              disabled={!communicationModal?.patientInfo.isOnline && !isVideoCallActive}
            >
              <Video className="h-4 w-4 mr-2" />
              Video Call
              {isVideoCallActive && (
                <Badge variant="destructive" className="ml-2 animate-pulse">
                  Live
                </Badge>
              )}
            </Button>
            
            <Button
              variant={activeCommTab === 'voice' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCommTab('voice')}
              className="rounded-none"
              disabled={!communicationModal?.patientInfo.isOnline && !isVoiceCallActive}
            >
              <Phone className="h-4 w-4 mr-2" />
              Voice Call
              {isVoiceCallActive && (
                <Badge variant="destructive" className="ml-2 animate-pulse">
                  Live
                </Badge>
              )}
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {/* Chat Tab */}
            {activeCommTab === 'chat' && (
              <div className="h-full flex flex-col">
                {/* Connection Status */}
                {!isConnected && (
                  <div className="p-4 bg-yellow-50 border-b">
                    <div className="flex items-center justify-center space-x-2 text-yellow-800">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-800"></div>
                      <span>Establishing secure connection...</span>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 && isConnected ? (
                    <div className="text-center text-muted-foreground py-16">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Start conversation with {communicationModal?.patientInfo.firstName}</p>
                      <p className="text-sm mt-2">Real-time messaging enabled 🔗</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <div
                          key={message._id || index}
                          className={`flex ${
                            message.senderType === 'doctor' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              message.senderType === 'doctor'
                                ? message.type === 'prescription' 
                                  ? 'bg-green-500 text-white'
                                  : 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {message.type === 'prescription' && (
                              <div className="flex items-center mb-1">
                                <Pill className="h-3 w-3 mr-1" />
                                <span className="text-xs font-semibold">Prescription</span>
                              </div>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-75 mt-1">
                              {format(new Date(message.timestamp), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 rounded-lg px-4 py-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input with Prescription Button */}
                <div className="p-6 border-t">
                  <div className="space-y-3">
                    {/* Prescription Quick Action */}
                    <div className="flex justify-center">
                      <Button 
                        onClick={sendPrescription} 
                        variant="outline"
                        disabled={!isConnected}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Pill className="h-4 w-4 mr-2" />
                        Send Digital Prescription
                      </Button>
                    </div>

                    {/* Message Input */}
                    <div className="flex space-x-2">
                      <Input
                        placeholder={isConnected ? "Type your message..." : "Connecting..."}
                        value={newMessage}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        disabled={!isConnected}
                        className={isConnected ? "border-green-300" : "border-yellow-300"}
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={!newMessage.trim() || !isConnected}
                        className={isConnected ? "bg-green-500 hover:bg-green-600" : ""}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {isConnected && (
                      <p className="text-xs text-green-600 mt-2 text-center">
                        🔗 Real-time messaging active
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Video Call Tab */}
            {activeCommTab === 'video' && (
              <div className="h-full bg-gray-900 relative">
                {/* Remote Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Local Video */}
                <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Call Status Overlay */}
                {callStatus !== 'connected' && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center">
                    <Card className="w-96">
                      <CardContent className="text-center p-8">
                        <Avatar className="w-24 h-24 mx-auto mb-4">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                            <User className="h-12 w-12" />
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="text-lg font-semibold mb-2">
                          {communicationModal?.patientInfo.firstName} {communicationModal?.patientInfo.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          {communicationModal?.patientInfo.age} years • {communicationModal?.patientInfo.gender}
                        </p>

                        {callStatus === 'idle' && (
                          <Button 
                            onClick={startVideoCall} 
                            disabled={!communicationModal?.patientInfo.isOnline || !isConnected}
                            size="lg"
                          >
                            <Video className="h-5 w-5 mr-2" />
                            Start Video Call
                          </Button>
                        )}

                        {callStatus === 'calling' && (
                          <div className="space-y-4">
                            <div className="animate-pulse">
                              <div className="text-lg">Calling...</div>
                              <div className="text-sm text-muted-foreground">Connecting to {communicationModal?.patientInfo.firstName}</div>
                            </div>
                          </div>
                        )}

                        {callStatus === 'ringing' && currentCall && (
                          <div className="space-y-4">
                            <div className="animate-bounce">
                              <div className="text-lg text-green-600">Incoming Video Call</div>
                              <div className="text-sm text-muted-foreground">{communicationModal?.patientInfo.firstName} is calling you</div>
                            </div>
                            <div className="flex space-x-4 justify-center">
                              <Button onClick={answerCall} className="bg-green-500 hover:bg-green-600">
                                <Video className="h-4 w-4 mr-2" />
                                Answer
                              </Button>
                              <Button onClick={rejectCall} variant="destructive">
                                <PhoneOff className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Call Info & Controls */}
                {isVideoCallActive && callStatus === 'connected' && (
                  <>
                    {/* Call Info */}
                    <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg">
                      <p className="text-sm font-medium">{communicationModal?.patientInfo.firstName}</p>
                      <p className="text-xs">{formatCallDuration(callDuration)}</p>
                    </div>

                    {/* Call Controls */}
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4">
                      <Button
                        variant={isAudioEnabled ? "secondary" : "destructive"}
                        size="lg"
                        onClick={toggleAudio}
                        className="rounded-full w-12 h-12"
                      >
                        {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                      </Button>

                      <Button
                        variant={isVideoEnabled ? "secondary" : "destructive"}
                        size="lg"
                        onClick={toggleVideo}
                        className="rounded-full w-12 h-12"
                      >
                        {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                      </Button>

                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={endCall}
                        className="rounded-full w-12 h-12"
                      >
                        <PhoneOff className="h-5 w-5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Voice Call Tab */}
            {activeCommTab === 'voice' && (
              <div className="h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                <Card className="w-96 bg-white/10 backdrop-blur border-white/20">
                  <CardContent className="text-center p-8">
                    <Avatar className="w-24 h-24 mx-auto mb-6">
                      <AvatarFallback className="bg-white/20 text-white text-2xl">
                        <User className="h-12 w-12" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-white mb-8">
                      <h3 className="text-xl font-bold">
                        {communicationModal?.patientInfo.firstName} {communicationModal?.patientInfo.lastName}
                      </h3>
                      <p className="text-blue-200">{communicationModal?.patientInfo.age} years • {communicationModal?.patientInfo.gender}</p>
                      {isVoiceCallActive && callStatus === 'connected' && (
                        <p className="text-lg mt-4 font-mono">{formatCallDuration(callDuration)}</p>
                      )}
                    </div>

                    {callStatus === 'idle' && (
                      <Button 
                        onClick={startVoiceCall} 
                        disabled={!communicationModal?.patientInfo.isOnline || !isConnected} 
                        size="lg"
                        className="bg-white/20 hover:bg-white/30"
                      >
                        <Phone className="h-5 w-5 mr-2" />
                        Start Voice Call
                      </Button>
                    )}

                    {callStatus === 'calling' && (
                      <div className="space-y-4">
                        <div className="animate-pulse">
                          <div className="text-lg text-white">Calling...</div>
                          <div className="text-sm text-blue-200">Connecting audio...</div>
                        </div>
                      </div>
                    )}

                    {callStatus === 'ringing' && currentCall && (
                      <div className="space-y-6">
                        <div className="animate-bounce">
                          <div className="text-lg text-white">Incoming Voice Call</div>
                        </div>
                        <div className="flex space-x-4 justify-center">
                          <Button onClick={answerCall} className="bg-green-500/80 hover:bg-green-500 rounded-full w-16 h-16">
                            <Phone className="h-6 w-6" />
                          </Button>
                          <Button onClick={rejectCall} className="bg-red-500/80 hover:bg-red-500 rounded-full w-16 h-16">
                            <PhoneOff className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {isVoiceCallActive && callStatus === 'connected' && (
                      <div className="flex space-x-4 justify-center">
                        <Button
                          variant={isAudioEnabled ? "secondary" : "destructive"}
                          size="lg"
                          onClick={toggleAudio}
                          className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/30"
                        >
                          {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                        </Button>

                        <Button
                          variant="destructive"
                          size="lg"
                          onClick={endCall}
                          className="rounded-full w-16 h-16 bg-red-500/80 hover:bg-red-500"
                        >
                          <PhoneOff className="h-6 w-6" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
