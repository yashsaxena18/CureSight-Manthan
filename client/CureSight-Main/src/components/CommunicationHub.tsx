import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, Phone, Video, PhoneOff, 
  Mic, MicOff, VideoOff, Volume2, VolumeX,
  Send, User, Stethoscope, Circle, X
} from 'lucide-react';
import { useCommunication } from '@/hooks/useCommunication';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CommunicationHubProps {
  targetUserId: string;
  targetUserInfo: {
    firstName: string;
    lastName: string;
    specialization?: string;
    hospitalAffiliation?: string;
    isOnline?: boolean;
  };
  targetUserType: 'doctor' | 'patient';
  onClose?: () => void;
}

export const CommunicationHub: React.FC<CommunicationHubProps> = ({
  targetUserId,
  targetUserInfo,
  targetUserType,
  onClose
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'chat' | 'video' | 'voice'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Communication options based on user type
  const communicationOptions = {
    [targetUserType === 'doctor' ? 'doctorId' : 'patientId']: targetUserId,
    onIncomingCall: (callData: any) => {
      toast({
        title: `Incoming ${callData.type === 'video' ? 'Video' : 'Voice'} Call`,
        description: `${callData.callerInfo.name} is calling you`,
        duration: 15000,
      });
      setActiveTab(callData.type);
    },
    onIncomingMessage: (message: any) => {
      // Auto-scroll to bottom on new message
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const {
    isConnected,
    messages,
    isTyping,
    sendMessage,
    sendTyping,
    callStatus,
    currentCall,
    startVideoCall,
    startVoiceCall,
    answerCall,
    rejectCall,
    endCall,
    localStream,
    remoteStream
  } = useCommunication(communicationOptions);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup video streams
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

  // Handle message sending
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const success = sendMessage(newMessage.trim());
    if (success) {
      setNewMessage('');
    } else {
      toast({
        title: "Failed to send message",
        description: "Please check your connection",
        variant: "destructive"
      });
    }
  };

  // Handle typing
  const handleTyping = (value: string) => {
    setNewMessage(value);
    sendTyping(value.length > 0);
  };

  // Media controls
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerOn ? 0.5 : 1.0;
    }
  };

  // Start calls
  const handleStartVideoCall = async () => {
    setActiveTab('video');
    try {
      await startVideoCall(targetUserId);
    } catch (error) {
      toast({
        title: "Failed to start video call",
        description: "Please check your camera and microphone",
        variant: "destructive"
      });
    }
  };

  const handleStartVoiceCall = async () => {
    setActiveTab('voice');
    try {
      await startVoiceCall(targetUserId);
    } catch (error) {
      toast({
        title: "Failed to start voice call",
        description: "Please check your microphone",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Hidden audio element for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {targetUserType === 'doctor' ? (
                <Stethoscope className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="font-semibold">
              {targetUserType === 'doctor' ? 'Dr. ' : ''}
              {targetUserInfo.firstName} {targetUserInfo.lastName}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Circle className={`w-2 h-2 rounded-full ${
                targetUserInfo.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span>{targetUserInfo.isOnline ? 'Online' : 'Offline'}</span>
              {targetUserInfo.specialization && (
                <>
                  <span>•</span>
                  <span>{targetUserInfo.specialization}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Badge>
          
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        <Button
          variant={activeTab === 'chat' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('chat')}
          className="rounded-none"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat
        </Button>
        
        <Button
          variant={activeTab === 'video' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('video')}
          className="rounded-none"
          disabled={!targetUserInfo.isOnline}
        >
          <Video className="h-4 w-4 mr-2" />
          Video Call
        </Button>
        
        <Button
          variant={activeTab === 'voice' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('voice')}
          className="rounded-none"
          disabled={!targetUserInfo.isOnline}
        >
          <Phone className="h-4 w-4 mr-2" />
          Voice Call
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start your conversation</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={message._id || index}
                    className={`flex ${
                      message.sender === user?._id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.sender === user?._id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {format(new Date(message.timestamp), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              
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
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={!isConnected}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || !isConnected}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Video Call Tab */}
        {activeTab === 'video' && (
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
              <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center">
                <Card className="w-80">
                  <CardHeader>
                    <CardTitle className="text-center">
                      {callStatus === 'calling' && 'Calling...'}
                      {callStatus === 'ringing' && 'Incoming Call'}
                      {callStatus === 'idle' && 'Video Call'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    {callStatus === 'idle' && (
                      <Button onClick={handleStartVideoCall} disabled={!targetUserInfo.isOnline}>
                        <Video className="h-4 w-4 mr-2" />
                        Start Video Call
                      </Button>
                    )}
                    
                    {callStatus === 'ringing' && currentCall && (
                      <div className="space-y-4">
                        <p>Incoming video call from {currentCall.callerInfo.name}</p>
                        <div className="flex space-x-2 justify-center">
                          <Button onClick={() => answerCall(currentCall)} className="bg-green-500">
                            <Video className="h-4 w-4 mr-2" />
                            Answer
                          </Button>
                          <Button onClick={() => rejectCall(currentCall.callId)} variant="destructive">
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

            {/* Call Controls */}
            {callStatus === 'connected' && (
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
            )}
          </div>
        )}

        {/* Voice Call Tab */}
        {activeTab === 'voice' && (
          <div className="h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
            <Card className="w-80 bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="text-center">
                <CardTitle className="text-white">
                  {callStatus === 'calling' && 'Calling...'}
                  {callStatus === 'ringing' && 'Incoming Call'}
                  {callStatus === 'connected' && 'Voice Call'}
                  {callStatus === 'idle' && 'Voice Call'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarFallback className="bg-white/20 text-white text-2xl">
                    {targetUserType === 'doctor' ? (
                      <Stethoscope className="h-12 w-12" />
                    ) : (
                      <User className="h-12 w-12" />
                    )}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-white">
                  <h3 className="text-xl font-bold">
                    {targetUserType === 'doctor' ? 'Dr. ' : ''}
                    {targetUserInfo.firstName} {targetUserInfo.lastName}
                  </h3>
                  {targetUserInfo.specialization && (
                    <p className="text-blue-200">{targetUserInfo.specialization}</p>
                  )}
                </div>

                {callStatus === 'idle' && (
                  <Button onClick={handleStartVoiceCall} disabled={!targetUserInfo.isOnline} size="lg">
                    <Phone className="h-5 w-5 mr-2" />
                    Start Voice Call
                  </Button>
                )}
                
                {callStatus === 'ringing' && currentCall && (
                  <div className="space-y-4">
                    <p className="text-white">Incoming voice call</p>
                    <div className="flex space-x-4 justify-center">
                      <Button onClick={() => answerCall(currentCall)} className="bg-green-500 rounded-full w-16 h-16">
                        <Phone className="h-6 w-6" />
                      </Button>
                      <Button onClick={() => rejectCall(currentCall.callId)} variant="destructive" className="rounded-full w-16 h-16">
                        <PhoneOff className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                )}

                {callStatus === 'connected' && (
                  <div className="flex space-x-4 justify-center">
                    <Button
                      variant={isAudioEnabled ? "secondary" : "destructive"}
                      size="lg"
                      onClick={toggleAudio}
                      className="rounded-full w-12 h-12"
                    >
                      {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </Button>

                    <Button
                      variant={isSpeakerOn ? "default" : "secondary"}
                      size="lg"
                      onClick={toggleSpeaker}
                      className="rounded-full w-12 h-12"
                    >
                      {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </Button>

                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={endCall}
                      className="rounded-full w-16 h-16"
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
    </div>
  );
};
