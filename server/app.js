const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ================================
// SOCKET.IO CONFIGURATION
// ================================
const io = socketIo(server, {
  cors: {
    origin: [
      // Development URLs
      'http://localhost:5173',      // Vite dev server
      'http://localhost:3000',      // React dev server
      'http://localhost:8080',      // Alternative port
      'http://127.0.0.1:5173',      // Alternative localhost
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      
      // Network IPs
      'http://192.168.1.13:5173',   // Your network IP
      'http://192.168.1.13:3000',
      'http://192.168.1.13:8080',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    allowEIO3: true
  },
  transports: ['websocket', 'polling'],
  upgradeTimeout: 30000,
  pingTimeout: 60000,
  pingInterval: 25000
});

// ================================
// CORS CONFIGURATION - ENHANCED
// ================================
const corsOptions = {
  origin: [
    // Development URLs
    'http://localhost:5173',      // Vite dev server
    'http://localhost:3000',      // React dev server
    'http://localhost:8080',      // Alternative port
    'http://127.0.0.1:5173',      // Alternative localhost
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    
    // Network IPs - NO REGEX (avoiding regex errors)
    'http://192.168.1.13:5173',   // Your network IP
    'http://192.168.1.13:3000',
    'http://192.168.1.13:8080',
    
    // Common local network ranges (specific IPs, not regex)
    'http://192.168.1.1:5173',
    'http://192.168.1.2:5173',
    'http://192.168.1.3:5173',
    'http://192.168.1.4:5173',
    'http://192.168.1.5:5173',
    'http://192.168.1.10:5173',
    'http://192.168.1.11:5173',
    'http://192.168.1.12:5173',
    'http://192.168.1.13:5173',
    'http://192.168.1.14:5173',
    'http://192.168.1.15:5173',
    
    // Add more specific IPs as needed
    'http://10.0.0.1:5173',
    'http://172.16.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Allow-Origin'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// ================================
// IMPORT MODELS (Before Socket Authentication)
// ================================
const Message = require('./models/Message');

// ================================
// SOCKET.IO AUTHENTICATION MIDDLEWARE
// ================================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'curesight_jwt_secret_fallback');
    socket.userId = decoded.userId;
    socket.userType = socket.handshake.auth.userType || decoded.role;
    socket.userData = {
      id: decoded.userId,
      role: decoded.role,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      email: decoded.email
    };
    
    console.log(`✅ Socket authenticated: ${socket.userType} ${socket.userId} (${socket.userData.firstName})`);
    next();
  } catch (error) {
    console.error('❌ Socket authentication failed:', error.message);
    next(new Error('Authentication error'));
  }
});

// ================================
// SOCKET.IO CONNECTION HANDLING
// ================================
const connectedUsers = new Map(); // Track connected users

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.userData.firstName} ${socket.userData.lastName} (${socket.userType} - ${socket.userId})`);
  
  // Store user connection info
  connectedUsers.set(socket.userId, {
    socketId: socket.id,
    userData: socket.userData,
    lastSeen: new Date()
  });

  // Join user to their personal room
  socket.join(socket.userId);
  
  // Join role-based rooms
  socket.join(`${socket.userType}s`); // doctors or patients
  
  // Broadcast user online status
  socket.broadcast.emit('user-online', {
    userId: socket.userId,
    userType: socket.userType,
    userData: socket.userData
  });

  // ================================
  // REAL-TIME CHAT HANDLING (Inside connection scope)
  // ================================
  socket.on('send-message', async ({ to, message }) => {
    console.log(`💬 Real-time message: ${socket.userData.firstName} → ${to}`);
    
    try {
      // Save message to database
      const newMessage = new Message({
        sender: socket.userId,
        recipient: to,
        senderType: socket.userType,
        content: message.content || message.message,
        type: message.type || 'text',
        prescriptionData: message.prescriptionData || null,
        status: 'sent',
        deliveredAt: new Date()
      });

      const savedMessage = await newMessage.save();
      
      // Populate sender info
      await savedMessage.populate('sender', 'firstName lastName role');
      
      console.log('✅ Message saved to database:', savedMessage._id);

      // Enhanced message with real database ID
      const enhancedMessage = {
        ...savedMessage.toObject(),
        senderName: savedMessage.sender.role === 'doctor'
          ? `Dr. ${savedMessage.sender.firstName} ${savedMessage.sender.lastName}`
          : `${savedMessage.sender.firstName} ${savedMessage.sender.lastName}`
      };

      // Send to recipient
      const recipientSocket = connectedUsers.get(to);
      if (recipientSocket) {
        io.to(to).emit('new-message', enhancedMessage);
        
        // Send delivery confirmation
        socket.emit('message-delivered', {
          messageId: savedMessage._id,
          deliveredAt: new Date()
        });
        
        console.log(`✅ Real-time message delivered to ${to}`);
      } else {
        console.log(`⚠️ Recipient ${to} is offline - message saved to database`);
        socket.emit('message-queued', {
          messageId: savedMessage._id,
          queuedAt: new Date(),
          reason: 'Recipient offline'
        });
      }

    } catch (error) {
      console.error('❌ Error in real-time message handling:', error);
      socket.emit('message-error', {
        messageId: message.id,
        error: error.message
      });
    }
  });

  // ================================
  // TYPING INDICATORS (Inside connection scope)
  // ================================
  socket.on('typing', ({ to, isTyping }) => {
    socket.to(to).emit('user-typing', {
      userId: socket.userId,
      userType: socket.userType,
      isTyping
    });
  });

  // ================================
  // MESSAGE READ RECEIPTS (Inside connection scope)
  // ================================
  socket.on('message-read', async ({ messageId, readBy, readAt }) => {
    try {
      await Message.findByIdAndUpdate(messageId, {
        read: true,
        readAt: new Date(readAt),
        status: 'read'
      });

      // Notify sender
      const message = await Message.findById(messageId);
      if (message) {
        io.to(message.sender.toString()).emit('message-read', {
          messageId,
          readBy,
          readAt
        });
      }
    } catch (error) {
      console.error('❌ Error updating message read status:', error);
    }
  });

  // ================================
  // VIDEO CALL SIGNALING
  // ================================
  socket.on('call-request', ({ to, offer, callerInfo }) => {
    console.log(`📹 Video call request: ${socket.userData.firstName} → ${to}`);
    
    const recipientSocket = connectedUsers.get(to);
    if (recipientSocket) {
      io.to(to).emit('call-request', {
        from: socket.userId,
        offer,
        callerInfo: {
          ...callerInfo,
          id: socket.userId,
          name: `${socket.userData.firstName} ${socket.userData.lastName}`,
          role: socket.userType,
          type: 'video'
        }
      });
      console.log(`✅ Video call request sent to ${to}`);
    } else {
      socket.emit('call-failed', {
        reason: 'Recipient offline',
        recipientId: to
      });
    }
  });

  socket.on('call-answer', ({ to, answer }) => {
    console.log(`✅ Video call answered: ${socket.userId} → ${to}`);
    io.to(to).emit('call-answer', { 
      from: socket.userId,
      answer,
      answererInfo: socket.userData
    });
  });

  // ================================
  // VOICE CALL SIGNALING
  // ================================
  socket.on('voice-call-request', ({ to, offer, callerInfo }) => {
    console.log(`📞 Voice call request: ${socket.userData.firstName} → ${to}`);
    
    const recipientSocket = connectedUsers.get(to);
    if (recipientSocket) {
      io.to(to).emit('voice-call-request', {
        from: socket.userId,
        offer,
        callerInfo: {
          ...callerInfo,
          id: socket.userId,
          name: `${socket.userData.firstName} ${socket.userData.lastName}`,
          role: socket.userType,
          type: 'voice'
        }
      });
      console.log(`✅ Voice call request sent to ${to}`);
    } else {
      socket.emit('voice-call-failed', {
        reason: 'Recipient offline',
        recipientId: to
      });
    }
  });

  socket.on('voice-call-answer', ({ to, answer }) => {
    console.log(`✅ Voice call answered: ${socket.userId} → ${to}`);
    io.to(to).emit('voice-call-answer', { 
      from: socket.userId,
      answer,
      answererInfo: socket.userData
    });
  });

  // ================================
  // WebRTC ICE CANDIDATES
  // ================================
  socket.on('ice-candidate', ({ to, candidate }) => {
    console.log(`🧊 ICE candidate: ${socket.userId} → ${to}`);
    io.to(to).emit('ice-candidate', { 
      from: socket.userId,
      candidate 
    });
  });

  // ================================
  // CALL MANAGEMENT
  // ================================
  socket.on('call-ended', ({ to }) => {
    console.log(`📞 Call ended: ${socket.userId} → ${to}`);
    io.to(to).emit('call-ended', { 
      from: socket.userId,
      endedBy: socket.userData
    });
  });

  socket.on('voice-call-ended', ({ to }) => {
    console.log(`📞 Voice call ended: ${socket.userId} → ${to}`);
    io.to(to).emit('voice-call-ended', { 
      from: socket.userId,
      endedBy: socket.userData
    });
  });

  socket.on('call-rejected', ({ to }) => {
    console.log(`❌ Call rejected: ${socket.userId} → ${to}`);
    io.to(to).emit('call-rejected', { 
      from: socket.userId,
      rejectedBy: socket.userData
    });
  });

  // ================================
  // APPOINTMENT REAL-TIME UPDATES
  // ================================
  socket.on('appointment-update', ({ appointmentId, status, to }) => {
    console.log(`📅 Appointment ${appointmentId} updated to: ${status}`);
    
    if (to) {
      io.to(to).emit('appointment-updated', {
        appointmentId,
        status,
        updatedBy: socket.userData,
        timestamp: new Date()
      });
    } else {
      // Broadcast to all doctors/patients
      io.to('doctors').emit('appointment-updated', {
        appointmentId,
        status,
        updatedBy: socket.userData,
        timestamp: new Date()
      });
    }
  });

  // ================================
  // PRESCRIPTION NOTIFICATIONS
  // ================================
  socket.on('prescription-sent', ({ to, prescription }) => {
    console.log(`💊 Prescription sent: ${socket.userId} → ${to}`);
    
    io.to(to).emit('prescription-received', {
      from: socket.userId,
      prescription,
      prescribedBy: socket.userData,
      timestamp: new Date()
    });

    // Also send as chat message
    const prescriptionMessage = {
      id: `prescription_${Date.now()}`,
      senderId: socket.userId,
      senderName: `Dr. ${socket.userData.firstName} ${socket.userData.lastName}`,
      senderType: 'doctor',
      message: `Digital Prescription: ${prescription.medicines?.map(m => m.name).join(', ') || 'New prescription'}`,
      type: 'prescription',
      timestamp: new Date(),
      prescriptionData: prescription
    };

    io.to(to).emit('new-message', prescriptionMessage);
  });

  // ================================
  // CONNECTION STATUS
  // ================================
  socket.on('ping', () => {
    socket.emit('pong');
    if (connectedUsers.has(socket.userId)) {
      connectedUsers.get(socket.userId).lastSeen = new Date();
    }
  });

  socket.on('request-online-users', () => {
    const onlineUsers = Array.from(connectedUsers.values()).map(user => ({
      userId: user.userData.id,
      userType: user.userData.role,
      name: `${user.userData.firstName} ${user.userData.lastName}`,
      lastSeen: user.lastSeen
    }));
    
    socket.emit('online-users-list', onlineUsers);
  });

  // ================================
  // JOIN CHAT ROOM
  // ================================
  socket.on('join-chat', ({ doctorId, patientId }) => {
    const chatRoom = `chat_${[doctorId, patientId].sort().join('_')}`;
    socket.join(chatRoom);
    console.log(`💬 User ${socket.userId} joined chat room: ${chatRoom}`);
  });

  // ================================
  // DISCONNECTION HANDLING
  // ================================
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${socket.userData.firstName} ${socket.userData.lastName} (${reason})`);
    
    // Remove from connected users
    connectedUsers.delete(socket.userId);
    
    // Broadcast user offline status
    socket.broadcast.emit('user-offline', { 
      userId: socket.userId,
      userType: socket.userType,
      userData: socket.userData,
      disconnectedAt: new Date()
    });
  });

  // ================================
  // ERROR HANDLING
  // ================================
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.userId}:`, error);
  });
});

// ================================
// EXPRESS MIDDLEWARE
// ================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 ${timestamp} - ${req.method} ${req.url}`);
  console.log('🌐 Origin:', req.headers.origin || 'No origin');
  console.log('🏠 Host:', req.headers.host);
  console.log('🔗 User-Agent:', req.headers['user-agent']?.substring(0, 50) + '...' || 'Unknown');
  
  if (req.body && Object.keys(req.body).length > 0) {
    // Hide sensitive data
    const logBody = req.url.includes('login') || req.url.includes('signup') 
      ? { ...req.body, password: '[HIDDEN]' }
      : req.body;
    console.log('📦 Body:', JSON.stringify(logBody, null, 2));
  }
  
  next();
});

// ================================
// DATABASE CONNECTION
// ================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/curesight';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
    console.log('📊 Database:', MONGODB_URI.split('/').pop());
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// ================================
// ROUTES
// ================================
// Import and use route modules
const authRoutes = require('./routes/auth');
const doctor = require('./routes/doctor');
const adminRoutes = require('./routes/admin');
const appointmentRoutes = require('./routes/appointment');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patient');
const messageRoutes = require('./routes/messages');
const consultationRoutes = require('./routes/consultation'); // 🔧 ADD THIS LINE
const medicineComparisonRoutes = require('./routes/medicineComparison');

// Apply routes with proper middleware
app.use('/api/auth', authRoutes);
app.use('/api/doctor', doctor);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/auth', doctorRoutes);
app.use('/api/doctor', patientRoutes);
app.use('/api/doctor', messageRoutes);
app.use('/api/consultation', consultationRoutes); // 🔧 ADD THIS LINE
app.use('/api/medicine-comparison', medicineComparisonRoutes);

// ================================
// API ENDPOINTS
// ================================

// Socket.IO status endpoint
app.get('/api/socket-status', (req, res) => {
  const connectedUsersArray = Array.from(connectedUsers.values()).map(user => ({
    userId: user.userData.id,
    name: `${user.userData.firstName} ${user.userData.lastName}`,
    role: user.userData.role,
    lastSeen: user.lastSeen,
    socketId: user.socketId.substring(0, 8) + '...' // Partial socket ID for privacy
  }));

  res.json({
    status: 'active',
    connectedUsers: connectedUsersArray.length,
    users: connectedUsersArray,
    timestamp: new Date().toISOString(),
    features: {
      realTimeChat: true,
      videoCall: true,
      voiceCall: true,
      appointments: true,
      prescriptions: true
    }
  });
});

// API health check
app.get('/api', (req, res) => {
  res.json({
    message: 'CureSight API v2.0.0 - Real-time Enabled 🚀',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    features: {
      socketIO: true,
      realTimeChat: true,
      videoCall: true,
      voiceCall: true,
      webRTC: true
    },
    connectedUsers: connectedUsers.size,
    routes: [
      'POST /api/auth/signup - Patient signup',
      'POST /api/auth/signin - Patient signin', 
      'POST /api/auth/doctor-signup - Doctor signup',
      'POST /api/auth/doctor-signin - Doctor signin',
      'POST /api/admin/login - Admin login',
      'GET  /api/admin/stats - Admin statistics',
      'GET  /api/admin/doctors/pending - Pending doctors',
      'GET  /api/doctor/profile - Doctor profile',
      'GET  /api/socket-status - Real-time status',
      'Socket.IO - ws://localhost:5000 - Real-time communication'
    ]
  });
});

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working properly! ✅',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    socketIO: 'Real-time features enabled 🎥📞💬'
  });
});

// ================================
// ERROR HANDLING
// ================================

// 404 handler
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    suggestion: 'Try /api for API endpoints',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      '/api - API information',
      '/api/socket-status - Real-time status',
      '/api/test-cors - CORS test'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global Error Handler:', error);
  console.error('Stack:', error.stack);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      details: Object.values(error.errors || {}).map(e => e.message)
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID Format',
      message: 'The provided ID is not valid'
    });
  }
  
  if (error.code === 11000) {
    return res.status(400).json({
      error: 'Duplicate Entry',
      message: 'This data already exists'
    });
  }

  res.status(error.status || 500).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'Something went wrong on the server',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error
    })
  });
});

// ================================
// SERVER STARTUP
// ================================
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
  console.log('\n🚀 CureSight API Server Started Successfully!');
  console.log('================================================');
  console.log(`📡 Local:     http://localhost:${PORT}`);
  console.log(`🌐 Network:   http://192.168.1.13:${PORT}`);
  console.log(`🔧 Admin:     http://localhost:${PORT}/api/admin`);
  console.log(`📊 Health:    http://localhost:${PORT}/api`);
  console.log(`⚡ Socket.IO: ws://localhost:${PORT}`);
  console.log(`🔌 Real-time: http://localhost:${PORT}/api/socket-status`);
  console.log('================================================');
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Database: ${MONGODB_URI.split('/').pop()}`);
  console.log(`✅ CORS enabled for frontend on ports 3000, 5173, 8080`);
  console.log(`🎥 WebRTC Video Calls: Enabled`);
  console.log(`📞 WebRTC Voice Calls: Enabled`);
  console.log(`💬 Real-time Chat: Enabled`);
  console.log(`📅 Real-time Appointments: Enabled`);
  console.log(`💊 Real-time Prescriptions: Enabled`);
  console.log('\n📋 Available Endpoints:');
  console.log('   Authentication:');
  console.log('   • POST /api/auth/signup (Patient)');
  console.log('   • POST /api/auth/signin (Patient)');
  console.log('   • POST /api/auth/doctor-signup (Doctor)');
  console.log('   • POST /api/auth/doctor-signin (Doctor)');
  console.log('   Administration:');
  console.log('   • POST /api/admin/login');
  console.log('   • GET  /api/admin/stats');
  console.log('   • GET  /api/admin/doctors/pending');
  console.log('   Doctor Portal:');
  console.log('   • GET  /api/doctor/profile');
  console.log('   • GET  /api/doctor/patients');
  console.log('   • GET  /api/doctor/appointments');
  console.log('   Real-time Features:');
  console.log('   • Socket.IO connection for real-time chat');
  console.log('   • WebRTC signaling for video/voice calls');
  console.log('   • Live appointment updates');
  console.log('   • Real-time prescription notifications');
  console.log('================================================\n');
});

// ================================
// GRACEFUL SHUTDOWN
// ================================
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('🔌 HTTP server closed');
    io.close(() => {
      console.log('📡 Socket.IO server closed');
      mongoose.connection.close(false, () => {
        console.log('📊 MongoDB connection closed');
        process.exit(0);
      });
    });
  });
});

process.on('SIGINT', () => {
  console.log('\n🔄 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('🔌 HTTP server closed');
    io.close(() => {
      console.log('📡 Socket.IO server closed');
      mongoose.connection.close(false, () => {
        console.log('📊 MongoDB connection closed');
        process.exit(0);
      });
    });
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.error('Stack:', err.stack);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

module.exports = { app, server, io };
