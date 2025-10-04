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

// ================================
// SAVE CONSULTATION RECORD
// ================================
router.post('/save', authenticate, [
  body('patientId').isMongoId().withMessage('Valid patient ID required'),
  body('symptoms').notEmpty().withMessage('Symptoms are required'),
  body('diagnosis').optional().isLength({ max: 1000 }),
  body('doctorNotes').optional().isLength({ max: 1000 }),
  body('prescription').optional().isArray(),
  body('followUpRequired').optional().isBoolean(),
  body('followUpDate').optional().isISO8601(),
  body('appointmentDate').optional().isISO8601(),
  body('appointmentTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
], async (req, res) => {
  console.log('\n📋 SAVE CONSULTATION REQUEST');
  console.log('Doctor:', req.currentUser.email);
  console.log('Request body:', req.body);
  
  try {
    // Check if user is doctor
    if (req.userRole !== 'doctor') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only doctors can save consultations'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      patientId,
      symptoms,
      diagnosis,
      doctorNotes,
      prescription = [],
      followUpRequired = false,
      followUpDate,
      appointmentDate,
      appointmentTime
    } = req.body;

    // Check if patient exists
    const patient = await User.findById(patientId);
    if (!patient) {
      console.log('❌ Patient not found');
      return res.status(404).json({
        error: 'Patient not found',
        message: 'Invalid patient ID'
      });
    }

    console.log('✅ Patient found:', `${patient.firstName} ${patient.lastName}`);

    // Create consultation record as appointment
    const consultation = new Appointment({
      patient: patientId,
      doctor: req.currentUser._id,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : new Date(),
      appointmentTime: appointmentTime || new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: 'consultation',
      symptoms: symptoms.trim(),
      diagnosis: diagnosis ? diagnosis.trim() : '',
      doctorNotes: doctorNotes ? doctorNotes.trim() : '',
      prescription: prescription.map(med => ({
        medicine: med.medicine || med.name || '',
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
        instructions: med.instructions || ''
      })),
      followUpRequired,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      status: 'completed',
      completedAt: new Date(),
      consultationFee: req.currentUser.consultationFee || 500,
      bookedBy: patientId
    });

    console.log('📝 Saving consultation...');
    await consultation.save();

    // Populate consultation data
    const populatedConsultation = await Appointment.findById(consultation._id)
      .populate('doctor', 'firstName lastName specialization hospitalAffiliation')
      .populate('patient', 'firstName lastName email phoneNumber');

    console.log('✅ Consultation saved successfully:', consultation._id);

    res.status(201).json({
      success: true,
      message: 'Consultation saved successfully!',
      consultation: populatedConsultation
    });

  } catch (error) {
    console.error('❌ Save consultation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Save failed',
      message: 'Unable to save consultation. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================================
// UPDATE EXISTING CONSULTATION
// ================================
router.patch('/:consultationId', authenticate, [
  body('symptoms').optional().notEmpty(),
  body('diagnosis').optional().isLength({ max: 1000 }),
  body('doctorNotes').optional().isLength({ max: 1000 }),
  body('prescription').optional().isArray(),
  body('followUpRequired').optional().isBoolean(),
  body('followUpDate').optional().isISO8601(),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled'])
], async (req, res) => {
  console.log('\n🔄 UPDATE CONSULTATION REQUEST');
  
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only doctors can update consultations'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { consultationId } = req.params;
    const updateData = req.body;

    // Process prescription data
    if (updateData.prescription) {
      updateData.prescription = updateData.prescription.map(med => ({
        medicine: med.medicine || med.name || '',
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
        instructions: med.instructions || ''
      }));
    }

    const consultation = await Appointment.findOneAndUpdate(
      { 
        _id: consultationId, 
        doctor: req.currentUser._id 
      },
      {
        ...updateData,
        ...(updateData.status === 'completed' && { completedAt: new Date() })
      },
      { new: true, runValidators: true }
    )
    .populate('patient', 'firstName lastName email phoneNumber')
    .populate('doctor', 'firstName lastName specialization');

    if (!consultation) {
      return res.status(404).json({
        error: 'Consultation not found',
        message: 'No consultation found with this ID'
      });
    }

    console.log('✅ Consultation updated successfully');

    res.json({
      success: true,
      message: 'Consultation updated successfully',
      consultation
    });

  } catch (error) {
    console.error('❌ Update consultation error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: 'Unable to update consultation'
    });
  }
});

// ================================
// GET CONSULTATION DETAILS
// ================================
router.get('/:consultationId', authenticate, async (req, res) => {
  console.log('\n📋 GET CONSULTATION DETAILS');
  
  try {
    const { consultationId } = req.params;

    const consultation = await Appointment.findById(consultationId)
      .populate('doctor', 'firstName lastName specialization hospitalAffiliation')
      .populate('patient', 'firstName lastName email phoneNumber dateOfBirth gender');

    if (!consultation) {
      return res.status(404).json({
        error: 'Consultation not found',
        message: 'No consultation found with this ID'
      });
    }

    // Check access permissions
    const hasAccess = 
      (req.userRole === 'doctor' && consultation.doctor._id.toString() === req.currentUser._id.toString()) ||
      (req.userRole === 'patient' && consultation.patient._id.toString() === req.currentUser._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this consultation'
      });
    }

    res.json({
      success: true,
      consultation
    });

  } catch (error) {
    console.error('❌ Get consultation error:', error);
    res.status(500).json({
      error: 'Unable to fetch consultation',
      message: 'Please try again later'
    });
  }
});

module.exports = router;
