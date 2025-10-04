const express = require('express');
const Doctor = require('../models/Doctor');
const jwt = require('jsonwebtoken');
const router = express.Router();

// General auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
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
      const User = require('../models/User');
      user = await User.findById(decoded.userId).select('-password');
      req.user = user;
    }
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
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
      success: false,
      error: 'Invalid token',
      message: 'Token verification failed'
    });
  }
};

// 🔧 FIXED: Doctor Profile Route (Match frontend call)
router.get('/profile/:doctorId', authenticate, async (req, res) => {
  console.log('\n👨‍⚕️ GET DOCTOR PROFILE - FIXED ROUTE');
  console.log('Doctor ID:', req.params.doctorId);
  console.log('Route called:', req.originalUrl);
  console.log('Requested by:', req.currentUser?.email);
  
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        error: 'Doctor ID required',
        message: 'Please provide a valid doctor ID'
      });
    }

    console.log('🔍 Searching for doctor:', doctorId);

    // Find doctor by ID
    const doctor = await Doctor.findById(doctorId).select('-password');
    
    if (!doctor) {
      console.log('❌ Doctor not found in database');
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
        error: 'Doctor not found'
      });
    }

    console.log('✅ Doctor profile found:', `${doctor.firstName} ${doctor.lastName}`);
    console.log('Doctor verified status:', doctor.isVerified);

    // Return doctor profile with all necessary details
    res.json({
      success: true,
      doctor: {
        _id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        specialization: doctor.specialization || 'General Medicine',
        experience: doctor.yearsOfExperience || doctor.experience || 5,
        consultationFee: doctor.consultationFee || 500,
        hospitalAffiliation: doctor.hospitalAffiliation || 'Metro Hospital',
        address: doctor.address || 'Sector 12, Noida',
        city: doctor.city || 'Noida',
        state: doctor.state || 'Uttar Pradesh',
        phoneNumber: doctor.phoneNumber || '+91-9876543210',
        rating: doctor.rating?.average || doctor.rating || 4.5,
        isVerified: doctor.isVerified || false,
        profileImage: doctor.profileImage || null,
        qualifications: doctor.qualifications || ['MBBS', 'MD'],
        bio: doctor.bio || 'Experienced medical professional',
        languages: doctor.languages || ['English', 'Hindi'],
        availableDays: doctor.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        consultationHours: doctor.consultationHours || { start: '09:00', end: '18:00' },
        availableSlots: [
          '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
          '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
          '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Get doctor profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor profile',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET all verified doctors (existing - working)
router.get('/doctors', async (req, res) => {
  console.log('\n🔍 GET VERIFIED DOCTORS REQUEST');
  
  try {
    const { page = 1, limit = 12, specialization, city, search, sortBy = 'rating' } = req.query;

    console.log('Query params:', { page, limit, specialization, city, search, sortBy });

    let query = { isVerified: true };

    if (specialization && specialization !== 'all') {
      query.specialization = new RegExp(specialization, 'i');
    }
    
    if (city && city !== 'all') {
      query.city = new RegExp(city, 'i');
    }
    
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { specialization: new RegExp(search, 'i') },
        { hospitalAffiliation: new RegExp(search, 'i') }
      ];
    }

    let sort = { createdAt: -1 };
    switch (sortBy) {
      case 'experience': sort = { yearsOfExperience: -1 }; break;
      case 'fee': sort = { consultationFee: 1 }; break;
      case 'name': sort = { firstName: 1 }; break;
      case 'rating': sort = { 'rating.average': -1, yearsOfExperience: -1 }; break;
    }

    const doctors = await Doctor.find(query)
      .select('firstName lastName specialization hospitalAffiliation yearsOfExperience consultationFee city state bio languages rating isVerified availableDays')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Doctor.countDocuments(query);

    console.log(`✅ Found ${doctors.length} doctors out of ${total} total`);

    res.json({
      success: true,
      doctors,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('❌ Get doctors error:', error);
    res.status(500).json({
      error: 'Unable to fetch doctors',
      message: 'Please try again later',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🔧 KEEP: Original route for backward compatibility
router.get('/doctor-profile/:doctorId', async (req, res) => {
  console.log('\n👨‍⚕️ GET DOCTOR PROFILE REQUEST (Legacy route)');
  console.log('🔄 Redirecting to new profile route...');
  
  // Redirect to the new route
  req.url = `/profile/${req.params.doctorId}`;
  req.originalUrl = req.originalUrl.replace('/doctor-profile/', '/profile/');
  
  // Call the new profile handler
  return router.handle(req, res);
});

// 🆕 GET doctor available time slots (CRITICAL FOR BOOKING)
router.get('/doctor/:doctorId/slots', async (req, res) => {
  console.log('\n📅 GET DOCTOR SLOTS REQUEST');
  
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    console.log('Doctor ID:', doctorId);
    console.log('Date:', date);

    if (!date) {
      return res.status(400).json({
        error: 'Date required',
        message: 'Please provide a date to check available slots'
      });
    }

    const doctor = await Doctor.findById(doctorId)
      .select('availableDays consultationHours firstName lastName isVerified');
      
    if (!doctor || !doctor.isVerified) {
      console.log('❌ Doctor not found or not verified');
      return res.status(404).json({
        error: 'Doctor not found',
        message: 'Doctor not available for appointments'
      });
    }

    console.log('✅ Doctor found:', `${doctor.firstName} ${doctor.lastName}`);

    const requestedDate = new Date(date);
    const dayName = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    console.log('Day name:', dayName);
    console.log('Available days:', doctor.availableDays);

    // Check if doctor is available on this day
    const availableDays = doctor.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    if (!availableDays.includes(dayName)) {
      console.log(`❌ Doctor not available on ${dayName}`);
      return res.json({
        success: true,
        availableSlots: [],
        message: `Dr. ${doctor.firstName} is not available on ${dayName}s`,
        doctorSchedule: {
          availableDays: availableDays,
          consultationHours: doctor.consultationHours || { start: '09:00', end: '18:00' }
        }
      });
    }

    // Generate time slots (9 AM to 6 PM, 30-minute intervals)
    const slots = [];
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Create display time
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        slots.push({
          time: timeString,
          displayTime: displayTime,
          available: true
        });
      }
    }

    console.log(`✅ Generated ${slots.length} time slots for ${dayName}`);

    res.json({
      success: true,
      availableSlots: slots,
      doctorSchedule: {
        availableDays: availableDays,
        consultationHours: doctor.consultationHours || { start: '09:00', end: '18:00' }
      }
    });

  } catch (error) {
    console.error('❌ Get slots error:', error);
    res.status(500).json({
      error: 'Unable to fetch available slots',
      message: 'Please try again later',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
