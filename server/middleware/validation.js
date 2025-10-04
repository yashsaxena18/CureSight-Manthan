const multer = require('multer');
const path = require('path');

// File validation middleware
const validateImageFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Please select a file to upload'
    });
  }

  const file = req.file;
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/tiff',
    'image/bmp',
    'application/dicom',
    'application/pdf'
  ];

  // Validate file type
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only medical images and PDF files are allowed',
      allowedTypes: allowedTypes
    });
  }

  // Validate file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return res.status(400).json({
      error: 'File too large',
      message: 'Maximum file size is 50MB',
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      maxSize: '50MB'
    });
  }

  // Validate file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.dcm', '.dicom', '.pdf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return res.status(400).json({
      error: 'Invalid file extension',
      message: 'File extension not supported',
      allowedExtensions: allowedExtensions
    });
  }

  next();
};

// Medical data validation
const validateMedicalData = (req, res, next) => {
  const { patientContext } = req.body;
  
  if (patientContext) {
    // Age validation
    if (patientContext.age && (patientContext.age < 1 || patientContext.age > 120)) {
      return res.status(400).json({
        error: 'Invalid age',
        message: 'Age must be between 1 and 120 years'
      });
    }

    // Gender validation
    const validGenders = ['male', 'female', 'other', 'prefer-not-to-say'];
    if (patientContext.gender && !validGenders.includes(patientContext.gender)) {
      return res.status(400).json({
        error: 'Invalid gender',
        message: 'Gender must be one of: ' + validGenders.join(', ')
      });
    }

    // Medical history validation
    if (patientContext.medicalHistory && !Array.isArray(patientContext.medicalHistory)) {
      return res.status(400).json({
        error: 'Invalid medical history format',
        message: 'Medical history must be an array of strings'
      });
    }
  }

  next();
};

// Symptom data validation
const validateSymptomData = (req, res, next) => {
  const { symptoms } = req.body;

  if (!symptoms) {
    return res.status(400).json({
      error: 'Missing symptoms data',
      message: 'Symptoms data is required'
    });
  }

  // Validate selected symptoms
  if (!symptoms.selected || !Array.isArray(symptoms.selected) || symptoms.selected.length === 0) {
    return res.status(400).json({
      error: 'No symptoms selected',
      message: 'Please select at least one symptom'
    });
  }

  if (symptoms.selected.length > 20) {
    return res.status(400).json({
      error: 'Too many symptoms',
      message: 'Maximum 20 symptoms can be selected'
    });
  }

  // Validate each symptom
  for (const symptom of symptoms.selected) {
    if (!symptom.name || typeof symptom.name !== 'string') {
      return res.status(400).json({
        error: 'Invalid symptom data',
        message: 'Each symptom must have a valid name'
      });
    }

    if (symptom.severity && (symptom.severity < 1 || symptom.severity > 10)) {
      return res.status(400).json({
        error: 'Invalid symptom severity',
        message: 'Symptom severity must be between 1 and 10'
      });
    }
  }

  // Validate duration
  if (symptoms.duration) {
    if (symptoms.duration.value && (symptoms.duration.value < 0 || symptoms.duration.value > 365)) {
      return res.status(400).json({
        error: 'Invalid symptom duration',
        message: 'Duration must be between 0 and 365'
      });
    }

    const validUnits = ['hours', 'days', 'weeks', 'months'];
    if (symptoms.duration.unit && !validUnits.includes(symptoms.duration.unit)) {
      return res.status(400).json({
        error: 'Invalid duration unit',
        message: 'Duration unit must be one of: ' + validUnits.join(', ')
      });
    }
  }

  // Validate overall severity
  if (symptoms.severity && (symptoms.severity < 1 || symptoms.severity > 10)) {
    return res.status(400).json({
      error: 'Invalid overall severity',
      message: 'Overall severity must be between 1 and 10'
    });
  }

  next();
};

// Health data validation
const validateHealthData = (req, res, next) => {
  const { sleep, exercise, diet, mood } = req.body;

  // Sleep validation
  if (sleep) {
    if (sleep.hours && (sleep.hours < 0 || sleep.hours > 24)) {
      return res.status(400).json({
        error: 'Invalid sleep hours',
        message: 'Sleep hours must be between 0 and 24'
      });
    }

    const validQualities = ['excellent', 'good', 'fair', 'poor'];
    if (sleep.quality && !validQualities.includes(sleep.quality)) {
      return res.status(400).json({
        error: 'Invalid sleep quality',
        message: 'Sleep quality must be one of: ' + validQualities.join(', ')
      });
    }
  }

  // Exercise validation
  if (exercise) {
    if (exercise.duration && (exercise.duration < 0 || exercise.duration > 600)) {
      return res.status(400).json({
        error: 'Invalid exercise duration',
        message: 'Exercise duration must be between 0 and 600 minutes'
      });
    }

    if (exercise.calories && (exercise.calories < 0 || exercise.calories > 2000)) {
      return res.status(400).json({
        error: 'Invalid calories',
        message: 'Calories must be between 0 and 2000'
      });
    }
  }

  // Diet validation
  if (diet) {
    if (diet.meals && (diet.meals < 0 || diet.meals > 10)) {
      return res.status(400).json({
        error: 'Invalid meals count',
        message: 'Number of meals must be between 0 and 10'
      });
    }

    if (diet.water && (diet.water < 0 || diet.water > 20)) {
      return res.status(400).json({
        error: 'Invalid water intake',
        message: 'Water intake must be between 0 and 20 glasses'
      });
    }
  }

  next();
};

module.exports = {
  validateImageFile,
  validateMedicalData,
  validateSymptomData,
  validateHealthData
};
