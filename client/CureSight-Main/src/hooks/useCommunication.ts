import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CommunicationOptions {
  doctorId?: string;
  patientId?: string;
  onIncomingCall?: (data: any) => void;
  onIncomingMessage?: (data: any) => void;
}

export const useCommunication = (options: CommunicationOptions = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [currentCall, setCurrentCall] = useState<any>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    socketRef.current = io('http://localhost:5000', {
      auth: {
        token: token,
        userType: user.role || 'patient',
        userName: `${user.firstName} ${user.lastName}`
      },
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Communication socket connected');
      setIsConnected(true);
      
      // Join appropriate chat room if provided
      if (options.doctorId || options.patientId) {
        socket.emit('join-chat', {
          doctorId: options.doctorId || user._id,
          patientId: options.patientId || user._id
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Communication socket disconnected');
      setIsConnected(false);
    });

    // Chat events
    socket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
      options.onIncomingMessage?.(message);
      
      // Show notification if not from current user
      if (message.sender !== user._id) {
        toast({
          title: "New Message",
          description: `${message.senderName}: ${message.content}`,
        });
      }
    });

    socket.on('user-typing', ({ userId, isTyping }) => {
      if (userId !== user._id) {
        setIsTyping(isTyping);
      }
    });

    // Video call events
    socket.on('incoming-video-call', (data) => {
      setCallStatus('ringing');
      setCurrentCall({ ...data, type: 'video' });
      options.onIncomingCall?.({ ...data, type: 'video' });
      
      toast({
        title: "Incoming Video Call",
        description: `${data.callerInfo.name} is calling you`,
        duration: 10000,
      });
    });

    socket.on('video-call-accepted', ({ answer }) => {
      handleCallAccepted(answer);
    });

    socket.on('video-call-rejected', ({ reason }) => {
      setCallStatus('ended');
      toast({
        title: "Call Rejected",
        description: reason,
        variant: "destructive"
      });
    });

    socket.on('video-call-ended', () => {
      endCall();
    });

    // Voice call events
    socket.on('incoming-voice-call', (data) => {
      setCallStatus('ringing');
      setCurrentCall({ ...data, type: 'voice' });
      options.onIncomingCall?.({ ...data, type: 'voice' });
      
      toast({
        title: "Incoming Voice Call",
        description: `${data.callerInfo.name} is calling you`,
        duration: 10000,
      });
    });

    socket.on('voice-call-accepted', ({ answer }) => {
      handleCallAccepted(answer);
    });

    socket.on('voice-call-rejected', ({ reason }) => {
      setCallStatus('ended');
      toast({
        title: "Call Rejected",
        description: reason,
        variant: "destructive"
      });
    });

    socket.on('voice-call-ended', () => {
      endCall();
    });

    // ICE candidate handling
    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    // Online users
    socket.on('online-users-list', (users) => {
      setOnlineUsers(users);
    });

    socket.on('user-online', ({ userId }) => {
      setOnlineUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, status: 'online' } : u
      ));
    });

    socket.on('user-offline', ({ userId }) => {
      setOnlineUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, status: 'offline' } : u
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, [user, options.doctorId, options.patientId]);

  // Setup WebRTC peer connection
  const setupPeerConnection = () => {
    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    const pc = peerConnectionRef.current;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          to: currentCall?.caller || options.doctorId || options.patientId,
          candidate: event.candidate,
          callId: currentCall?.callId
        });
      }
    };

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
    };

    return pc;
  };

  // Send message
  const sendMessage = (content: string, type: string = 'text') => {
    if (!socketRef.current || !isConnected) return false;

    const messageData = {
      content,
      type,
      timestamp: new Date().toISOString()
    };

    socketRef.current.emit('send-message', {
      to: options.doctorId || options.patientId,
      message: messageData
    });

    return true;
  };

  // Send typing indicator
  const sendTyping = (isTyping: boolean) => {
    if (!socketRef.current || !isConnected) return;

    socketRef.current.emit('typing', {
      to: options.doctorId || options.patientId,
      isTyping
    });
  };

  // Start video call
  const startVideoCall = async (targetUserId: string) => {
    try {
      setCallStatus('calling');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      const pc = setupPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('video-call-request', {
        to: targetUserId,
        offer,
        callerInfo: {
          id: user?._id,
          name: `${user?.firstName} ${user?.lastName}`,
          type: 'video'
        }
      });

      return stream;
    } catch (error) {
      console.error('Error starting video call:', error);
      setCallStatus('ended');
      throw error;
    }
  };

  // Start voice call
  const startVoiceCall = async (targetUserId: string) => {
    try {
      setCallStatus('calling');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });

      localStreamRef.current = stream;
      const pc = setupPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('voice-call-request', {
        to: targetUserId,
        offer,
        callerInfo: {
          id: user?._id,
          name: `${user?.firstName} ${user?.lastName}`,
          type: 'voice'
        }
      });

      return stream;
    } catch (error) {
      console.error('Error starting voice call:', error);
      setCallStatus('ended');
      throw error;
    }
  };

  // Answer call
  const answerCall = async (callData: any) => {
    try {
      setCallStatus('connected');
      setCurrentCall(callData);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: callData.type === 'video',
        audio: true
      });

      localStreamRef.current = stream;
      const pc = setupPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(callData.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit(`${callData.type}-call-answer`, {
        callId: callData.callId,
        answer
      });

      return stream;
    } catch (error) {
      console.error('Error answering call:', error);
      rejectCall(callData.callId, 'Failed to answer call');
      throw error;
    }
  };

  // Reject call
  const rejectCall = (callId: string, reason?: string) => {
    if (!socketRef.current) return;

    const callType = currentCall?.type || 'video';
    socketRef.current.emit(`${callType}-call-reject`, {
      callId,
      reason: reason || 'Call rejected'
    });

    setCallStatus('ended');
    setCurrentCall(null);
  };

  // End call
  const endCall = () => {
    if (currentCall && socketRef.current) {
      const callType = currentCall.type || 'video';
      socketRef.current.emit(`${callType}-call-end`, {
        callId: currentCall.callId
      });
    }

    // Clean up streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setCallStatus('ended');
    setCurrentCall(null);
    remoteStreamRef.current = null;
  };

  // Handle call accepted
  const handleCallAccepted = async (answer: RTCSessionDescriptionInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(answer);
        setCallStatus('connected');
      }
    } catch (error) {
      console.error('Error handling call accepted:', error);
    }
  };

  return {
    // Connection state
    isConnected,
    onlineUsers,
    
    // Chat features
    messages,
    isTyping,
    sendMessage,
    sendTyping,
    
    // Call features
    callStatus,
    currentCall,
    startVideoCall,
    startVoiceCall,
    answerCall,
    rejectCall,
    endCall,
    
    // Media streams
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current
  };
};
