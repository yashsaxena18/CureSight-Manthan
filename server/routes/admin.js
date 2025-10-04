const express = require('express');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
// const Appointment = require('../models/Appointment'); // COMMENTED OUT - Add later when model is ready
const jwt = require('jsonwebtoken');

const router = express.Router();

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'curesight_jwt_secret_fallback');
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required'
      });
    }

    const admin = await Admin.findById(decoded.userId).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Admin not found or inactive'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('❌ Admin auth middleware error:', error);
    res.status(401).json({
      error: 'Invalid token',
      message: 'Token verification failed'
    });
  }
};

// Check specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.admin.adminLevel === 'super_admin' || req.admin.permissions.includes(permission)) {
      next();
    } else {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `${permission} permission required`
      });
    }
  };
};

// ================================
// ADMIN AUTHENTICATION
// ================================

// Admin Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  console.log('\n🔐 ADMIN LOGIN REQUEST');
  console.log('Email:', req.body.email);
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    console.log('🔍 Looking for admin:', email);
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      console.log('❌ Admin not found:', email);
      return res.status(400).json({
        error: 'Invalid credentials',
        message: 'Admin not found'
      });
    }

    console.log('✅ Admin found:', admin.fullName);

    if (admin.isLocked) {
      console.log('🔒 Account is locked:', email);
      return res.status(423).json({
        error: 'Account locked',
        message: 'Account is temporarily locked'
      });
    }

    console.log('🔑 Checking password...');
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for admin:', email);
      return res.status(400).json({
        error: 'Invalid credentials',
        message: 'Incorrect password'
      });
    }

    console.log('✅ Password valid, updating login info...');

    // Update last login
    admin.lastLogin = new Date();
    admin.loginAttempts = 0;
    await admin.save();

    // Generate token
    const token = jwt.sign(
      { 
        userId: admin._id,
        email: admin.email,
        role: 'admin',
        adminLevel: admin.adminLevel
      },
      process.env.JWT_SECRET || 'curesight_jwt_secret_fallback',
      { expiresIn: '8h' }
    );

    console.log('🔑 JWT token generated');

    const responseData = {
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        fullName: admin.fullName,
        role: 'admin',
        adminLevel: admin.adminLevel,
        permissions: admin.permissions,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    };

    console.log('📤 Sending success response');
    res.json(responseData);

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Please try again later',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================================
// DOCTOR VERIFICATION MANAGEMENT
// ================================

// Get Pending Doctor Verifications
router.get('/doctors/pending', authenticateAdmin, requirePermission('verify_doctors'), async (req, res) => {
  console.log('\n👨‍⚕️ GET PENDING DOCTORS REQUEST');
  console.log('Admin:', req.admin.fullName);
  
  try {
    const { page = 1, limit = 20 } = req.query;

    const pendingDoctors = await Doctor.find({
      verificationStatus: { $in: ['pending', 'in_review'] }
    })
    .select('-password -loginAttempts -lockUntil')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Doctor.countDocuments({
      verificationStatus: { $in: ['pending', 'in_review'] }
    });

    console.log('📋 Found pending doctors:', pendingDoctors.length);

    res.json({
      success: true,
      doctors: pendingDoctors,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('❌ Get pending doctors error:', error);
    res.status(500).json({
      error: 'Unable to fetch pending doctors',
      message: 'Please try again later'
    });
  }
});

// Get Doctor Details for Verification
router.get('/doctors/:doctorId', authenticateAdmin, requirePermission('verify_doctors'), async (req, res) => {
  console.log('\n🔍 GET DOCTOR DETAILS REQUEST');
  console.log('Admin:', req.admin.fullName);
  console.log('Doctor ID:', req.params.doctorId);
  
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId)
      .select('-password -loginAttempts -lockUntil');

    if (!doctor) {
      console.log('❌ Doctor not found:', doctorId);
      return res.status(404).json({
        error: 'Doctor not found',
        message: 'No doctor found with this ID'
      });
    }

    console.log('✅ Doctor details found:', doctor.fullName);

    res.json({
      success: true,
      doctor
    });
  } catch (error) {
    console.error('❌ Get doctor details error:', error);
    res.status(500).json({
      error: 'Unable to fetch doctor details',
      message: 'Please try again later'
    });
  }
});

// Approve Doctor Verification
router.post('/doctors/:doctorId/approve', authenticateAdmin, requirePermission('verify_doctors'), [
  body('notes').optional().isLength({ max: 500 })
], async (req, res) => {
  console.log('\n✅ APPROVE DOCTOR REQUEST');
  console.log('Admin:', req.admin.fullName);
  console.log('Doctor ID:', req.params.doctorId);
  
  try {
    const { doctorId } = req.params;
    const { notes } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      console.log('❌ Doctor not found:', doctorId);
      return res.status(404).json({
        error: 'Doctor not found',
        message: 'No doctor found with this ID'
      });
    }

    console.log('👨‍⚕️ Approving doctor:', doctor.fullName);

    // Update doctor verification status
    doctor.isVerified = true;
    doctor.verificationStatus = 'verified';
    doctor.verificationNotes = notes || 'Approved by admin';
    doctor.verifiedAt = new Date();
    doctor.verifiedBy = req.admin._id;

    await doctor.save();

    console.log(`✅ Doctor ${doctor.email} approved by admin ${req.admin.email}`);

    res.json({
      success: true,
      message: 'Doctor verification approved successfully',
      doctor: {
        id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        isVerified: doctor.isVerified,
        verificationStatus: doctor.verificationStatus
      }
    });
  } catch (error) {
    console.error('❌ Approve doctor error:', error);
    res.status(500).json({
      error: 'Unable to approve doctor',
      message: 'Please try again later'
    });
  }
});

// Reject Doctor Verification
router.post('/doctors/:doctorId/reject', authenticateAdmin, requirePermission('verify_doctors'), [
  body('reason').notEmpty().withMessage('Rejection reason required'),
  body('notes').optional().isLength({ max: 500 })
], async (req, res) => {
  console.log('\n❌ REJECT DOCTOR REQUEST');
  console.log('Admin:', req.admin.fullName);
  console.log('Doctor ID:', req.params.doctorId);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { doctorId } = req.params;
    const { reason, notes } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        error: 'Doctor not found',
        message: 'No doctor found with this ID'
      });
    }

    console.log('👨‍⚕️ Rejecting doctor:', doctor.fullName, 'Reason:', reason);

    // Update doctor verification status
    doctor.isVerified = false;
    doctor.verificationStatus = 'rejected';
    doctor.verificationNotes = `Rejected: ${reason}. ${notes || ''}`;
    doctor.rejectedAt = new Date();
    doctor.rejectedBy = req.admin._id;

    await doctor.save();

    console.log(`❌ Doctor ${doctor.email} rejected by admin ${req.admin.email}`);

    res.json({
      success: true,
      message: 'Doctor verification rejected',
      doctor: {
        id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        isVerified: doctor.isVerified,
        verificationStatus: doctor.verificationStatus
      }
    });
  } catch (error) {
    console.error('❌ Reject doctor error:', error);
    res.status(500).json({
      error: 'Unable to reject doctor',
      message: 'Please try again later'
    });
  }
});

// Request Additional Documents
router.post('/doctors/:doctorId/request-documents', authenticateAdmin, requirePermission('verify_doctors'), [
  body('documentTypes').isArray().withMessage('Document types array required'),
  body('message').notEmpty().withMessage('Message required')
], async (req, res) => {
  console.log('\n📋 REQUEST DOCUMENTS');
  console.log('Admin:', req.admin.fullName);
  console.log('Doctor ID:', req.params.doctorId);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { doctorId } = req.params;
    const { documentTypes, message } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        error: 'Doctor not found',
        message: 'No doctor found with this ID'
      });
    }

    console.log('📄 Requesting documents from:', doctor.fullName);

    // Update verification status to in_review
    doctor.verificationStatus = 'in_review';
    doctor.verificationNotes = `Additional documents requested: ${documentTypes.join(', ')}. ${message}`;
    doctor.documentsRequestedAt = new Date();
    doctor.documentsRequestedBy = req.admin._id;

    await doctor.save();

    console.log(`📋 Documents requested from doctor ${doctor.email} by admin ${req.admin.email}`);

    res.json({
      success: true,
      message: 'Document request sent to doctor',
      requestedDocuments: documentTypes
    });
  } catch (error) {
    console.error('❌ Request documents error:', error);
    res.status(500).json({
      error: 'Unable to request documents',
      message: 'Please try again later'
    });
  }
});

// ================================
// DASHBOARD STATS - FIXED
// ================================

// Admin Dashboard Statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  console.log('\n📊 ADMIN STATS REQUEST');
  console.log('Admin:', req.admin.fullName);
  
  try {
    // FIXED: Handle missing Appointment model gracefully
    const [
      totalUsers,
      totalDoctors,
      verifiedDoctors,
      pendingVerifications
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Doctor.countDocuments({ isActive: true }),
      Doctor.countDocuments({ isVerified: true }),
      Doctor.countDocuments({ verificationStatus: 'pending' })
    ]);

    // TODO: Add these when Appointment model is ready
    const totalAppointments = 0;     // Appointment.countDocuments()
    const todayAppointments = 0;     // Today's appointments count

    console.log('📈 Stats calculated:', {
      totalUsers,
      totalDoctors,
      verifiedDoctors,
      pendingVerifications
    });

    // Recent activities (last 10 doctor registrations)
    const recentDoctorRegistrations = await Doctor.find()
      .select('firstName lastName email specialization verificationStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const stats = {
      totalUsers,
      totalDoctors,
      verifiedDoctors,
      pendingVerifications,
      totalAppointments,      // Will be 0 until Appointment model is added
      todayAppointments,      // Will be 0 until Appointment model is added
      verificationRate: totalDoctors > 0 ? ((verifiedDoctors / totalDoctors) * 100).toFixed(1) : 0
    };

    res.json({
      success: true,
      stats,
      recentActivities: recentDoctorRegistrations
    });
  } catch (error) {
    console.error('❌ Get admin stats error:', error);
    res.status(500).json({
      error: 'Unable to fetch statistics',
      message: 'Please try again later'
    });
  }
});

// ================================
// ADDITIONAL USEFUL ROUTES
// ================================

// Get All Doctors (with filters)
router.get('/doctors', authenticateAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all',
      specialization = 'all',
      search = ''
    } = req.query;

    let query = {};

    // Filter by verification status
    if (status !== 'all') {
      if (status === 'verified') {
        query.isVerified = true;
      } else if (status === 'pending') {
        query.verificationStatus = 'pending';
      } else if (status === 'rejected') {
        query.verificationStatus = 'rejected';
      }
    }

    // Filter by specialization
    if (specialization !== 'all') {
      query.specialization = specialization;
    }

    // Search filter
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { hospitalAffiliation: new RegExp(search, 'i') }
      ];
    }

    const doctors = await Doctor.find(query)
      .select('-password -loginAttempts -lockUntil')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      doctors,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      filters: { status, specialization, search }
    });
  } catch (error) {
    console.error('❌ Get doctors error:', error);
    res.status(500).json({
      error: 'Unable to fetch doctors',
      message: 'Please try again later'
    });
  }
});

// Test route
router.get('/test', (req, res) => {
  console.log('✅ Admin routes test successful');
  res.json({
    message: 'Admin routes are working!',
    timestamp: new Date().toISOString(),
    routes: [
      'POST /login',
      'GET /stats',
      'GET /doctors/pending',
      'POST /doctors/:id/approve',
      'POST /doctors/:id/reject'
    ]
  });
});

module.exports = router;
