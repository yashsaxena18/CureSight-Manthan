const express = require('express');
const router = express.Router();
const Appointment = require('../models/appointment'); // Fixed import
const User = require('../models/User');
const Message = require('../models/Message');
const verifyToken = require('../middleware/authmiddleware');

// Get patient consultation history (FIXED)
router.get('/patients/:patientId/consultations', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.userId;

    console.log(`📋 Fetching consultations for patient: ${patientId}, doctor: ${doctorId}`);

    // Get all appointments for this patient with this doctor
    const consultations = await Appointment.find({
      patient: patientId,
      doctor: doctorId,
      // Include all statuses to show complete history
      status: { $in: ['completed', 'in-progress', 'scheduled', 'confirmed'] }
    })
    .populate('patient', 'firstName lastName email dateOfBirth gender')
    .populate('doctor', 'firstName lastName specialization')
    .sort({ appointmentDate: -1, appointmentTime: -1 });

    console.log(`✅ Found ${consultations.length} consultations`);

    // Transform data for frontend
    const transformedConsultations = consultations.map(consultation => ({
      _id: consultation._id,
      appointmentDate: consultation.appointmentDate,
      appointmentTime: consultation.appointmentTime,
      symptoms: consultation.symptoms || '',
      diagnosis: consultation.diagnosis || '',
      doctorNotes: consultation.doctorNotes || '',
      prescription: consultation.prescription || [],
      status: consultation.status,
      followUpRequired: consultation.followUpRequired || false,
      followUpDate: consultation.followUpDate,
      createdAt: consultation.createdAt,
      patient: consultation.patient,
      doctor: consultation.doctor,
      type: consultation.type
    }));

    res.json({
      success: true,
      consultations: transformedConsultations,
      count: transformedConsultations.length
    });

  } catch (error) {
    console.error('❌ Error fetching consultations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consultation history',
      error: error.message
    });
  }
});

// Get patient details (FIXED)
router.get('/patients/:patientId', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.userId;

    console.log(`👤 Fetching patient details: ${patientId} for doctor: ${doctorId}`);

    const patient = await User.findById(patientId).select('-password');
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get appointment count with this doctor
    const appointmentCount = await Appointment.countDocuments({
      patient: patientId,
      doctor: doctorId
    });

    // Get last appointment
    const lastAppointment = await Appointment.findOne({
      patient: patientId,
      doctor: doctorId
    }).sort({ appointmentDate: -1, appointmentTime: -1 });

    const patientData = {
      _id: patient._id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phoneNumber: patient.phoneNumber,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
      medicalHistory: patient.medicalHistory,
      allergies: patient.allergies,
      bloodGroup: patient.bloodGroup,
      height: patient.height,
      weight: patient.weight,
      appointmentCount,
      lastAppointment: lastAppointment ? lastAppointment.appointmentDate : new Date()
    };

    console.log('✅ Patient details fetched successfully');

    res.json({
      success: true,
      patient: patientData
    });

  } catch (error) {
    console.error('❌ Error fetching patient details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient details',
      error: error.message
    });
  }
});

// Get patient health records
router.get('/patients/:patientId/health-records', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // For now, return empty array - later you can add HealthRecord model
    const healthRecords = [];

    res.json({
      success: true,
      records: healthRecords,
      count: healthRecords.length
    });

  } catch (error) {
    console.error('❌ Error fetching health records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health records',
      error: error.message
    });
  }
});

// Get patient chat history (FIXED)
router.get('/patients/:patientId/messages', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.userId;

    console.log(`📬 Fetching chat history: Doctor ${doctorId} ↔ Patient ${patientId}`);

    const messages = await Message.find({
      $or: [
        { sender: doctorId, recipient: patientId },
        { sender: patientId, recipient: doctorId }
      ]
    })
    .populate('sender', 'firstName lastName role')
    .sort({ createdAt: -1 })
    .limit(100);
    
    // Add sender names and reverse for chronological order
    const messagesWithNames = messages.reverse().map(msg => ({
      ...msg.toObject(),
      senderName: msg.sender.role === 'doctor' 
        ? `Dr. ${msg.sender.firstName} ${msg.sender.lastName}`
        : `${msg.sender.firstName} ${msg.sender.lastName}`
    }));

    console.log(`✅ Found ${messagesWithNames.length} messages`);

    res.json({
      success: true,
      messages: messagesWithNames,
      count: messagesWithNames.length
    });

  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: error.message
    });
  }
});

module.exports = router;
