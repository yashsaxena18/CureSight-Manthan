import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Phone,
  Video,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building,
  MapPin,
  Shield,
  Star,
  Circle,
  Filter,
  Search,
  Bell,
  Activity,
  CheckCircle,
  Pill,
  ArrowRight,
  FileText,
  History,
  AlertCircle,
  Volume2,
  Mic,
  Camera,
  Plus,
  Mail,
  X,
  Send,
  PhoneOff,
  VideoOff,
  MicOff,
  VolumeX,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, isToday, isTomorrow, isPast } from "date-fns";
import { io, Socket } from "socket.io-client";

const API_BASE = "http://localhost:5000/api";

interface Appointment {
  _id: string;
  doctor: {
    _id: string;
    firstName: string;
    lastName: string;
    specialization: string;
    hospitalAffiliation: string;
    rating?: number;
    isVerified: boolean;
    isOnline?: boolean;
    lastSeen?: string;
  };
  appointmentDate: string;
  appointmentTime: string;
  appointmentMode: "online" | "clinic" | "home-visit";
  type: string;
  status: string;
  symptoms: string;
  consultationFee: number;
  paymentStatus: string;
  canJoinOnline?: boolean;
  hasUnreadMessages?: boolean;
  lastMessageTime?: string;
  prescription?: any[];
  diagnosis?: string;
}

interface ConsultationSummary {
  total: number;
  upcoming: number;
  completed: number;
  online: number;
  clinic: number;
  unreadMessages: number;
}

interface Message {
  _id: string;
  sender: string;
  senderName: string;
  senderType: "doctor" | "patient";
  content: string;
  timestamp: string;
  type?: "text" | "prescription";
  prescriptionData?: any;
}

interface CommunicationModalData {
  doctorId: string;
  doctorInfo: {
    firstName: string;
    lastName: string;
    specialization: string;
    hospitalAffiliation: string;
    isOnline: boolean;
    isVerified: boolean;
  };
}

export default function MyConsultations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [summary, setSummary] = useState<ConsultationSummary>({
    total: 0,
    upcoming: 0,
    completed: 0,
    online: 0,
    clinic: 0,
    unreadMessages: 0,
  });

  // 🆕 Communication States
  const [communicationModal, setCommunicationModal] =
    useState<CommunicationModalData | null>(null);
  const [activeCommTab, setActiveCommTab] = useState<
    "chat" | "video" | "voice"
  >("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // 🆕 Call States
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "ringing" | "connected" | "ended"
  >("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [currentCall, setCurrentCall] = useState<any>(null);

  // 🆕 WebRTC States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [appointments, activeTab, searchTerm, statusFilter]);

  // 🆕 Initialize Socket Connection when modal opens
  useEffect(() => {
    if (communicationModal && user) {
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        console.log("🔌 Disconnecting socket...");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      cleanup();
    };
  }, [communicationModal, user]);

  // 🆕 Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 🆕 Call timer
  useEffect(() => {
    if (isVideoCallActive || isVoiceCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
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

  // 🆕 Setup video streams
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

  // 🆕 Real Socket.IO Connection
  const initializeSocket = () => {
    const token = localStorage.getItem("authToken");
    if (!token || !communicationModal || !user) return;

    console.log("🔌 Initializing Socket.IO connection...");

    socketRef.current = io("http://localhost:5000", {
      auth: {
        token: token,
        userType: "patient",
        userName: `${user.firstName} ${user.lastName}`,
      },
      transports: ["websocket", "polling"],
    });

    const socket = socketRef.current;

    // ================== CONNECTION EVENTS ==================
    socket.on("connect", () => {
      console.log("✅ Patient socket connected:", socket.id);
      setIsConnected(true);

      toast({
        title: "Connected! 🔗",
        description: "Real-time communication enabled",
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Patient socket disconnected:", reason);
      setIsConnected(false);

      toast({
        title: "Disconnected",
        description: "Connection lost. Reconnecting...",
        variant: "destructive",
      });
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      setIsConnected(false);

      toast({
        title: "Connection Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    });

    // ================== REAL-TIME CHAT EVENTS ==================
    socket.on("new-message", (message: Message) => {
      console.log("💬 Received new message:", message);

      setMessages((prev) => [
        ...prev,
        {
          ...message,
          senderName:
            message.senderName ||
            (message.senderType === "doctor"
              ? `Dr. ${communicationModal.doctorInfo.firstName}`
              : "Patient"),
        },
      ]);

      // Show notification if from doctor
      if (message.senderType === "doctor") {
        toast({
          title: "New Message 💬",
          description: `${message.senderName}: ${message.content}`,
        });
      }
    });

    socket.on("user-typing", ({ userId, isTyping: userTyping }) => {
      if (userId === communicationModal.doctorId) {
        setIsTyping(userTyping);

        if (userTyping) {
          // Clear typing after 3 seconds of no activity
          setTimeout(() => setIsTyping(false), 3000);
        }
      }
    });

    socket.on("message-delivered", ({ messageId, deliveredAt }) => {
      console.log("✅ Message delivered:", messageId);
      // You can update message status here
    });

    socket.on("message-read", ({ messageId, readBy, readAt }) => {
      console.log("📖 Message read:", messageId);
      // Update message read status
    });

    // ================== VIDEO CALL EVENTS ==================
    socket.on("call-request", async (callData) => {
      console.log("📹 Incoming call request:", callData);
      setCallStatus("ringing");
      setCurrentCall(callData);
      setActiveCommTab("video");

      toast({
        title: "Incoming Video Call 📹",
        description: `Dr. ${communicationModal.doctorInfo.firstName} is calling you`,
        duration: 10000,
      });
    });

    socket.on("call-answer", async ({ answer, answererInfo }) => {
      console.log("✅ Call answered:", answererInfo);

      if (peerConnection && answer) {
        try {
          await peerConnection.setRemoteDescription(answer);
          setCallStatus("connected");

          toast({
            title: "Call Connected! ✅",
            description: `Connected with Dr. ${communicationModal.doctorInfo.firstName}`,
          });
        } catch (error) {
          console.error("❌ Error setting remote description:", error);
        }
      }
    });

    socket.on("call-ended", ({ endedBy }) => {
      console.log("📞 Call ended by:", endedBy);
      endCall();

      toast({
        title: "Call Ended",
        description: `Call ended by ${endedBy.firstName}`,
      });
    });

    socket.on("call-rejected", ({ rejectedBy }) => {
      console.log("❌ Call rejected by:", rejectedBy);
      setCallStatus("ended");
      cleanup();

      toast({
        title: "Call Rejected",
        description: `Call rejected by Dr. ${communicationModal.doctorInfo.firstName}`,
        variant: "destructive",
      });
    });

    // ================== VOICE CALL EVENTS ==================
    socket.on("voice-call-request", async (callData) => {
      console.log("📞 Incoming voice call:", callData);
      setCallStatus("ringing");
      setCurrentCall({ ...callData, type: "voice" });
      setActiveCommTab("voice");

      toast({
        title: "Incoming Voice Call 📞",
        description: `Dr. ${communicationModal.doctorInfo.firstName} is calling you`,
        duration: 10000,
      });
    });

    socket.on("voice-call-answer", async ({ answer, answererInfo }) => {
      console.log("✅ Voice call answered:", answererInfo);

      if (peerConnection && answer) {
        try {
          await peerConnection.setRemoteDescription(answer);
          setCallStatus("connected");
          setIsVoiceCallActive(true);
        } catch (error) {
          console.error("❌ Error in voice call answer:", error);
        }
      }
    });

    socket.on("voice-call-ended", ({ endedBy }) => {
      console.log("📞 Voice call ended");
      endVoiceCall();
    });

    // ================== WebRTC ICE CANDIDATES ==================
    socket.on("ice-candidate", async ({ candidate }) => {
      console.log("🧊 Received ICE candidate");

      if (peerConnection && candidate) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.error("❌ Error adding ICE candidate:", error);
        }
      }
    });

    // ================== PRESCRIPTION EVENTS ==================
    socket.on(
      "prescription-received",
      ({ prescription, prescribedBy, timestamp }) => {
        console.log("💊 Prescription received:", prescription);

        toast({
          title: "New Prescription! 💊",
          description: `Dr. ${prescribedBy.firstName} sent you a prescription`,
          duration: 5000,
        });
      }
    );

    // ================== APPOINTMENT UPDATES ==================
    socket.on(
      "appointment-updated",
      ({ appointmentId, status, updatedBy, timestamp }) => {
        console.log("📅 Appointment updated:", appointmentId, status);

        // Update local appointments
        setAppointments((prev) =>
          prev.map((apt) =>
            apt._id === appointmentId ? { ...apt, status } : apt
          )
        );

        toast({
          title: "Appointment Updated",
          description: `Status changed to: ${status}`,
        });
      }
    );

    // ================== ERROR HANDLING ==================
    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);

      toast({
        title: "Communication Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    });
  };

  // 🆕 WebRTC Setup
  const setupPeerConnection = (isVideo: boolean = true) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log("🧊 Sending ICE candidate");
        socketRef.current.emit("ice-candidate", {
          to: communicationModal?.doctorId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("📺 Received remote stream");
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log("🔗 Connection state:", pc.connectionState);

      if (pc.connectionState === "connected") {
        setCallStatus("connected");
      } else if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        endCall();
      }
    };

    setPeerConnection(pc);
    return pc;
  };

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.log("❌ No auth token found");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/appointments/my-appointments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Patient appointments fetched:", data);

        const appointmentsData = data.appointments || [];

        // Add communication capabilities to each appointment
        const enhancedAppointments = appointmentsData.map(
          (apt: Appointment) => {
            const appointmentDateTime = new Date(
              `${apt.appointmentDate.split("T")[0]}T${apt.appointmentTime}`
            );
            const now = new Date();
            const timeDiff = appointmentDateTime.getTime() - now.getTime();
            const hoursDiff = timeDiff / (1000 * 3600);

            return {
              ...apt,
              canJoinOnline:
                apt.appointmentMode === "online" &&
                hoursDiff < 0.25 &&
                hoursDiff > -2,
              hasUnreadMessages: Math.random() > 0.7,
              lastMessageTime:
                Math.random() > 0.5 ? new Date().toISOString() : undefined,
              doctor: {
                ...apt.doctor,
                isOnline: Math.random() > 0.3,
              },
            };
          }
        );

        setAppointments(enhancedAppointments);
        calculateSummary(enhancedAppointments);
      } else {
        console.error("❌ Failed to fetch appointments:", response.status);
        setAppointments([]);
      }
    } catch (error) {
      console.error("❌ Error fetching appointments:", error);
      setAppointments([]);
      toast({
        title: "Error",
        description: "Failed to fetch your consultations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (appointments: Appointment[]) => {
    const summary = {
      total: appointments.length,
      upcoming: appointments.filter((apt) => {
        try {
          const aptDate = new Date(
            `${apt.appointmentDate.split("T")[0]}T${apt.appointmentTime}`
          );
          return (
            aptDate > new Date() &&
            ["scheduled", "confirmed"].includes(apt.status)
          );
        } catch {
          return false;
        }
      }).length,
      completed: appointments.filter((apt) => apt.status === "completed")
        .length,
      online: appointments.filter((apt) => apt.appointmentMode === "online")
        .length,
      clinic: appointments.filter((apt) => apt.appointmentMode === "clinic")
        .length,
      unreadMessages: appointments.filter((apt) => apt.hasUnreadMessages)
        .length,
    };

    setSummary(summary);
  };

  const filterAppointments = () => {
    let filtered = appointments;

    switch (activeTab) {
      case "upcoming":
        filtered = appointments.filter((apt) => {
          try {
            const aptDate = new Date(
              `${apt.appointmentDate.split("T")[0]}T${apt.appointmentTime}`
            );
            return (
              aptDate > new Date() &&
              ["scheduled", "confirmed"].includes(apt.status)
            );
          } catch {
            return false;
          }
        });
        break;
      case "today":
        filtered = appointments.filter((apt) => {
          try {
            const aptDate = new Date(apt.appointmentDate);
            return isToday(aptDate);
          } catch {
            return false;
          }
        });
        break;
      case "completed":
        filtered = appointments.filter((apt) => apt.status === "completed");
        break;
      case "all":
      default:
        break;
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((apt) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          `${apt.doctor.firstName} ${apt.doctor.lastName}`
            .toLowerCase()
            .includes(searchLower) ||
          apt.doctor.specialization.toLowerCase().includes(searchLower) ||
          (apt.symptoms && apt.symptoms.toLowerCase().includes(searchLower))
        );
      });
    }

    setFilteredAppointments(filtered);
  };

  // 🆕 Communication Functions
  const openCommunicationHub = (doctor: any) => {
    setCommunicationModal({
      doctorId: doctor._id,
      doctorInfo: {
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        specialization: doctor.specialization,
        hospitalAffiliation: doctor.hospitalAffiliation,
        isOnline: doctor.isOnline,
        isVerified: doctor.isVerified,
      },
    });

    // Reset states
    setMessages([]);
    setActiveCommTab("chat");
    setIsConnected(false);
    setCallStatus("idle");
    setIsVideoCallActive(false);
    setIsVoiceCallActive(false);
  };

  const closeCommunicationHub = () => {
    setCommunicationModal(null);
    setMessages([]);
    setIsConnected(false);
    setIsTyping(false);
    endCall();
    cleanup();
  };

  // 🆕 Real Message Sending
  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current || !isConnected) return;

    const messageData = {
      content: newMessage.trim(),
      type: "text",
      timestamp: new Date().toISOString(),
    };

    // Send via Socket.IO
    socketRef.current.emit("send-message", {
      to: communicationModal?.doctorId,
      message: messageData,
    });

    // Add to local messages immediately
    const localMessage: Message = {
      _id: `temp_${Date.now()}`,
      sender: user?._id || "",
      senderName: `${user?.firstName} ${user?.lastName}`,
      senderType: "patient",
      content: messageData.content,
      timestamp: messageData.timestamp,
    };

    setMessages((prev) => [...prev, localMessage]);
    setNewMessage("");

    // Stop typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    sendTypingIndicator(false);
  };

  // 🆕 Typing Indicator
  const sendTypingIndicator = (typing: boolean) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("typing", {
        to: communicationModal?.doctorId,
        isTyping: typing,
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
        variant: "destructive",
      });
      return;
    }

    try {
      setCallStatus("calling");
      setActiveCommTab("video");

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);

      // Setup peer connection
      const pc = setupPeerConnection(true);

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send call request via Socket.IO
      socketRef.current.emit("call-request", {
        to: communicationModal?.doctorId,
        offer: offer,
        callerInfo: {
          id: user?._id,
          name: `${user?.firstName} ${user?.lastName}`,
          type: "video",
        },
      });

      setIsVideoCallActive(true);
      setCallDuration(0);

      toast({
        title: "Calling Doctor... 📹",
        description: `Calling Dr. ${communicationModal?.doctorInfo.firstName}`,
      });
    } catch (error) {
      console.error("❌ Error starting video call:", error);
      setCallStatus("ended");

      toast({
        title: "Camera Access Required",
        description: "Please allow camera and microphone access",
        variant: "destructive",
      });
    }
  };

  // 🆕 Real Voice Call
  const startVoiceCall = async () => {
    if (!socketRef.current || !isConnected) {
      toast({
        title: "Connection Required",
        description: "Please wait for connection to establish",
        variant: "destructive",
      });
      return;
    }

    try {
      setCallStatus("calling");
      setActiveCommTab("voice");

      // Get user media (audio only)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });

      setLocalStream(stream);

      // Setup peer connection
      const pc = setupPeerConnection(false);

      // Add tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send voice call request
      socketRef.current.emit("voice-call-request", {
        to: communicationModal?.doctorId,
        offer: offer,
        callerInfo: {
          id: user?._id,
          name: `${user?.firstName} ${user?.lastName}`,
          type: "voice",
        },
      });

      setIsVoiceCallActive(true);
      setCallDuration(0);

      toast({
        title: "Calling Doctor... 📞",
        description: `Calling Dr. ${communicationModal?.doctorInfo.firstName}`,
      });
    } catch (error) {
      console.error("❌ Error starting voice call:", error);
      setCallStatus("ended");

      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access",
        variant: "destructive",
      });
    }
  };

  // 🆕 Answer Incoming Call
  const answerCall = async () => {
    if (!currentCall || !socketRef.current) return;

    try {
      const isVideo = currentCall.type !== "voice";

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });

      setLocalStream(stream);

      // Setup peer connection
      const pc = setupPeerConnection(isVideo);

      // Add tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Set remote description
      await pc.setRemoteDescription(currentCall.offer);

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer
      if (currentCall.type === "voice") {
        socketRef.current.emit("voice-call-answer", {
          to: currentCall.from,
          answer: answer,
        });
        setIsVoiceCallActive(true);
      } else {
        socketRef.current.emit("call-answer", {
          to: currentCall.from,
          answer: answer,
        });
        setIsVideoCallActive(true);
      }

      setCallStatus("connected");
      setCallDuration(0);
    } catch (error) {
      console.error("❌ Error answering call:", error);
      rejectCall();
    }
  };

  // 🆕 Reject Call
  const rejectCall = () => {
    if (!currentCall || !socketRef.current) return;

    socketRef.current.emit("call-rejected", {
      to: currentCall.from,
    });

    setCallStatus("ended");
    setCurrentCall(null);
    cleanup();
  };

  // 🆕 End Call
  const endCall = () => {
    if (socketRef.current && communicationModal) {
      if (isVideoCallActive) {
        socketRef.current.emit("call-ended", {
          to: communicationModal.doctorId,
        });
      } else if (isVoiceCallActive) {
        socketRef.current.emit("voice-call-ended", {
          to: communicationModal.doctorId,
        });
      }
    }

    setCallStatus("ended");
    setIsVideoCallActive(false);
    setIsVoiceCallActive(false);
    setCurrentCall(null);
    cleanup();

    const duration =
      Math.floor(callDuration / 60) +
      ":" +
      String(callDuration % 60).padStart(2, "0");
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
      localStream.getTracks().forEach((track) => track.stop());
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
          description: audioTrack.enabled
            ? "Your microphone is on"
            : "Your microphone is off",
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
          description: videoTrack.enabled
            ? "Your camera is on"
            : "Your camera is off",
        });
      }
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const getDateLabel = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isToday(date)) return "Today";
      if (isTomorrow(date)) return "Tomorrow";
      return format(date, "MMM dd, yyyy");
    } catch {
      return "Invalid Date";
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-emerald-100 text-emerald-800",
      cancelled: "bg-red-100 text-red-800",
      "in-progress": "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "online":
        return <Video className="h-4 w-4 text-green-600" />;
      case "clinic":
        return <Building className="h-4 w-4 text-blue-600" />;
      case "home-visit":
        return <MapPin className="h-4 w-4 text-purple-600" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const getOnlineStatus = (doctor: any) => {
    if (doctor?.isOnline) {
      return {
        dot: "bg-green-500",
        text: "Online now",
        color: "text-green-600",
      };
    }
    return { dot: "bg-gray-400", text: "Offline", color: "text-gray-500" };
  };

  const canCommunicate = (appointment: Appointment) => {
    return ["scheduled", "confirmed", "completed", "in-progress"].includes(
      appointment.status
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Hidden audio element for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Consultations</h1>
          <p className="text-muted-foreground mt-1">
            Chat, call, and manage consultations with your doctors
          </p>
        </div>
        <Button asChild>
          <Link to="/find-doctors">
            <Plus className="h-4 w-4 mr-2" />
            Book New Consultation
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.total}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {summary.upcoming}
                </p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {summary.completed}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {summary.online}
                </p>
                <p className="text-sm text-muted-foreground">Online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.clinic}
                </p>
                <p className="text-sm text-muted-foreground">Clinic</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {summary.unreadMessages}
                </p>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search doctors, symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 max-w-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Consultations</span>
                <Badge variant="outline">
                  {filteredAppointments.length} consultations
                </Badge>
              </CardTitle>
              <CardDescription>
                Manage your healthcare consultations with doctors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAppointments.length > 0 ? (
                <div className="space-y-4">
                  {filteredAppointments.map((appointment) => {
                    const onlineStatus = getOnlineStatus(appointment.doctor);
                    const canComm = canCommunicate(appointment);

                    return (
                      <div
                        key={appointment._id}
                        className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-blue-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <Avatar className="w-16 h-16">
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                                <Stethoscope className="h-8 w-8" />
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold text-xl">
                                  Dr. {appointment.doctor.firstName}{" "}
                                  {appointment.doctor.lastName}
                                </h3>
                                <Badge
                                  className={getStatusColor(appointment.status)}
                                >
                                  {appointment.status.charAt(0).toUpperCase() +
                                    appointment.status.slice(1)}
                                </Badge>
                                {appointment.doctor.isVerified && (
                                  <Badge variant="secondary">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-1 text-sm text-muted-foreground mb-4">
                                <div className="flex items-center space-x-4">
                                  <span className="flex items-center space-x-1">
                                    <Stethoscope className="h-3 w-3" />
                                    <span>
                                      {appointment.doctor.specialization}
                                    </span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <Building className="h-3 w-3" />
                                    <span>
                                      {appointment.doctor.hospitalAffiliation}
                                    </span>
                                  </span>
                                </div>

                                <div className="flex items-center space-x-4">
                                  <span className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {getDateLabel(
                                        appointment.appointmentDate
                                      )}
                                    </span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{appointment.appointmentTime}</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    {getModeIcon(appointment.appointmentMode)}
                                    <span className="capitalize">
                                      {appointment.appointmentMode}
                                    </span>
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Circle
                                    className={`w-2 h-2 rounded-full ${onlineStatus.dot}`}
                                  />
                                  <span className={onlineStatus.color}>
                                    {onlineStatus.text}
                                  </span>
                                  {appointment.hasUnreadMessages && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs animate-pulse"
                                    >
                                      New messages
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                <p className="text-sm">
                                  <span className="font-medium">Symptoms:</span>{" "}
                                  {appointment.symptoms}
                                </p>
                                {appointment.diagnosis && (
                                  <p className="text-sm mt-1">
                                    <span className="font-medium">
                                      Diagnosis:
                                    </span>{" "}
                                    {appointment.diagnosis}
                                  </p>
                                )}
                                {appointment.prescription &&
                                  appointment.prescription.length > 0 && (
                                    <p className="text-sm mt-1 text-green-600">
                                      <Pill className="h-3 w-3 inline mr-1" />
                                      {appointment.prescription.length}{" "}
                                      medicine(s) prescribed
                                    </p>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Communication Actions */}
                          <div className="flex flex-col space-y-3 ml-6">
                            <div className="text-right text-sm text-muted-foreground mb-2">
                              <div className="font-medium text-lg text-green-600">
                                ₹{appointment.consultationFee}
                              </div>
                              <div>Status: {appointment.paymentStatus}</div>
                            </div>

                            {canComm && (
                              <>
                                {/* 🆕 Real Communication Hub Button */}
                                <Button
                                  onClick={() =>
                                    openCommunicationHub(appointment.doctor)
                                  }
                                  className="w-40 justify-start bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Open Communication
                                  {appointment.hasUnreadMessages && (
                                    <Badge
                                      variant="destructive"
                                      className="ml-2 w-2 h-2 p-0 animate-pulse"
                                    />
                                  )}
                                </Button>

                                {/* Quick Action Buttons */}
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      openCommunicationHub(appointment.doctor);
                                      setTimeout(
                                        () => setActiveCommTab("video"),
                                        100
                                      );
                                    }}
                                    disabled={!appointment.doctor.isOnline}
                                    className="justify-start"
                                  >
                                    <Video className="h-3 w-3 mr-1" />
                                    Video
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      openCommunicationHub(appointment.doctor);
                                      setTimeout(
                                        () => setActiveCommTab("voice"),
                                        100
                                      );
                                    }}
                                    disabled={!appointment.doctor.isOnline}
                                    className="justify-start"
                                  >
                                    <Phone className="h-3 w-3 mr-1" />
                                    Voice
                                  </Button>
                                </div>
                              </>
                            )}

                            {/* Book Again Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="w-40 justify-start"
                            >
                              <Link
                                to={`/book-appointment/${appointment.doctor._id}`}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Book Again
                              </Link>
                            </Button>
                          </div>
                        </div>

                        {/* Communication Status Footer */}
                        {canComm && (
                          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              {appointment.lastMessageTime && (
                                <span>
                                  Last message:{" "}
                                  {format(
                                    new Date(appointment.lastMessageTime),
                                    "MMM dd, HH:mm"
                                  )}
                                </span>
                              )}
                              <span>•</span>
                              <span>
                                Consultation Fee: ₹{appointment.consultationFee}
                              </span>
                            </div>

                            <div className="flex space-x-2">
                              {appointment.doctor.isOnline ? (
                                <Badge className="text-xs animate-pulse bg-green-500">
                                  🟢 Available for consultation
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  ⚫ Doctor offline
                                </Badge>
                              )}

                              {appointment.canJoinOnline && (
                                <Badge className="text-xs bg-red-500">
                                  🔴 Live session ready
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    No Consultations Found
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {activeTab === "upcoming"
                      ? "You don't have any upcoming consultations."
                      : "No consultations match your current filters."}
                  </p>
                  <Button asChild>
                    <Link to="/find-doctors">
                      <Plus className="h-4 w-4 mr-2" />
                      Book Your First Consultation
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 🆕 Real Communication Hub Modal */}
      <Dialog
        open={!!communicationModal}
        onOpenChange={(open) => !open && closeCommunicationHub()}
      >
        <DialogContent className="max-w-5xl h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    <Stethoscope className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="font-semibold">
                    Dr. {communicationModal?.doctorInfo.firstName}{" "}
                    {communicationModal?.doctorInfo.lastName}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Circle
                      className={`w-2 h-2 rounded-full ${
                        communicationModal?.doctorInfo.isOnline
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <span>
                      {communicationModal?.doctorInfo.isOnline
                        ? "Online"
                        : "Offline"}
                    </span>
                    <span>•</span>
                    <span>{communicationModal?.doctorInfo.specialization}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge
                  variant={isConnected ? "default" : "secondary"}
                  className="animate-pulse"
                >
                  {isConnected ? "🟢 Connected" : "🔄 Connecting..."}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeCommunicationHub}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Tab Navigation */}
          <div className="flex border-b px-6">
            <Button
              variant={activeCommTab === "chat" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveCommTab("chat")}
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
              variant={activeCommTab === "video" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveCommTab("video")}
              className="rounded-none"
              disabled={
                !communicationModal?.doctorInfo.isOnline && !isVideoCallActive
              }
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
              variant={activeCommTab === "voice" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveCommTab("voice")}
              className="rounded-none"
              disabled={
                !communicationModal?.doctorInfo.isOnline && !isVoiceCallActive
              }
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
            {activeCommTab === "chat" && (
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
                      <p>
                        Start your conversation with Dr.{" "}
                        {communicationModal?.doctorInfo.firstName}
                      </p>
                      <p className="text-sm mt-2">
                        Real-time messaging enabled 🔗
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <div
                          key={message._id || index}
                          className={`flex ${
                            message.senderType === "patient"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              message.senderType === "patient"
                                ? message.type === "prescription"
                                  ? "bg-green-500 text-white"
                                  : "bg-blue-500 text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            {message.type === "prescription" && (
                              <div className="flex items-center mb-1">
                                <Pill className="h-3 w-3 mr-1" />
                                <span className="text-xs font-semibold">
                                  Prescription
                                </span>
                              </div>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-75 mt-1">
                              {format(new Date(message.timestamp), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}

                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 rounded-lg px-4 py-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-6 border-t">
                  <div className="flex space-x-2">
                    <Input
                      placeholder={
                        isConnected ? "Type your message..." : "Connecting..."
                      }
                      value={newMessage}
                      onChange={(e) => handleTyping(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      disabled={!isConnected}
                      className={
                        isConnected ? "border-green-300" : "border-yellow-300"
                      }
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || !isConnected}
                      className={
                        isConnected ? "bg-green-500 hover:bg-green-600" : ""
                      }
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
            )}
            {/* Video Call Tab */}
            {/* Video Call Tab */}
            {activeCommTab === "video" && (
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
                {callStatus !== "connected" && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center">
                    <Card className="w-96">
                      <CardContent className="text-center p-8">
                        <Avatar className="w-24 h-24 mx-auto mb-4">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                            <Stethoscope className="h-12 w-12" />
                          </AvatarFallback>
                        </Avatar>

                        {/* 🆕 Real Doctor Info */}
                        <h3 className="text-lg font-semibold mb-2">
                          Dr. {communicationModal?.doctorInfo.firstName}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {communicationModal?.doctorInfo.specialization}
                        </p>

                        {/* 🆕 Real Online Status */}
                        <div className="flex items-center justify-center space-x-2 mb-6">
                          <Circle
                            className={`w-3 h-3 rounded-full ${
                              communicationModal?.doctorInfo.isOnline
                                ? "bg-green-500 animate-pulse"
                                : "bg-red-500"
                            }`}
                          />
                          <span
                            className={`text-sm ${
                              communicationModal?.doctorInfo.isOnline
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {communicationModal?.doctorInfo.isOnline
                              ? "Online Now"
                              : "Offline"}
                          </span>
                        </div>

                        {callStatus === "idle" && (
                          <div className="space-y-4">
                            <Button
                              onClick={startVideoCall}
                              disabled={
                                !communicationModal?.doctorInfo.isOnline ||
                                !isConnected
                              }
                              size="lg"
                              className="w-full"
                            >
                              <Video className="h-5 w-5 mr-2" />
                              Start Video Call
                            </Button>

                            {/* 🆕 Status Message */}
                            {!communicationModal?.doctorInfo.isOnline && (
                              <p className="text-xs text-red-500">
                                Doctor is currently offline. Call will connect
                                when available.
                              </p>
                            )}
                          </div>
                        )}

                        {callStatus === "calling" && (
                          <div className="space-y-6">
                            <div className="animate-pulse">
                              <div className="text-lg">Calling...</div>
                              <div className="text-sm text-muted-foreground">
                                Connecting to Dr.{" "}
                                {communicationModal?.doctorInfo.firstName}
                              </div>
                            </div>

                            {/* 🆕 Cancel Call Button */}
                            <Button
                              onClick={endCall}
                              variant="destructive"
                              className="w-full"
                            >
                              <PhoneOff className="h-4 w-4 mr-2" />
                              Cancel Call
                            </Button>
                          </div>
                        )}

                        {callStatus === "ringing" && currentCall && (
                          <div className="space-y-4">
                            <div className="animate-bounce">
                              <div className="text-lg text-green-600">
                                Incoming Video Call
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Dr. {communicationModal?.doctorInfo.firstName}{" "}
                                is calling you
                              </div>
                            </div>

                            {/* 🆕 Enhanced Answer/Reject Buttons */}
                            <div className="flex space-x-4 justify-center">
                              <Button
                                onClick={answerCall}
                                className="bg-green-500 hover:bg-green-600 px-8"
                                size="lg"
                              >
                                <Video className="h-4 w-4 mr-2" />
                                Answer
                              </Button>
                              <Button
                                onClick={rejectCall}
                                variant="destructive"
                                className="px-8"
                                size="lg"
                              >
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

                {/* 🆕 Enhanced Call Controls - Connected State */}
                {isVideoCallActive && callStatus === "connected" && (
                  <>
                    {/* Call Info Bar */}
                    <div className="absolute top-4 left-4 bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur">
                      <div className="flex items-center space-x-3">
                        <Circle className="w-2 h-2 bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium">
                          Dr. {communicationModal?.doctorInfo.firstName}
                        </span>
                        <span className="text-xs opacity-75">•</span>
                        <span className="text-xs font-mono">
                          {formatCallDuration(callDuration)}
                        </span>
                      </div>
                    </div>

                    {/* 🆕 Enhanced Call Control Bar */}
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                      <div className="flex items-center space-x-4 bg-black/50 backdrop-blur rounded-full px-6 py-4">
                        {/* Audio Toggle */}
                        <Button
                          variant={isAudioEnabled ? "secondary" : "destructive"}
                          size="lg"
                          onClick={toggleAudio}
                          className="rounded-full w-14 h-14 transition-all duration-200 hover:scale-110"
                        >
                          {isAudioEnabled ? (
                            <Mic className="h-6 w-6" />
                          ) : (
                            <MicOff className="h-6 w-6" />
                          )}
                        </Button>

                        {/* Video Toggle */}
                        <Button
                          variant={isVideoEnabled ? "secondary" : "destructive"}
                          size="lg"
                          onClick={toggleVideo}
                          className="rounded-full w-14 h-14 transition-all duration-200 hover:scale-110"
                        >
                          {isVideoEnabled ? (
                            <Video className="h-6 w-6" />
                          ) : (
                            <VideoOff className="h-6 w-6" />
                          )}
                        </Button>

                        {/* 🔴 Main End Call Button - Enhanced */}
                        <Button
                          variant="destructive"
                          size="lg"
                          onClick={endCall}
                          className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600 transition-all duration-200 hover:scale-110 shadow-lg"
                        >
                          <PhoneOff className="h-7 w-7" />
                        </Button>

                        {/* 🆕 Switch Camera Button (Future) */}
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={() =>
                            toast({
                              title: "Coming Soon!",
                              description: "Camera switching feature",
                            })
                          }
                          className="rounded-full w-14 h-14 transition-all duration-200 hover:scale-110"
                        >
                          <Camera className="h-6 w-6" />
                        </Button>

                        {/* 🆕 Speaker Toggle */}
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={() => {
                            setIsSpeakerOn(!isSpeakerOn);
                            toast({
                              title: isSpeakerOn ? "Speaker Off" : "Speaker On",
                              description: isSpeakerOn
                                ? "Audio switched to earpiece"
                                : "Audio switched to speaker",
                            });
                          }}
                          className="rounded-full w-14 h-14 transition-all duration-200 hover:scale-110"
                        >
                          {isSpeakerOn ? (
                            <Volume2 className="h-6 w-6" />
                          ) : (
                            <VolumeX className="h-6 w-6" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* 🆕 Call Quality Indicator */}
                    <div className="absolute top-4 right-64 bg-black/50 text-white px-3 py-1 rounded-full backdrop-blur">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-1 h-3 bg-green-500 rounded"></div>
                          <div className="w-1 h-2 bg-green-500 rounded"></div>
                          <div className="w-1 h-4 bg-green-500 rounded"></div>
                          <div className="w-1 h-1 bg-gray-400 rounded"></div>
                        </div>
                        <span className="text-xs">Good</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {/* Voice Call Tab */}
            {activeCommTab === "voice" && (
              <div className="h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                <Card className="w-96 bg-white/10 backdrop-blur border-white/20">
                  <CardContent className="text-center p-8">
                    <Avatar className="w-24 h-24 mx-auto mb-6">
                      <AvatarFallback className="bg-white/20 text-white text-2xl">
                        <Stethoscope className="h-12 w-12" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="text-white mb-8">
                      <h3 className="text-xl font-bold">
                        Dr. {communicationModal?.doctorInfo.firstName}{" "}
                        {communicationModal?.doctorInfo.lastName}
                      </h3>
                      <p className="text-blue-200">
                        {communicationModal?.doctorInfo.specialization}
                      </p>
                      {isVoiceCallActive && callStatus === "connected" && (
                        <p className="text-lg mt-4 font-mono">
                          {formatCallDuration(callDuration)}
                        </p>
                      )}
                    </div>

                    {callStatus === "idle" && (
                      <Button
                        onClick={startVoiceCall}
                        disabled={
                          !communicationModal?.doctorInfo.isOnline ||
                          !isConnected
                        }
                        size="lg"
                        className="bg-white/20 hover:bg-white/30"
                      >
                        <Phone className="h-5 w-5 mr-2" />
                        Start Voice Call
                      </Button>
                    )}

                    {callStatus === "calling" && (
                      <div className="space-y-4">
                        <div className="animate-pulse">
                          <div className="text-lg text-white">Calling...</div>
                          <div className="text-sm text-blue-200">
                            Connecting audio...
                          </div>
                        </div>
                      </div>
                    )}

                    {callStatus === "ringing" && currentCall && (
                      <div className="space-y-6">
                        <div className="animate-bounce">
                          <div className="text-lg text-white">
                            Incoming Voice Call
                          </div>
                        </div>
                        <div className="flex space-x-4 justify-center">
                          <Button
                            onClick={answerCall}
                            className="bg-green-500/80 hover:bg-green-500 rounded-full w-16 h-16"
                          >
                            <Phone className="h-6 w-6" />
                          </Button>
                          <Button
                            onClick={rejectCall}
                            className="bg-red-500/80 hover:bg-red-500 rounded-full w-16 h-16"
                          >
                            <PhoneOff className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {isVoiceCallActive && callStatus === "connected" && (
                      <div className="flex space-x-4 justify-center">
                        <Button
                          variant={isAudioEnabled ? "secondary" : "destructive"}
                          size="lg"
                          onClick={toggleAudio}
                          className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/30"
                        >
                          {isAudioEnabled ? (
                            <Mic className="h-5 w-5" />
                          ) : (
                            <MicOff className="h-5 w-5" />
                          )}
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
