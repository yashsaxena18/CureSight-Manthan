const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const cancerController = require('../controllers/cancerController');
const auth = require('../middleware/auth');
const { validateImageFile } = require('../middleware/validation');

const router = express.Router();

// Rate limiting for cancer analysis
const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 analyses per hour per user
  message: {
    error: 'Too many analysis requests. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true
});

// File upload configuration for medical images [web:115][web:122]
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/cancer-screening/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `mammogram_${req.user.id}_${uniqueSuffix}_${sanitizedName}`);
  }
});

// File filter for medical images
const fileFilter = (req, file, cb) => {
  // Accept only image files and DICOM
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/tiff',
    'image/bmp',
    'application/dicom',
    'application/octet-stream' // DICOM files sometimes have this mimetype
  ];
  
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.dcm', '.dicom'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only mammogram image files are allowed (JPEG, PNG, TIFF, BMP, DICOM)'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for high-res medical images
    files: 1
  },
  fileFilter: fileFilter
});

// Validation middleware
const patientContextValidation = [
  body('age')
    .optional()
    .isInt({ min: 18, max: 120 })
    .withMessage('Age must be between 18 and 120'),
    
  body('familyHistory')
    .optional()
    .isBoolean()
    .withMessage('Family history must be true or false'),
    
  body('previousScreenings')
    .optional()
    .isBoolean()
    .withMessage('Previous screenings must be true or false'),
    
  body('riskFactors')
    .optional()
    .isArray()
    .withMessage('Risk factors must be an array'),
    
  body('currentSymptoms')
    .optional()
    .isArray()
    .withMessage('Current symptoms must be an array')
];

// Routes
// POST /api/cancer/analyze - Upload and analyze mammogram
router.post('/analyze', 
  auth,
  analysisLimiter,
  upload.single('mammogram'),
  validateImageFile,
  patientContextValidation,
  cancerController.analyzeMammogram
);

// GET /api/cancer/analysis/:id - Get specific analysis results
router.get('/analysis/:id', 
  auth, 
  cancerController.getAnalysisResults
);

// GET /api/cancer/history - Get user's screening history
router.get('/history', 
  auth,
  cancerController.getScreeningHistory
);

// POST /api/cancer/analysis/:id/download-report - Download detailed report
router.post('/analysis/:id/download-report',
  auth,
  cancerController.downloadReport
);

// GET /api/cancer/risk-assessment - Get personalized risk assessment
router.get('/risk-assessment',
  auth,
  cancerController.getRiskAssessment
);

// POST /api/cancer/schedule-followup - Schedule follow-up appointment
router.post('/schedule-followup',
  auth,
  [
    body('analysisId').notEmpty().withMessage('Analysis ID is required'),
    body('preferredDate').isDate().withMessage('Valid preferred date is required'),
    body('timeSlot').notEmpty().withMessage('Time slot is required')
  ],
  cancerController.scheduleFollowUp
);

// GET /api/cancer/statistics - Get detection statistics (public)
router.get('/statistics', cancerController.getStatistics);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Maximum file size is 50MB'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Invalid file field',
        message: 'Use "mammogram" as the file field name'
      });
    }
  }
  
  if (error.message.includes('Only mammogram image files')) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: error.message
    });
  }
  
  next(error);
});

module.exports = router;
