const express = require('express');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const symptomController = require('../controllers/symptomController');
const auth = require('../middleware/auth');

const router = express.Router();

// Rate limiting for symptom analysis
const symptomLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 analyses per window
  message: {
    error: 'Too many symptom analyses, please try again later.',
    suggestion: 'For urgent symptoms, please contact emergency services directly.'
  }
});

// Validation rules for symptom analysis
const symptomAnalysisValidation = [
  body('symptoms.selected')
    .isArray({ min: 1, max: 20 })
    .withMessage('Please select 1-20 symptoms'),
    
  body('symptoms.selected.*.name')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Symptom name must be 2-100 characters'),
    
  body('symptoms.selected.*.severity')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Symptom severity must be 1-10'),
    
  body('symptoms.duration.value')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Duration must be 0-365'),
    
  body('symptoms.duration.unit')
    .optional()
    .isIn(['hours', 'days', 'weeks', 'months'])
    .withMessage('Invalid duration unit'),
    
  body('symptoms.severity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Overall severity must be 1-10'),
    
  body('symptoms.additionalInfo')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Additional info too long'),
    
  // Patient context validation
  body('patientContext.age')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Age must be 1-120'),
    
  body('patientContext.gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
    .withMessage('Invalid gender'),
    
  body('patientContext.medicalHistory')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Too many medical history items'),
    
  body('patientContext.currentMedications')
    .optional()
    .isArray({ max: 50 })
    .withMessage('Too many medications listed'),
    
  body('patientContext.allergies')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Too many allergies listed')
];

// Routes

// POST /api/symptoms/analyze - Analyze symptoms
router.post('/analyze',
  auth,
  symptomLimiter,
  symptomAnalysisValidation,
  symptomController.analyzeSymptoms
);

// GET /api/symptoms/analysis/:sessionId - Get analysis results
router.get('/analysis/:sessionId',
  auth,
  symptomController.getAnalysisResults
);

// GET /api/symptoms/history - Get user's symptom history
router.get('/history',
  auth,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be 1-50'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be at least 1')
  ],
  symptomController.getSymptomHistory
);

// GET /api/symptoms/patterns - Get symptom patterns analysis
router.get('/patterns',
  auth,
  [
    query('days')
      .optional()
      .isInt({ min: 7, max: 365 })
      .withMessage('Days must be 7-365')
  ],
  symptomController.getSymptomPatterns
);

// POST /api/symptoms/feedback - Submit feedback on analysis
router.post('/feedback',
  auth,
  [
    body('sessionId')
      .notEmpty()
      .withMessage('Session ID is required'),
    body('helpful')
      .isBoolean()
      .withMessage('Helpful must be boolean'),
    body('accuracy')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Accuracy rating must be 1-5'),
    body('comments')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Comments too long'),
    body('actualDiagnosis')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Diagnosis too long')
  ],
  symptomController.submitFeedback
);

// GET /api/symptoms/common - Get common symptoms list
router.get('/common', symptomController.getCommonSymptoms);

// GET /api/symptoms/emergency-signs - Get emergency warning signs
router.get('/emergency-signs', symptomController.getEmergencySigns);

// POST /api/symptoms/quick-check - Quick symptom assessment
router.post('/quick-check',
  auth,
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20 // More frequent for quick checks
  }),
  [
    body('symptoms')
      .isArray({ min: 1, max: 5 })
      .withMessage('Please select 1-5 symptoms for quick check'),
    body('urgencyOnly')
      .optional()
      .isBoolean()
      .withMessage('UrgencyOnly must be boolean')
  ],
  symptomController.quickSymptomCheck
);

// GET /api/symptoms/recommendations/:sessionId - Get detailed recommendations
router.get('/recommendations/:sessionId',
  auth,
  symptomController.getDetailedRecommendations
);

module.exports = router;
