import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, Paperclip, Image, Video, Phone, MessageSquare,
  User, Clock, Check, CheckCheck, Pill, Stethoscope,
  ArrowLeft, FileText, MoreVertical, AlertCircle, Smile,
  Building, Shield, Star, Circle, Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';

const API_BASE = 'http://localhost:5000/api';

interface Message {
  _id: string;
  sender: string;
  recipient: string;
  senderType: 'doctor' | 'patient';
  content: string;
  type: 'text' | 'image' | 'file' | 'prescription';
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  senderName?: string;
  delivered?: boolean;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  prescriptionData?: {
    medicines: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }>;
    notes?: string;
    followUpDate?: string;
  };
}

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization: string;
  hospitalAffiliation: string;
  experience?: number;
  consultationFee?: number;
  rating?: number;
  isVerified: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  profileImage?: string;
}

export default function PatientChat() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (doctorId && user) {
      initializeSocket();
      fetchDoctorInfo();
      fetchChatHistory();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [doctorId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = () => {
    const token = localStorage.getItem('authToken');

    socketRef.current = io('http://localhost:5000', {
      auth: {
        token: token,
        userId: user?._id,
        userType: 'patient'
      },
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Patient chat socket connected');
      setConnectionStatus('connected');
      setIsOnline(true);
      
      // Join chat room with doctor
      socket.emit('join-chat', {
        doctorId: doctorId,
        patientId: user?._id
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Patient chat socket disconnected');
      setConnectionStatus('disconnected');
      setIsOnline(false);
    });

    socket.on('reconnect', () => {
      console.log('🔄 Patient chat socket reconnected');
      setConnectionStatus('connected');
      setIsOnline(true);
      fetchChatHistory(); // Sync messages on reconnect
    });

    // Real-time message events
    socket.on('new-message', (message: Message) => {
      console.log('💬 New message received:', message);
      
      setMessages(prev => {
        // Avoid duplicates
        const exists = prev.find(m => m._id === message._id);
        if (exists) return prev;
        
        return [...prev, message];
      });
      
      // Mark as read if from doctor and chat is active
      if (message.senderType === 'doctor' && message.sender === doctorId) {
        markMessageAsRead(message._id);
        
        // Show notification
        toast({
          title: `Dr. ${doctor?.firstName || 'Doctor'}`,
          description: message.type === 'prescription' 
            ? "📋 New prescription received"
            : message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
        });

        // Special handling for prescriptions
        if (message.type === 'prescription') {
          toast({
            title: "New Prescription! 💊",
            description: "Your doctor has sent you a digital prescription.",
            duration: 5000,
          });
        }
      }
    });

    socket.on('message-delivered', (data: any) => {
      console.log('✅ Message delivered:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, delivered: true }
          : msg
      ));
    });

    socket.on('message-read', (data: any) => {
      console.log('👀 Message read by doctor:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, read: true, readAt: data.readAt }
          : msg
      ));
    });

    socket.on('user-typing', (data: any) => {
      if (data.userId === doctorId && data.userType === 'doctor') {
        setIsTyping(data.isTyping);
        
        if (data.isTyping) {
          // Auto hide typing indicator after 5 seconds
          setTimeout(() => setIsTyping(false), 5000);
        }
      }
    });

    socket.on('user-online', (data: any) => {
      if (data.userId === doctorId) {
        setDoctor(prev => prev ? { ...prev, isOnline: true } : null);
      }
    });

    socket.on('user-offline', (data: any) => {
      if (data.userId === doctorId) {
        setDoctor(prev => prev ? { 
          ...prev, 
          isOnline: false, 
          lastSeen: data.disconnectedAt 
        } : null);
      }
    });

    // Prescription specific events
    socket.on('prescription-received', ({ prescription, prescribedBy }) => {
      console.log('💊 Prescription received:', prescription);
      
      toast({
        title: "New Prescription Received! 💊",
        description: `Dr. ${prescribedBy.firstName} has sent you a prescription.`,
        duration: 6000,
      });
      
      // Refresh messages to ensure prescription is displayed
      setTimeout(() => fetchChatHistory(), 1000);
    });

    // Error handling
    socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
      toast({
        title: "Connection Error",
        description: "Chat connection issue. Trying to reconnect...",
        variant: "destructive"
      });
    });

    socket.on('message-error', (data: any) => {
      console.error('❌ Message error:', data);
      toast({
        title: "Message Failed",
        description: data.error || "Failed to send message",
        variant: "destructive"
      });
      setSending(false);
    });
  };

  const fetchDoctorInfo = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/appointments/doctor/profile/${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Doctor info fetched:', data);
        setDoctor(data.doctor);
      } else {
        throw new Error('Failed to fetch doctor info');
      }
    } catch (error) {
      console.error('❌ Error fetching doctor info:', error);
      toast({
        title: "Error",
        description: "Failed to load doctor information",
        variant: "destructive"
      });
    }
  };

  const fetchChatHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Try multiple endpoints for chat history
      const endpoints = [
        `${API_BASE}/messages/conversation/${doctorId}`,
        `${API_BASE}/patient/messages/${doctorId}`,
        `${API_BASE}/appointments/messages/${doctorId}`
      ];

      let messagesData = [];
      let success = false;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Chat history fetched from ${endpoint}:`, data);
            messagesData = data.messages || data || [];
            success = true;
            break;
          }
        } catch (endpointError) {
          console.log(`⚠️ Endpoint ${endpoint} failed:`, endpointError);
        }
      }

      if (!success) {
        console.log('⚠️ No chat history endpoints available, starting fresh');
        messagesData = [];
      }

      setMessages(messagesData);

      // Count unread messages from doctor
      const unreadFromDoctor = messagesData.filter(
        (msg: Message) => msg.senderType === 'doctor' && !msg.read
      ).length;
      setUnreadCount(unreadFromDoctor);

    } catch (error) {
      console.error('❌ Error fetching chat history:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !socketRef.current) return;
    
    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Create optimistic message for immediate UI update
      const optimisticMessage: Message = {
        _id: `temp_${Date.now()}`,
        sender: user?._id || '',
        recipient: doctorId || '',
        senderType: 'patient',
        content: messageContent,
        type: 'text',
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        senderName: `${user?.firstName} ${user?.lastName}`,
        delivered: false
      };

      // Add to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);

      // Send via Socket.IO for real-time
      socketRef.current.emit('send-message', {
        to: doctorId,
        message: {
          content: messageContent,
          type: 'text',
          timestamp: new Date().toISOString()
        }
      });

      // Also try to save to database via API
      const token = localStorage.getItem('authToken');
      const saveEndpoints = [
        `${API_BASE}/messages`,
        `${API_BASE}/patient/messages`,
        `${API_BASE}/appointments/messages`
      ];

      let saved = false;
      for (const endpoint of saveEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              recipient: doctorId,
              content: messageContent,
              type: 'text'
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Message saved to database:', data);
            
            // Replace optimistic message with real one
            setMessages(prev => prev.map(msg => 
              msg._id === optimisticMessage._id 
                ? { ...data.message, senderName: optimisticMessage.senderName }
                : msg
            ));
            saved = true;
            break;
          }
        } catch (endpointError) {
          console.log(`⚠️ Save endpoint ${endpoint} failed:`, endpointError);
        }
      }

      if (!saved) {
        console.log('⚠️ Could not save to database, relying on real-time only');
        // Update optimistic message to show as sent
        setMessages(prev => prev.map(msg => 
          msg._id === optimisticMessage._id 
            ? { ...msg, delivered: true }
            : msg
        ));
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
      
      toast({
        title: "Failed to Send",
        description: "Message could not be sent. Please try again.",
        variant: "destructive"
      });
      
      // Restore message text
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      // Try multiple endpoints to mark as read
      const token = localStorage.getItem('authToken');
      const readEndpoints = [
        `${API_BASE}/messages/${messageId}/read`,
        `${API_BASE}/patient/messages/${messageId}/read`
      ];

      for (const endpoint of readEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            console.log('✅ Message marked as read');
            break;
          }
        } catch (endpointError) {
          console.log(`⚠️ Read endpoint ${endpoint} failed:`, endpointError);
        }
      }

      // Notify via socket
      if (socketRef.current) {
        socketRef.current.emit('message-read', {
          messageId,
          readBy: user?._id,
          readAt: new Date().toISOString()
        });
      }

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, read: true, readAt: new Date().toISOString() }
          : msg
      ));

    } catch (error) {
      console.error('❌ Error marking message as read:', error);
    }
  };

  const handleTyping = (message: string) => {
    setNewMessage(message);
    
    if (socketRef.current) {
      socketRef.current.emit('typing', {
        to: doctorId,
        isTyping: message.length > 0
      });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing indicator after 3 seconds of no activity
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing', {
          to: doctorId,
          isTyping: false
        });
      }, 3000);
    }
  };

  const startVideoCall = () => {
    if (socketRef.current && doctor) {
      toast({
        title: "Starting Video Call...",
        description: "Connecting with your doctor.",
      });

      navigate(`/patient/video-call/${doctorId}`);
    }
  };

  const startVoiceCall = () => {
    if (socketRef.current && doctor) {
      toast({
        title: "Starting Voice Call...",
        description: "Connecting with your doctor.",
      });

      navigate(`/patient/voice-call/${doctorId}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    // For now, show a message that file upload is coming soon
    toast({
      title: "File Upload",
      description: "File sharing feature coming soon!",
    });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd, yyyy');
    }
  };

  const getOnlineStatus = () => {
    if (doctor?.isOnline) {
      return { text: 'Online', color: 'text-green-600', dot: 'bg-green-500' };
    } else if (doctor?.lastSeen) {
      const lastSeen = new Date(doctor.lastSeen);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
      
      if (diffMinutes < 5) {
        return { text: 'Just now', color: 'text-gray-600', dot: 'bg-gray-400' };
      } else if (diffMinutes < 60) {
        return { text: `${diffMinutes}m ago`, color: 'text-gray-600', dot: 'bg-gray-400' };
      } else {
        return { text: format(lastSeen, 'MMM dd'), color: 'text-gray-600', dot: 'bg-gray-400' };
      }
    } else {
      return { text: 'Offline', color: 'text-gray-600', dot: 'bg-gray-400' };
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading chat with your doctor...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Setting up secure connection...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Doctor Not Found</h3>
            <p className="text-muted-foreground mb-4">
              Unable to load doctor information for chat.
            </p>
            <Button onClick={() => navigate('/my-appointments')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onlineStatus = getOnlineStatus();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left side - Doctor info */}
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/my-appointments')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-blue-100 text-blue-600">
                <Stethoscope className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h2 className="font-semibold text-lg">
                Dr. {doctor.firstName} {doctor.lastName}
              </h2>
              <div className="flex items-center space-x-3">
                <p className="text-sm text-blue-600">{doctor.specialization}</p>
                {doctor.isVerified && (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className={`flex items-center space-x-1 text-xs ${onlineStatus.color}`}>
                <Circle className={`w-2 h-2 rounded-full ${onlineStatus.dot}`} />
                <span>{onlineStatus.text}</span>
                {connectionStatus !== 'connected' && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Reconnecting...
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Right side - Action buttons */}
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isOnline ? "default" : "secondary"} 
              className="text-xs"
            >
              {isOnline ? '🔴 Live' : 'Offline'}
            </Badge>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={startVoiceCall}
              disabled={!isOnline}
              title="Start Voice Call"
            >
              <Phone className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={startVideoCall}
              disabled={!isOnline}
              title="Start Video Call"
            >
              <Video className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link to={`/book-appointment/${doctorId}`}>
                <FileText className="h-4 w-4 mr-1" />
                Book Again
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !loading ? (
          <div className="text-center py-16">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Start Your Consultation</h3>
            <p className="text-muted-foreground mb-4">
              Send a message to start chatting with Dr. {doctor.firstName}.
            </p>
            <div className="flex justify-center space-x-2">
              <Button onClick={startVideoCall} disabled={!isOnline}>
                <Video className="h-4 w-4 mr-2" />
                Video Call
              </Button>
              <Button variant="outline" onClick={startVoiceCall} disabled={!isOnline}>
                <Phone className="h-4 w-4 mr-2" />
                Voice Call
              </Button>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const showDate = index === 0 || 
              formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt);
              
            return (
              <div key={message._id}>
                {showDate && (
                  <div className="flex justify-center mb-4">
                    <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                )}
                
                <div className={`flex ${message.senderType === 'patient' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    message.senderType === 'patient'
                      ? 'bg-blue-500 text-white'
                      : message.type === 'prescription'
                      ? 'bg-green-50 text-green-800 border-2 border-green-200'
                      : 'bg-white text-gray-800 border shadow-sm'
                  }`}>
                    {/* Prescription Header */}
                    {message.type === 'prescription' && (
                      <div className="flex items-center mb-2 pb-2 border-b border-green-300">
                        <Pill className="h-4 w-4 mr-2 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                          Digital Prescription
                        </span>
                      </div>
                    )}
                    
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    
                    {/* Prescription Details */}
                    {message.prescriptionData && (
                      <div className="mt-3 pt-3 border-t border-green-300 space-y-2">
                        {message.prescriptionData.medicines.map((med, medIndex) => (
                          <div key={medIndex} className="bg-green-100 p-2 rounded text-xs">
                            <div className="font-bold text-green-800">{med.name}</div>
                            <div className="text-green-700">
                              <span className="font-medium">Dosage:</span> {med.dosage}
                            </div>
                            <div className="text-green-700">
                              <span className="font-medium">Frequency:</span> {med.frequency}
                            </div>
                            <div className="text-green-700">
                              <span className="font-medium">Duration:</span> {med.duration}
                            </div>
                            {med.instructions && (
                              <div className="text-green-700 italic mt-1">
                                {med.instructions}
                              </div>
                            )}
                          </div>
                        ))}
                        {message.prescriptionData.notes && (
                          <div className="text-xs text-green-700 italic">
                            <strong>Notes:</strong> {message.prescriptionData.notes}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Message Footer */}
                    <div className={`flex items-center justify-between mt-2 text-xs ${
                      message.senderType === 'patient' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span>{formatTime(message.createdAt)}</span>
                      {message.senderType === 'patient' && (
                        <div className="flex items-center ml-2">
                          {message.read ? (
                            <CheckCheck className="h-3 w-3" title="Read by doctor" />
                          ) : message.delivered ? (
                            <Check className="h-3 w-3" title="Delivered" />
                          ) : (
                            <Clock className="h-3 w-3" title="Sending..." />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-lg px-4 py-3 max-w-xs shadow-sm">
              <div className="flex space-x-1 items-center">
                <Avatar className="w-6 h-6 mr-2">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                    <Stethoscope className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-500">
                  Dr. {doctor.firstName} is typing
                </span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t p-4 shadow-sm">
        <div className="flex items-center space-x-3">
          {/* File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx"
          />
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isOnline}
            title="Attach File"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isOnline}
            title="Send Image"
          >
            <Image className="h-4 w-4" />
          </Button>
          
          {/* Message Input Field */}
          <div className="flex-1 flex space-x-2">
            <Input
              ref={messageInputRef}
              placeholder={
                isOnline 
                  ? `Message Dr. ${doctor.firstName}...` 
                  : "Reconnecting..."
              }
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={!isOnline || sending}
            />
            
            <Button 
              variant="outline" 
              size="sm"
              disabled={!isOnline}
              title="Add Emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
            
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || !isOnline || sending}
              size="default"
              className="px-6"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Chat Footer */}
        <div className="text-xs text-center text-muted-foreground mt-2 space-x-2">
          <span>{messages.length} messages</span>
          <span>•</span>
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? '🔴 Live chat active' : '⚫ Connecting...'}
          </span>
          <span>•</span>
          <span>Secure end-to-end communication</span>
          {unreadCount > 0 && (
            <>
              <span>•</span>
              <span className="text-blue-600 font-medium">
                {unreadCount} unread
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
