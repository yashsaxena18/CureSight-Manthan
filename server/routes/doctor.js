const express = require('express');
const { body, validationResult } = require('express-validator');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
// 🔧 FIXED: Capital A in Appointment import
const Appointment = require('../models/appointment'); 
const jwt = require('jsonwebtoken');

const router = express.Router();

// ================================
// MIDDLEWARE
// ================================

// Middleware to authenticate doctor
const authenticateDoctor = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided for doctor auth');
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    console.log('🔍 Verifying doctor token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'curesight_jwt_secret_fallback');
    
    if (decoded.role !== 'doctor') {
      console.log('❌ Token is not for doctor role:', decoded.role);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Doctor access required'
      });
    }

    console.log('🔍 Finding doctor in database:', decoded.userId);
    const doctor = await Doctor.findById(decoded.userId).select('-password');
    
    if (!doctor) {
      console.log('❌ Doctor not found in database:', decoded.userId);
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Doctor not found'
      });
    }

    console.log('✅ Doctor authenticated:', doctor.email);
    req.doctor = doctor;
    next();
  } catch (error) {
    console.error('❌ Doctor authentication error:', error);
    res.status(401).json({
      error: 'Invalid token',
      message: 'Token verification failed'
    });
  }
};

// Middleware to check if doctor is verified
const requireVerification = (req, res, next) => {
  if (!req.doctor.isVerified) {
    return res.status(403).json({
      error: 'Verification required',
      message: 'Your account must be verified to access this feature',
      verificationStatus: req.doctor.verificationStatus
    });
  }
  next();
};

// ================================
// DOCTOR PROFILE ROUTES
// ================================

// GET Doctor Profile
router.get('/profile', authenticateDoctor, async (req, res) => {
  console.log('\n👨‍⚕️ GET DOCTOR PROFILE REQUEST');
  console.log('Doctor ID:', req.doctor._id);
  console.log('Doctor Email:', req.doctor.email);
  
  try {
    const doctor = await Doctor.findById(req.doctor._id)
      .select('-password -loginAttempts -lockUntil')
      .lean();

    if (!doctor) {
      console.log('❌ Doctor not found in database:', req.doctor._id);
      return res.status(404).json({
        error: 'Doctor not found',
        message: 'Doctor profile not found in database'
      });
    }

    console.log('✅ Doctor profile found:', doctor.email);
    console.log('🔍 Verification Status:', doctor.verificationStatus);
    console.log('✅ Is Verified:', doctor.isVerified);

    // Add virtual fields and clean up data
    const doctorProfile = {
      ...doctor,
      id: doctor._id,
      fullName: `${doctor.firstName} ${doctor.lastName}`,
      displayName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      role: 'doctor'
    };

    res.json({
      success: true,
      doctor: doctorProfile
    });
  } catch (error) {
    console.error('❌ Get doctor profile error:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({
      error: 'Unable to fetch profile',
      message: 'Database error occurred. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// UPDATE Doctor Profile
router.put('/profile', authenticateDoctor, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('phoneNumber').optional().matches(/^[\+]?[\d\s\-\(\)]{10,15}$/).withMessage('Valid phone number required'),
  body('bio').optional().isLength({ max: 1000 }).withMessage('Bio must not exceed 1000 characters'),
  body('consultationFee').optional().isFloat({ min: 0, max: 50000 }).withMessage('Consultation fee must be between 0-50000'),
  body('city').optional().trim().isLength({ max: 100 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('languages').optional().isArray()
], async (req, res) => {
  console.log('\n🔄 UPDATE DOCTOR PROFILE REQUEST');
  console.log('Doctor ID:', req.doctor._id);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input data',
        details: errors.array()
      });
    }

    const updateData = { ...req.body };
    
    // Prevent updating sensitive fields
    const protectedFields = ['email', 'medicalLicenseNumber', 'role', 'isVerified', 'verificationStatus', '_id', 'createdAt'];
    protectedFields.forEach(field => delete updateData[field]);

    // Add timestamp
    updateData.updatedAt = new Date();

    console.log('📝 Updating doctor with data:', Object.keys(updateData));

    const doctor = await Doctor.findByIdAndUpdate(
      req.doctor._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -loginAttempts -lockUntil');

    if (!doctor) {
      return res.status(404).json({
        error: 'Doctor not found',
        message: 'Unable to find doctor profile'
      });
    }

    console.log('✅ Doctor profile updated successfully');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      doctor
    });
  } catch (error) {
    console.error('❌ Update doctor profile error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid data provided',
        details: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({
      error: 'Update failed',
      message: 'Unable to update profile. Please try again later.'
    });
  }
});

// ================================
// PATIENT MANAGEMENT ROUTES
// ================================

// 🔧 FIXED: GET Doctor's Patients with REAL Appointment Data
router.get('/patients', authenticateDoctor, requireVerification, async (req, res) => {
  console.log('\n👥 GET DOCTOR PATIENTS REQUEST');
  console.log('Doctor:', req.doctor.email);
  console.log('Doctor ID:', req.doctor._id);
  
  try {
    const { page = 1, limit = 12, search = '' } = req.query;

    console.log('🔍 Query params:', { page, limit, search });

    // Get appointments for this doctor to find patients
    let appointmentQuery = { doctor: req.doctor._id };
    
    console.log('🔍 Finding appointments for doctor:', req.doctor._id);

    const appointments = await Appointment.find(appointmentQuery)
      .populate({
        path: 'patient',
        select: 'firstName lastName email dateOfBirth gender phoneNumber createdAt',
        match: search ? {
          $or: [
            { firstName: new RegExp(search, 'i') },
            { lastName: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') }
          ]
        } : {}
      })
      .sort({ appointmentDate: -1 })
      .lean();

    console.log(`🔍 Found ${appointments.length} total appointments`);

    // Group by patient and get stats
    const patientsMap = new Map();
    
    appointments.forEach(appointment => {
      if (appointment.patient && appointment.patient._id) {
        const patientId = appointment.patient._id.toString();
        
        if (!patientsMap.has(patientId)) {
          patientsMap.set(patientId, {
            patient: appointment.patient,
            lastAppointment: appointment.appointmentDate,
            appointmentCount: 1,
            lastConsultation: appointment,
            statuses: [appointment.status]
          });
        } else {
          const existing = patientsMap.get(patientId);
          existing.appointmentCount += 1;
          existing.statuses.push(appointment.status);
          
          // Update last appointment if this one is more recent
          if (new Date(appointment.appointmentDate) > new Date(existing.lastAppointment)) {
            existing.lastAppointment = appointment.appointmentDate;
            existing.lastConsultation = appointment;
          }
        }
      }
    });

    // Convert to array and apply pagination
    const allPatients = Array.from(patientsMap.values());
    const total = allPatients.length;
    
    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const patients = allPatients.slice(startIndex, startIndex + parseInt(limit));

    console.log(`✅ Found ${patients.length} unique patients (${total} total)`);

    // Add calculated fields
    const enhancedPatients = patients.map(patientData => ({
      ...patientData,
      completedAppointments: patientData.statuses.filter(s => s === 'completed').length,
      pendingAppointments: patientData.statuses.filter(s => ['scheduled', 'confirmed'].includes(s)).length,
      cancelledAppointments: patientData.statuses.filter(s => s === 'cancelled').length
    }));

    res.json({
      success: true,
      patients: enhancedPatients,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)) || 1,
        total
      },
      summary: {
        totalPatients: total,
        totalAppointments: appointments.length,
        doctorName: `Dr. ${req.doctor.firstName} ${req.doctor.lastName}`
      }
    });

  } catch (error) {
    console.error('❌ Get patients error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      error: 'Unable to fetch patients',
      message: 'Please try again later',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET Patient Details with History
router.get('/patients/:patientId', authenticateDoctor, requireVerification, async (req, res) => {
  console.log('\n👤 GET PATIENT DETAILS REQUEST');
  console.log('Patient ID:', req.params.patientId);
  
  try {
    const { patientId } = req.params;

    // Get patient basic info
    const patient = await User.findById(patientId)
      .select('firstName lastName email dateOfBirth gender phoneNumber createdAt');

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: 'No patient found with this ID'
      });
    }

    // Get appointment history with this doctor
    const appointmentHistory = await Appointment.find({
      patient: patientId,
      doctor: req.doctor._id
    })
    .sort({ appointmentDate: -1 })
    .lean();

    console.log(`✅ Found patient with ${appointmentHistory.length} appointments`);

    res.json({
      success: true,
      patient: {
        ...patient.toObject(),
        appointmentHistory,
        totalAppointments: appointmentHistory.length,
        completedAppointments: appointmentHistory.filter(a => a.status === 'completed').length,
        upcomingAppointments: appointmentHistory.filter(a => 
          new Date(a.appointmentDate) > new Date() && !['cancelled', 'completed'].includes(a.status)
        ).length
      }
    });
  } catch (error) {
    console.error('❌ Get patient details error:', error);
    res.status(500).json({
      error: 'Unable to fetch patient details',
      message: 'Please try again later'
    });
  }
});

// ================================
// APPOINTMENT MANAGEMENT ROUTES
// ================================

// 🔧 FIXED: GET Doctor's Appointments with REAL Data
router.get('/appointments', authenticateDoctor, async (req, res) => {
  console.log('\n📅 GET DOCTOR APPOINTMENTS REQUEST');
  console.log('Doctor:', req.doctor.email);
  
  try {
    const { 
      date, 
      status = 'all', 
      page = 1, 
      limit = 20,
      upcoming = false
    } = req.query;

    let query = { doctor: req.doctor._id };

    // Filter by date
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.appointmentDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    // Filter upcoming appointments
    if (upcoming === 'true') {
      query.appointmentDate = { $gte: new Date() };
      query.status = { $nin: ['cancelled', 'completed', 'no-show'] };
    }

    // Filter by status
    if (status !== 'all') {
      query.status = status;
    }

    console.log('🔍 Appointment query:', query);

    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName email phoneNumber dateOfBirth gender')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Appointment.countDocuments(query);

    console.log(`✅ Found ${appointments.length} appointments (${total} total)`);

    res.json({
      success: true,
      appointments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)) || 1,
        total
      }
    });
  } catch (error) {
    console.error('❌ Get appointments error:', error);
    res.status(500).json({
      error: 'Unable to fetch appointments',
      message: 'Please try again later'
    });
  }
});

// UPDATE Appointment Status
router.patch('/appointments/:appointmentId', authenticateDoctor, [
  body('status').isIn(['confirmed', 'in-progress', 'completed', 'cancelled']).withMessage('Valid status required'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters'),
  body('diagnosis').optional().isLength({ max: 500 }).withMessage('Diagnosis must not exceed 500 characters'),
  body('prescription').optional().isArray().withMessage('Prescription must be an array')
], async (req, res) => {
  console.log('\n🔄 UPDATE APPOINTMENT REQUEST');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { appointmentId } = req.params;
    const updateData = req.body;

    const appointment = await Appointment.findOneAndUpdate(
      { 
        _id: appointmentId, 
        doctor: req.doctor._id 
      },
      {
        ...updateData,
        ...(updateData.status === 'completed' && { completedAt: new Date() }),
        ...(updateData.status === 'confirmed' && { confirmedAt: new Date() })
      },
      { new: true, runValidators: true }
    )
    .populate('patient', 'firstName lastName email phoneNumber');

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
        message: 'No appointment found with this ID'
      });
    }

    console.log('✅ Appointment updated:', appointment.status);

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment
    });
  } catch (error) {
    console.error('❌ Update appointment error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: 'Unable to update appointment'
    });
  }
});

// ================================
// DASHBOARD STATS ROUTES
// ================================

// 🔧 FIXED: GET Doctor Dashboard Stats with REAL Data
router.get('/stats', authenticateDoctor, async (req, res) => {
  console.log('\n📊 GET DOCTOR STATS REQUEST');
  console.log('Doctor:', req.doctor.email);
  
  try {
    const doctorId = req.doctor._id;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    console.log('📊 Calculating stats for doctor:', doctorId);

    // Get all stats in parallel
    const [
      todayAppointments,
      monthlyAppointments,
      completedConsultations,
      pendingAppointments,
      uniquePatients,
      recentAppointments
    ] = await Promise.all([
      Appointment.countDocuments({
        doctor: doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay }
      }),
      Appointment.countDocuments({
        doctor: doctorId,
        appointmentDate: { $gte: thisMonth }
      }),
      Appointment.countDocuments({
        doctor: doctorId,
        status: 'completed'
      }),
      Appointment.countDocuments({
        doctor: doctorId,
        status: { $in: ['scheduled', 'confirmed'] },
        appointmentDate: { $gte: new Date() }
      }),
      Appointment.distinct('patient', { doctor: doctorId }),
      Appointment.find({
        doctor: doctorId
      })
      .populate('patient', 'firstName lastName email')
      .sort({ appointmentDate: -1 })
      .limit(5)
      .lean()
    ]);

    const stats = {
      totalPatients: uniquePatients.length,
      todayAppointments,
      monthlyAppointments,
      completedConsultations,
      pendingAppointments,
      verificationStatus: req.doctor.verificationStatus,
      isVerified: req.doctor.isVerified,
      joinedDate: req.doctor.createdAt
    };

    console.log('✅ Stats calculated:', stats);

    res.json({
      success: true,
      stats,
      recentAppointments,
      doctor: {
        id: req.doctor._id,
        name: `Dr. ${req.doctor.firstName} ${req.doctor.lastName}`,
        specialization: req.doctor.specialization,
        hospital: req.doctor.hospitalAffiliation,
        isVerified: req.doctor.isVerified,
        verificationStatus: req.doctor.verificationStatus
      }
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      error: 'Unable to fetch stats',
      message: 'Please try again later'
    });
  }
});

// ================================
// SCHEDULE MANAGEMENT ROUTES
// ================================

// GET Doctor's Schedule
router.get('/schedule', authenticateDoctor, async (req, res) => {
  console.log('\n📊 GET DOCTOR SCHEDULE REQUEST');
  
  try {
    const { date, week } = req.query;
    
    let scheduleQuery = { doctor: req.doctor._id };
    
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      scheduleQuery.appointmentDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const appointments = await Appointment.find(scheduleQuery)
      .populate('patient', 'firstName lastName email')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.json({
      success: true,
      schedule: {
        appointments,
        date: date || new Date().toISOString().split('T')[0]
      },
      doctor: {
        availableDays: req.doctor.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        consultationHours: req.doctor.consultationHours || { start: '09:00', end: '17:00' }
      }
    });
  } catch (error) {
    console.error('❌ Get schedule error:', error);
    res.status(500).json({
      error: 'Unable to fetch schedule',
      message: 'Please try again later'
    });
  }
});

// UPDATE Doctor's Availability
router.put('/availability', authenticateDoctor, [
  body('availableDays').isArray().withMessage('Available days must be an array'),
  body('consultationHours.start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
  body('consultationHours.end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format')
], async (req, res) => {
  console.log('\n⏰ UPDATE DOCTOR AVAILABILITY REQUEST');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { availableDays, consultationHours } = req.body;

    const updateData = {};
    if (availableDays) updateData.availableDays = availableDays;
    if (consultationHours) updateData.consultationHours = consultationHours;

    const doctor = await Doctor.findByIdAndUpdate(
      req.doctor._id,
      updateData,
      { new: true, runValidators: true }
    ).select('availableDays consultationHours firstName lastName');

    console.log('✅ Doctor availability updated');

    res.json({
      success: true,
      message: 'Availability updated successfully',
      availability: {
        availableDays: doctor.availableDays,
        consultationHours: doctor.consultationHours
      }
    });
  } catch (error) {
    console.error('❌ Update availability error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: 'Unable to update availability'
    });
  }
});

// ================================
// UTILITY ROUTES
// ================================

// GET Doctor's Public Profile (for patients to view)
router.get('/public/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId)
      .select('firstName lastName specialization hospitalAffiliation yearsOfExperience city state bio consultationFee languages availableDays isVerified verificationStatus rating')
      .lean();

    if (!doctor || !doctor.isVerified) {
      return res.status(404).json({
        error: 'Doctor not found',
        message: 'Doctor profile not available'
      });
    }

    res.json({
      success: true,
      doctor: {
        ...doctor,
        fullName: `Dr. ${doctor.firstName} ${doctor.lastName}`
      }
    });
  } catch (error) {
    console.error('❌ Get public profile error:', error);
    res.status(500).json({
      error: 'Unable to fetch profile',
      message: 'Please try again later'
    });
  }
});

// ================================
// DEBUG AND TEST ROUTES
// ================================

// Debug route for troubleshooting
router.get('/debug', authenticateDoctor, async (req, res) => {
  try {
    console.log('🔍 DEBUG - Doctor info from token:', {
      id: req.doctor._id,
      email: req.doctor.email,
      verification: req.doctor.verificationStatus,
      verified: req.doctor.isVerified
    });

    // Check appointments count
    const appointmentCount = await Appointment.countDocuments({ doctor: req.doctor._id });
    console.log('🔍 DEBUG - Appointment count:', appointmentCount);

    const doctorFromDB = await Doctor.findById(req.doctor._id);
    console.log('🔍 DEBUG - Doctor exists in DB:', !!doctorFromDB);

    if (doctorFromDB) {
      console.log('🔍 DEBUG - DB verification status:', doctorFromDB.verificationStatus);
      console.log('🔍 DEBUG - DB verified status:', doctorFromDB.isVerified);
    }

    res.json({
      success: true,
      debug: {
        tokenDoctor: {
          id: req.doctor._id,
          email: req.doctor.email,
          verification: req.doctor.verificationStatus,
          verified: req.doctor.isVerified
        },
        dbDoctor: !!doctorFromDB,
        dbVerification: doctorFromDB?.verificationStatus,
        dbVerified: doctorFromDB?.isVerified,
        appointmentCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Test route
router.get('/test', (req, res) => {
  console.log('✅ Doctor routes test successful');
  res.json({
    message: 'Doctor routes are working perfectly!',
    timestamp: new Date().toISOString(),
    routes: [
      'GET  /profile - Get doctor profile',
      'PUT  /profile - Update doctor profile',
      'GET  /patients - Get doctor patients (REAL DATA)',
      'GET  /patients/:id - Get patient details',
      'GET  /appointments - Get doctor appointments (REAL DATA)',
      'PATCH /appointments/:id - Update appointment',
      'GET  /schedule - Get doctor schedule',
      'PUT  /availability - Update availability',
      'GET  /stats - Get dashboard stats (REAL DATA)',
      'GET  /public/:id - Get public profile',
      'GET  /debug - Debug information',
      'GET  /test - Test route'
    ]
  });
});

module.exports = router;
