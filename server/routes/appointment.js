const express = require('express');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// General auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    console.log('🔍 Authenticating user...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'curesight_jwt_secret_fallback');
    
    let user;
    if (decoded.role === 'doctor') {
      user = await Doctor.findById(decoded.userId).select('-password');
      req.doctor = user;
    } else {
      user = await User.findById(decoded.userId).select('-password');
      req.user = user;
    }
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    console.log('✅ User authenticated:', user.email, 'Role:', decoded.role);
    req.currentUser = user;
    req.userRole = decoded.role || 'patient';
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(401).json({
      error: 'Invalid token',
      message: 'Token verification failed'
    });
  }
};

// 🔧 NEW: Get Doctor Profile (for BookAppointment page)
router.get('/doctor/profile/:doctorId', authenticate, async (req, res) => {
  console.log('\n👨‍⚕️ GET DOCTOR PROFILE');
  console.log('Doctor ID:', req.params.doctorId);
  
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId).select('-password');
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    console.log('✅ Doctor profile found:', `${doctor.firstName} ${doctor.lastName}`);

    res.json({
      success: true,
      doctor: {
        _id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        specialization: doctor.specialization,
        experience: doctor.experience || 5,
        consultationFee: doctor.consultationFee || 500,
        hospitalAffiliation: doctor.hospitalAffiliation,
        address: doctor.address,
        city: doctor.city,
        state: doctor.state,
        phoneNumber: doctor.phoneNumber,
        rating: doctor.rating || 4.5,
        isVerified: doctor.isVerified,
        availableSlots: [
          '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
          '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
          '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Get doctor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor profile',
      error: error.message
    });
  }
});

// 🔧 NEW: Get Doctor Appointments (for Doctor Dashboard)
router.get('/doctor/appointments', authenticate, async (req, res) => {
  console.log('\n📋 GET DOCTOR APPOINTMENTS');
  console.log('Doctor:', req.currentUser.email);
  
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can access this endpoint'
      });
    }

    const { page = 1, limit = 20, status, upcoming, mode } = req.query;
    const doctorId = req.currentUser._id;

    let query = { doctor: doctorId };
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter upcoming appointments
    if (upcoming === 'true') {
      query.appointmentDate = { $gte: new Date() };
      query.status = { $nin: ['cancelled', 'completed', 'no-show'] };
    }
    
    // Filter by appointment mode
    if (mode && mode !== 'all') {
      query.appointmentMode = mode;
    }

    const appointments = await Appointment.find(query)
      .populate({
        path: 'patient',
        select: 'firstName lastName email phoneNumber dateOfBirth gender',
        model: 'User'
      })
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Appointment.countDocuments(query);

    // Add real-time status
    const enhancedAppointments = appointments.map(apt => {
      const appointmentDateTime = new Date(`${apt.appointmentDate.toDateString()} ${apt.appointmentTime}`);
      const now = new Date();
      const timeDiff = appointmentDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);

      return {
        ...apt.toObject(),
        canJoinOnline: apt.appointmentMode === 'online' && hoursDiff < 0.25 && hoursDiff > -2,
        isOverdue: hoursDiff < -2
      };
    });

    console.log(`✅ Found ${appointments.length} appointments for doctor`);

    res.json({
      success: true,
      appointments: enhancedAppointments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      },
      summary: {
        total: total,
        scheduled: await Appointment.countDocuments({...query, status: { $in: ['scheduled', 'confirmed'] }}),
        completed: await Appointment.countDocuments({...query, status: 'completed'}),
        cancelled: await Appointment.countDocuments({...query, status: 'cancelled'}),
        online: await Appointment.countDocuments({...query, appointmentMode: 'online'}),
        clinic: await Appointment.countDocuments({...query, appointmentMode: 'clinic'})
      }
    });

  } catch (error) {
    console.error('❌ Get doctor appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message
    });
  }
});

// 🔧 NEW: Get Patient Appointments with Enhanced Filtering
router.get('/my-appointments', authenticate, async (req, res) => {
  console.log('\n📋 GET PATIENT APPOINTMENTS (ENHANCED)');
  console.log('Patient:', req.currentUser.email);
  
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      upcoming, 
      mode,
      startDate,
      endDate,
      doctorId
    } = req.query;

    let query = { patient: req.currentUser._id };
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter upcoming appointments
    if (upcoming === 'true') {
      query.appointmentDate = { $gte: new Date() };
      query.status = { $nin: ['cancelled', 'completed', 'no-show'] };
    }
    
    // 🔧 NEW: Filter by appointment mode (online/clinic)
    if (mode && mode !== 'all') {
      query.appointmentMode = mode;
    }
    
    // 🔧 NEW: Filter by date range
    if (startDate || endDate) {
      query.appointmentDate = {};
      if (startDate) {
        query.appointmentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.appointmentDate.$lte = new Date(endDate);
      }
    }
    
    // Filter by doctor
    if (doctorId) {
      query.doctor = doctorId;
    }

    console.log('Enhanced Query:', query);

    const appointments = await Appointment.find(query)
      .populate({
        path: 'doctor', 
        select: 'firstName lastName specialization hospitalAffiliation consultationFee address city state',
        model: 'Doctor'
      })
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Appointment.countDocuments(query);

    // 🔧 NEW: Add real-time status based on current time
    const enhancedAppointments = appointments.map(apt => {
      const appointmentDateTime = new Date(`${apt.appointmentDate.toDateString()} ${apt.appointmentTime}`);
      const now = new Date();
      const timeDiff = appointmentDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);

      let realTimeStatus = apt.status;
      if (apt.status === 'scheduled' || apt.status === 'confirmed') {
        if (hoursDiff < -2) {
          realTimeStatus = 'missed';
        } else if (hoursDiff < 0) {
          realTimeStatus = 'overdue';
        } else if (hoursDiff < 1) {
          realTimeStatus = 'soon';
        }
      }

      return {
        ...apt.toObject(),
        realTimeStatus,
        isUpcoming: hoursDiff > 0,
        timeUntilAppointment: hoursDiff > 0 ? `${Math.ceil(hoursDiff)} hours` : null,
        canJoinOnline: apt.appointmentMode === 'online' && hoursDiff < 0.25 && hoursDiff > -2
      };
    });

    console.log(`✅ Found ${enhancedAppointments.length} appointments`);

    res.json({
      success: true,
      appointments: enhancedAppointments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      },
      summary: {
        total: total,
        upcoming: enhancedAppointments.filter(apt => apt.isUpcoming).length,
        online: enhancedAppointments.filter(apt => apt.appointmentMode === 'online').length,
        clinic: enhancedAppointments.filter(apt => apt.appointmentMode === 'clinic').length
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

// 🔧 NEW: Get Appointments by Date Range
router.get('/appointments-by-date', authenticate, async (req, res) => {
  console.log('\n📅 GET APPOINTMENTS BY DATE RANGE');
  
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Date range required',
        message: 'Both startDate and endDate are required'
      });
    }

    const appointments = await Appointment.findByDateRange(
      req.currentUser._id,
      new Date(startDate),
      new Date(endDate)
    );

    // Group by date
    const groupedByDate = appointments.reduce((acc, apt) => {
      const dateKey = apt.appointmentDate.toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(apt);
      return acc;
    }, {});

    res.json({
      success: true,
      appointments,
      groupedByDate,
      dateRange: { startDate, endDate },
      count: appointments.length
    });

  } catch (error) {
    console.error('❌ Get appointments by date error:', error);
    res.status(500).json({
      error: 'Unable to fetch appointments',
      message: 'Please try again later'
    });
  }
});

// 🔧 NEW: Book Appointment with Mode Selection
router.post('/book', authenticate, [
  body('doctorId').isMongoId().withMessage('Valid doctor ID required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date required'),
  body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required (HH:MM)'),
  body('appointmentMode').isIn(['online', 'clinic', 'home-visit']).withMessage('Valid appointment mode required'),
  body('type').optional().isIn(['consultation', 'follow-up', 'emergency', 'routine-checkup', 'specialist-consultation']),
  body('symptoms').notEmpty().withMessage('Symptoms or reason for visit is required').isLength({ max: 1000 }).withMessage('Symptoms must not exceed 1000 characters'),
  body('patientNotes').optional().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters')
], async (req, res) => {
  console.log('\n📅 BOOK APPOINTMENT REQUEST (ENHANCED)');
  console.log('Patient:', req.currentUser.email);
  console.log('Request body:', req.body);
  
  try {
    if (req.userRole !== 'patient') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only patients can book appointments'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        message: 'Please check all required fields'
      });
    }

    const {
      doctorId,
      appointmentDate,
      appointmentTime,
      appointmentMode = 'clinic',
      type = 'consultation',
      symptoms,
      patientNotes,
      clinicDetails,
      paymentMethod = 'cash'
    } = req.body;

    // Check if doctor exists and is verified
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isVerified) {
      console.log('❌ Doctor not found or not verified');
      return res.status(404).json({
        success: false,
        error: 'Doctor not found',
        message: 'Doctor not available for appointments'
      });
    }

    console.log('✅ Doctor found:', `${doctor.firstName} ${doctor.lastName}`);

    // Validate appointment date (not in the past)
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    if (appointmentDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date',
        message: 'Cannot book appointment in the past'
      });
    }

    // Check if appointment slot is available
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      status: { $nin: ['cancelled', 'no-show'] }
    });

    if (existingAppointment) {
      console.log('❌ Slot already booked');
      return res.status(400).json({
        success: false,
        error: 'Slot not available',
        message: 'This appointment slot is already booked'
      });
    }

    // 🔧 NEW: Set clinic details if clinic mode
    let finalClinicDetails = null;
    if (appointmentMode === 'clinic') {
      finalClinicDetails = clinicDetails || {
        address: doctor.address || 'Clinic Address Not Available',
        city: doctor.city || 'City Not Available',
        state: doctor.state || 'State Not Available'
      };
    }

    // Create appointment
    const appointment = new Appointment({
      patient: req.currentUser._id,
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      appointmentMode,
      type,
      symptoms: symptoms.trim(),
      patientNotes: patientNotes ? patientNotes.trim() : '',
      consultationFee: doctor.consultationFee || 500,
      bookedBy: req.currentUser._id,
      status: 'scheduled',
      paymentMethod,
      paymentStatus: 'pending',
      clinicDetails: finalClinicDetails
    });

    console.log('📝 Saving appointment...');
    await appointment.save();

    // Populate appointment data
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('doctor', 'firstName lastName specialization hospitalAffiliation consultationFee address city state')
      .populate('patient', 'firstName lastName email phoneNumber');

    console.log('✅ Appointment booked successfully');

    res.status(201).json({
      success: true,
      message: `${appointmentMode === 'online' ? 'Online' : 'Clinic'} appointment booked successfully!`,
      appointment: populatedAppointment
    });

  } catch (error) {
    console.error('❌ Book appointment error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Booking failed',
      message: 'Unable to book appointment. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🔧 NEW: Update Appointment Status (for doctors)
router.patch('/:appointmentId/status', authenticate, [
  body('status').isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']).withMessage('Valid status required')
], async (req, res) => {
  console.log('\n📝 UPDATE APPOINTMENT STATUS');
  
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can update appointment status'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { appointmentId } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findOneAndUpdate(
      { 
        _id: appointmentId, 
        doctor: req.currentUser._id
      },
      { status },
      { new: true }
    ).populate('patient', 'firstName lastName email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    console.log('✅ Appointment status updated:', status);

    res.json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment
    });

  } catch (error) {
    console.error('❌ Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment status'
    });
  }
});

// 🔧 NEW: Rate Appointment
router.patch('/:appointmentId/rate', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().isLength({ max: 1000 }).withMessage('Review must not exceed 1000 characters')
], async (req, res) => {
  console.log('\n⭐ RATE APPOINTMENT');
  
  try {
    if (req.userRole !== 'patient') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only patients can rate appointments'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { appointmentId } = req.params;
    const { rating, review } = req.body;

    const appointment = await Appointment.findOneAndUpdate(
      { 
        _id: appointmentId, 
        patient: req.currentUser._id,
        status: 'completed'
      },
      {
        patientRating: rating,
        patientReview: review
      },
      { new: true }
    ).populate('doctor', 'firstName lastName');

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
        message: 'No completed appointment found with this ID'
      });
    }

    console.log('✅ Appointment rated:', rating, 'stars');

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      appointment
    });

  } catch (error) {
    console.error('❌ Rate appointment error:', error);
    res.status(500).json({
      error: 'Rating failed',
      message: 'Unable to submit rating'
    });
  }
});

// Get Single Appointment (Enhanced)
router.get('/:appointmentId', authenticate, async (req, res) => {
  console.log('\n📋 GET SINGLE APPOINTMENT (ENHANCED)');
  
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor', 'firstName lastName specialization hospitalAffiliation consultationFee address city state phoneNumber')
      .populate('patient', 'firstName lastName email phoneNumber dateOfBirth gender');

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
        message: 'No appointment found with this ID'
      });
    }

    // Check access permissions
    const hasAccess = 
      (req.userRole === 'doctor' && appointment.doctor._id.toString() === req.currentUser._id.toString()) ||
      (req.userRole === 'patient' && appointment.patient._id.toString() === req.currentUser._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this appointment'
      });
    }

    // Add real-time information
    const appointmentDateTime = new Date(`${appointment.appointmentDate.toDateString()} ${appointment.appointmentTime}`);
    const now = new Date();
    const timeDiff = appointmentDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    const enhancedAppointment = {
      ...appointment.toObject(),
      timeUntilAppointment: hoursDiff > 0 ? `${Math.ceil(hoursDiff)} hours` : null,
      canJoinOnline: appointment.appointmentMode === 'online' && hoursDiff < 0.25 && hoursDiff > -2,
      isOverdue: hoursDiff < -2
    };

    res.json({
      success: true,
      appointment: enhancedAppointment
    });

  } catch (error) {
    console.error('❌ Get appointment error:', error);
    res.status(500).json({
      error: 'Unable to fetch appointment',
      message: 'Please try again later'
    });
  }
});

module.exports = router;
