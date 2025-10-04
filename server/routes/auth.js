const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ================================
// VALIDATION RULES
// ================================

// Patient signup validation
const signupValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
    
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
    
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Valid date of birth required'),
    
  body('gender')
    .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
    .withMessage('Valid gender required')
];

// Patient signin validation
const signinValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

// Doctor signup validation
const doctorSignupValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
    
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
    
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
    
  body('medicalLicenseNumber')
    .trim()
    .notEmpty()
    .withMessage('Medical license number is required')
    .isLength({ min: 5, max: 20 })
    .withMessage('License number must be 5-20 characters'),
    
  body('specialization')
    .notEmpty()
    .withMessage('Specialization is required'),
    
  body('yearsOfExperience')
    .isInt({ min: 0, max: 60 })
    .withMessage('Years of experience must be between 0-60'),
    
  body('hospitalAffiliation')
    .trim()
    .notEmpty()
    .withMessage('Hospital/clinic affiliation is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Hospital name must be 3-200 characters'),
    
  body('phoneNumber')
    .matches(/^[\+]?[\d\s\-\(\)]{10,15}$/)
    .withMessage('Valid phone number is required'),
    
  body('agreeTerms')
    .equals('true')
    .withMessage('You must agree to the terms of service'),
    
  body('agreePrivacy')
    .equals('true')
    .withMessage('You must agree to the privacy policy')
];

// Doctor signin validation
const doctorSigninValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

// ================================
// TEST ROUTES
// ================================

router.get('/test', (req, res) => {
  console.log('✅ Auth test route accessed');
  res.json({ 
    message: 'Auth routes working!', 
    timestamp: new Date().toISOString(),
    database: 'MongoDB integration enabled',
    routes: {
      patient: ['POST /signup', 'POST /signin'],
      doctor: ['POST /doctor-signup', 'POST /doctor-signin']
    }
  });
});

// ================================
// PATIENT AUTHENTICATION ROUTES
// ================================

// PATIENT SIGNUP ROUTE
router.post('/signup', signupValidation, async (req, res) => {
  console.log('\n👤 PATIENT SIGNUP REQUEST RECEIVED');
  console.log('Request Body:', JSON.stringify({ ...req.body, password: '[HIDDEN]' }, null, 2));
  
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your information and try again.',
        details: errors.array()
      });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      dateOfBirth, 
      gender, 
      password,
      agreeTerms,
      agreePrivacy,
      subscribeNewsletter
    } = req.body;

    console.log('✅ Validation passed for patient email:', email);

    // Check if user already exists in both collections
    const [existingUser, existingDoctor] = await Promise.all([
      User.findOne({ email: email.toLowerCase() }),
      Doctor.findOne({ email: email.toLowerCase() })
    ]);
    
    if (existingUser) {
      console.log('❌ Patient already exists:', email);
      return res.status(400).json({
        error: 'Account already exists',
        message: 'A patient account with this email already exists. Please sign in instead.'
      });
    }

    if (existingDoctor) {
      console.log('❌ Email registered as doctor:', email);
      return res.status(400).json({
        error: 'Email already registered',
        message: 'This email is registered as a doctor account. Please use doctor sign in.'
      });
    }

    console.log('✅ Patient does not exist, creating new patient...');

    // Create new patient
    const userData = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      dateOfBirth: new Date(dateOfBirth),
      gender,
      password, // Will be hashed by pre-save middleware
      role: 'patient', // Explicitly set role
      preferences: {
        newsletter: subscribeNewsletter === true || subscribeNewsletter === 'true'
      },
      agreements: {
        termsAccepted: {
          accepted: agreeTerms === true || agreeTerms === 'true',
          acceptedAt: new Date(),
          version: '1.0'
        },
        privacyAccepted: {
          accepted: agreePrivacy === true || agreePrivacy === 'true',
          acceptedAt: new Date(),
          version: '1.0'
        }
      }
    };

    console.log('📝 Creating patient with data:', {
      ...userData,
      password: '[HIDDEN]'
    });

    const user = new User(userData);
    console.log('💾 Saving patient to database...');
    
    await user.save();
    
    console.log('✅ Patient saved successfully! ID:', user._id);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: 'patient'
      },
      process.env.JWT_SECRET || 'curesight_jwt_secret_fallback',
      { expiresIn: '7d' }
    );

    console.log('🔑 JWT token generated for patient');

    // Success response
    const responseData = {
      message: 'Patient account created successfully',
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        fullName: user.fullName,
        role: 'patient',
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        createdAt: user.createdAt
      }
    };

    console.log('📤 Sending patient signup success response');
    res.status(201).json(responseData);

  } catch (error) {
    console.error('❌ PATIENT SIGNUP ERROR:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: 'Duplicate data',
        message: `${field} already exists`
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your data',
        details: validationErrors
      });
    }
    
    res.status(500).json({
      error: 'Patient signup failed',
      message: 'Unable to create account. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PATIENT SIGNIN ROUTE
router.post('/signin', signinValidation, async (req, res) => {
  console.log('\n👤 PATIENT SIGNIN REQUEST RECEIVED');
  console.log('Request Body:', { email: req.body.email, rememberMe: req.body.rememberMe });
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, rememberMe } = req.body;

    console.log('🔍 Looking for patient:', email);

    // Find user in database
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ Patient not found:', email);
      
      // Check if email exists as doctor
      const doctor = await Doctor.findOne({ email: email.toLowerCase() });
      if (doctor) {
        return res.status(400).json({
          error: 'Wrong account type',
          message: 'This email is registered as a doctor. Please use doctor sign in.'
        });
      }
      
      return res.status(400).json({
        error: 'Invalid credentials',
        message: 'No patient account found with this email address'
      });
    }

    console.log('✅ Patient found, checking password...');

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for patient:', email);
      return res.status(400).json({
        error: 'Invalid credentials',
        message: 'Incorrect password'
      });
    }

    console.log('✅ Password valid, updating last login...');

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const tokenExpiry = rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: 'patient'
      },
      process.env.JWT_SECRET || 'curesight_jwt_secret_fallback',
      { expiresIn: tokenExpiry }
    );

    console.log('✅ Patient signin successful for:', email);

    res.json({
      message: 'Patient login successful',
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        fullName: user.fullName,
        role: 'patient',
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('❌ PATIENT SIGNIN ERROR:', error);
    res.status(500).json({
      error: 'Patient login failed',
      message: 'Unable to login. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================================
// DOCTOR AUTHENTICATION ROUTES - ENHANCED
// ================================

// DOCTOR SIGNUP ROUTE
router.post('/doctor-signup', doctorSignupValidation, async (req, res) => {
  console.log('\n👨‍⚕️ DOCTOR SIGNUP REQUEST RECEIVED');
  console.log('Request Body:', JSON.stringify({ ...req.body, password: '[HIDDEN]' }, null, 2));
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your information and try again.',
        details: errors.array()
      });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      password,
      medicalLicenseNumber,
      specialization,
      yearsOfExperience,
      hospitalAffiliation,
      phoneNumber,
      city,
      state,
      bio,
      consultationFee,
      languages,
      availableDays,
      agreeTerms,
      agreePrivacy
    } = req.body;

    console.log('✅ Validation passed for doctor email:', email);

    // Check if doctor already exists
    const [existingDoctor, existingUser] = await Promise.all([
      Doctor.findOne({ 
        $or: [
          { email: email.toLowerCase() },
          { medicalLicenseNumber: medicalLicenseNumber.toUpperCase() }
        ]
      }),
      User.findOne({ email: email.toLowerCase() })
    ]);
    
    if (existingDoctor) {
      const conflictField = existingDoctor.email === email.toLowerCase() ? 'email' : 'medical license number';
      console.log('❌ Doctor already exists:', email, conflictField);
      return res.status(400).json({
        error: 'Account already exists',
        message: `A doctor account with this ${conflictField} already exists.`,
        field: conflictField
      });
    }

    if (existingUser) {
      return res.status(400).json({
        error: 'Email already registered',
        message: 'This email is already registered as a patient account. Please use a different email.'
      });
    }

    console.log('✅ Doctor does not exist, creating new doctor...');

    // Create new doctor with EXPLICIT verification fields
    const doctorData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      password,
      medicalLicenseNumber: medicalLicenseNumber.toUpperCase(),
      specialization,
      yearsOfExperience: parseInt(yearsOfExperience),
      hospitalAffiliation: hospitalAffiliation.trim(),
      phoneNumber: phoneNumber.trim(),
      city: city?.trim(),
      state: state?.trim(),
      bio: bio?.trim(),
      consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
      languages: languages && Array.isArray(languages) ? languages : ['English'],
      availableDays: availableDays && Array.isArray(availableDays) ? availableDays : [],
      role: 'doctor',
      
      // EXPLICIT VERIFICATION SETUP - CRITICAL FOR ADMIN APPROVAL
      isVerified: false,
      verificationStatus: 'pending',  // This is what admin looks for
      isActive: true,
      
      // Add agreements tracking
      agreements: {
        termsAccepted: {
          accepted: agreeTerms === true || agreeTerms === 'true',
          acceptedAt: new Date(),
          version: '1.0'
        },
        privacyAccepted: {
          accepted: agreePrivacy === true || agreePrivacy === 'true',
          acceptedAt: new Date(),
          version: '1.0'
        }
      }
    };

    console.log('📝 Creating doctor with verification data:', {
      ...doctorData,
      password: '[HIDDEN]',
      isVerified: doctorData.isVerified,
      verificationStatus: doctorData.verificationStatus
    });

    const doctor = new Doctor(doctorData);
    console.log('💾 Saving doctor to database...');
    
    await doctor.save();
    
    console.log('✅ Doctor saved successfully!');
    console.log('🆔 Doctor ID:', doctor._id);
    console.log('📧 Doctor Email:', doctor.email);
    console.log('🔍 Verification Status:', doctor.verificationStatus);
    console.log('✅ Is Verified:', doctor.isVerified);
    console.log('🏥 Hospital:', doctor.hospitalAffiliation);
    console.log('👨‍⚕️ Specialization:', doctor.specialization);

    // VERIFY THE DOCTOR WAS SAVED WITH CORRECT STATUS
    const savedDoctor = await Doctor.findById(doctor._id);
    console.log('🔍 VERIFICATION CHECK - Doctor saved with status:', savedDoctor.verificationStatus);
    console.log('🔍 VERIFICATION CHECK - Doctor isVerified:', savedDoctor.isVerified);

    // COUNT PENDING DOCTORS TO CONFIRM
    const pendingCount = await Doctor.countDocuments({ verificationStatus: 'pending' });
    console.log('📊 TOTAL PENDING DOCTORS IN DATABASE:', pendingCount);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: doctor._id,
        email: doctor.email,
        role: 'doctor',
        verified: doctor.isVerified
      },
      process.env.JWT_SECRET || 'curesight_jwt_secret_fallback',
      { expiresIn: '30d' }
    );

    console.log('🔑 JWT token generated for doctor');

    // Success response
    const responseData = {
      message: 'Doctor account created successfully! Your account is pending verification by our medical team.',
      success: true,
      token,
      user: {
        id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        fullName: doctor.fullName,
        role: 'doctor',
        specialization: doctor.specialization,
        hospitalAffiliation: doctor.hospitalAffiliation,
        yearsOfExperience: doctor.yearsOfExperience,
        isVerified: doctor.isVerified,
        verificationStatus: doctor.verificationStatus,
        phoneNumber: doctor.phoneNumber,
        city: doctor.city,
        state: doctor.state,
        createdAt: doctor.createdAt
      },
      // Add verification info for frontend
      verification: {
        status: doctor.verificationStatus,
        message: 'Your account is pending verification. You will receive an email once approved.',
        expectedTime: '1-3 business days'
      }
    };

    console.log('📤 Sending doctor signup success response');
    console.log('🎯 RESPONSE VERIFICATION STATUS:', responseData.user.verificationStatus);
    
    res.status(201).json(responseData);

  } catch (error) {
    console.error('❌ DOCTOR SIGNUP ERROR:', error);
    console.error('❌ ERROR STACK:', error.stack);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'medicalLicenseNumber' ? 'medical license number' : field;
      return res.status(400).json({
        error: 'Duplicate data',
        message: `This ${fieldName} is already registered`,
        field: fieldName
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your information',
        details: validationErrors
      });
    }
    
    res.status(500).json({
      error: 'Doctor signup failed',
      message: 'Unable to create doctor account. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DOCTOR SIGNIN ROUTE
router.post('/doctor-signin', doctorSigninValidation, async (req, res) => {
  console.log('\n👨‍⚕️ DOCTOR SIGNIN REQUEST RECEIVED');
  console.log('Request Body:', { email: req.body.email, rememberMe: req.body.rememberMe });
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, rememberMe } = req.body;

    console.log('🔍 Looking for doctor:', email);

    // Find doctor in database
    const doctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (!doctor) {
      console.log('❌ Doctor not found:', email);
      
      // Check if email exists as patient
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        return res.status(400).json({
          error: 'Wrong account type',
          message: 'This email is registered as a patient. Please use patient sign in.'
        });
      }
      
      return res.status(400).json({
        error: 'Invalid credentials',
        message: 'No doctor account found with this email address'
      });
    }

    // Check if account is locked
    if (doctor.isLocked) {
      console.log('🔒 Doctor account is locked:', email);
      return res.status(423).json({
        error: 'Account locked',
        message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.'
      });
    }

    console.log('✅ Doctor found, checking password...');

    // Check password
    const isValidPassword = await doctor.comparePassword(password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for doctor:', email);
      
      // Increment login attempts if method exists
      if (doctor.incLoginAttempts) {
        await doctor.incLoginAttempts();
      }
      
      return res.status(400).json({
        error: 'Invalid credentials',
        message: 'Incorrect password'
      });
    }

    // Reset login attempts on successful login
    if (doctor.loginAttempts > 0) {
      await doctor.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
      });
    }

    console.log('✅ Password valid, updating last login...');

    // Update last login
    doctor.lastLogin = new Date();
    await doctor.save();

    // Generate token
    const tokenExpiry = rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      { 
        userId: doctor._id,
        email: doctor.email,
        role: 'doctor',
        verified: doctor.isVerified
      },
      process.env.JWT_SECRET || 'curesight_jwt_secret_fallback',
      { expiresIn: tokenExpiry }
    );

    console.log('✅ Doctor signin successful for:', email);
    console.log('🔍 Doctor verification status:', doctor.verificationStatus);

    res.json({
      message: 'Doctor login successful',
      success: true,
      token,
      user: {
        id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        fullName: doctor.fullName,
        role: 'doctor',
        specialization: doctor.specialization,
        hospitalAffiliation: doctor.hospitalAffiliation,
        yearsOfExperience: doctor.yearsOfExperience,
        isVerified: doctor.isVerified,
        verificationStatus: doctor.verificationStatus,
        phoneNumber: doctor.phoneNumber,
        city: doctor.city,
        state: doctor.state,
        rating: doctor.rating,
        lastLogin: doctor.lastLogin
      }
    });

  } catch (error) {
    console.error('❌ DOCTOR SIGNIN ERROR:', error);
    res.status(500).json({
      error: 'Doctor login failed',
      message: 'Unable to login. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================================
// UTILITY ROUTES
// ================================

// GET DOCTOR PROFILE (Public)
router.get('/doctor-profile/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .select('-password -loginAttempts -lockUntil -medicalLicenseNumber')
      .lean();
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Doctor not found',
        message: 'No doctor found with this ID'
      });
    }

    // Only show verified doctors publicly
    if (!doctor.isVerified) {
      return res.status(404).json({
        error: 'Doctor not available',
        message: 'This doctor profile is not publicly available'
      });
    }

    res.json({
      success: true,
      doctor
    });

  } catch (error) {
    console.error('❌ Get doctor profile error:', error);
    res.status(500).json({
      error: 'Unable to fetch profile',
      message: 'Please try again later'
    });
  }
});

// GET VERIFIED DOCTORS (Public)
router.get('/doctors', async (req, res) => {
  try {
    const { specialization, city, state, page = 1, limit = 12 } = req.query;
    
    const filter = {
      isVerified: true,
      isActive: true,
      verificationStatus: 'verified'
    };

    if (specialization) filter.specialization = specialization;
    if (city) filter.city = new RegExp(city, 'i');
    if (state) filter.state = state;

    const doctors = await Doctor.find(filter)
      .select('-password -loginAttempts -lockUntil -medicalLicenseNumber')
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Doctor.countDocuments(filter);

    res.json({
      success: true,
      doctors,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('❌ Get doctors error:', error);
    res.status(500).json({
      error: 'Unable to fetch doctors',
      message: 'Please try again later'
    });
  }
});

// DEBUG ROUTE - Check pending doctors count
router.get('/debug/pending-doctors', async (req, res) => {
  try {
    const pendingDoctors = await Doctor.find({ 
      verificationStatus: { $in: ['pending', 'in_review'] }
    }).select('firstName lastName email verificationStatus isVerified createdAt');

    const stats = await Doctor.aggregate([
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('🔍 DEBUG - Pending doctors query result:', pendingDoctors.length);
    console.log('🔍 DEBUG - All verification statuses:', stats);

    res.json({
      success: true,
      debug: true,
      pendingDoctors,
      stats,
      message: `Found ${pendingDoctors.length} pending doctors`
    });

  } catch (error) {
    console.error('❌ Debug route error:', error);
    res.status(500).json({
      error: 'Debug failed',
      message: error.message
    });
  }
});

module.exports = router;
