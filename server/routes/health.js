const express = require('express');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const healthController = require('../controllers/healthController');
const auth = require('../middleware/auth');

const router = express.Router();

// Rate limiting for health endpoints
const healthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: {
    error: 'Too many health requests, please try again later.'
  }
});

// Validation rules for daily log
const dailyLogValidation = [
  // Sleep validation
  body('sleep.hours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Sleep hours must be between 0 and 24'),
    
  body('sleep.quality')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'poor'])
    .withMessage('Invalid sleep quality'),
    
  body('sleep.bedtime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Bedtime must be in HH:MM format'),
    
  body('sleep.wakeup')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Wake up time must be in HH:MM format'),

  // Exercise validation
  body('exercise.type')
    .optional()
    .isIn(['cardio', 'strength', 'yoga', 'swimming', 'cycling', 'walking', 'rest', 'other'])
    .withMessage('Invalid exercise type'),
    
  body('exercise.duration')
    .optional()
    .isInt({ min: 0, max: 600 })
    .withMessage('Exercise duration must be between 0 and 600 minutes'),
    
  body('exercise.intensity')
    .optional()
    .isIn(['low', 'moderate', 'high', 'very-high'])
    .withMessage('Invalid exercise intensity'),
    
  body('exercise.calories')
    .optional()
    .isInt({ min: 0, max: 2000 })
    .withMessage('Calories must be between 0 and 2000'),

  // Diet validation
  body('diet.meals')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Number of meals must be between 0 and 10'),
    
  body('diet.water')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Water intake must be between 0 and 20 glasses'),
    
  body('diet.supplements')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Supplements description too long'),
    
  body('diet.notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Diet notes too long'),

  // Mood validation
  body('mood.rating')
    .optional()
    .isIn(['excellent', 'good', 'neutral', 'low', 'poor'])
    .withMessage('Invalid mood rating'),
    
  body('mood.stress')
    .optional()
    .isIn(['none', 'low', 'moderate', 'high', 'severe'])
    .withMessage('Invalid stress level'),
    
  body('mood.energy')
    .optional()
    .isIn(['very-high', 'high', 'moderate', 'low', 'very-low'])
    .withMessage('Invalid energy level'),
    
  body('mood.notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mood notes too long')
];

// Date validation for queries
const dateValidation = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
    
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
];

// Routes

// POST /api/health/daily-log - Save or update daily log
router.post('/daily-log', 
  auth,
  healthLimiter,
  dailyLogValidation,
  healthController.saveDailyLog
);

// GET /api/health/daily-log - Get daily log (today's or specific date)
router.get('/daily-log',
  auth,
  dateValidation,
  healthController.getDailyLog
);

// GET /api/health/history - Get health history
router.get('/history',
  auth,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be at least 1'),
    ...dateValidation
  ],
  healthController.getHealthHistory
);

// GET /api/health/metrics - Get health metrics and statistics
router.get('/metrics',
  auth,
  dateValidation,
  healthController.getHealthMetrics
);

// GET /api/health/trends - Get health trends for charts
router.get('/trends',
  auth,
  dateValidation,
  healthController.getHealthTrends
);

// GET /api/health/weekly-summary - Get weekly summary
router.get('/weekly-summary',
  auth,
  dateValidation,
  healthController.getWeeklySummary
);

// GET /api/health/insights - Get AI-powered health insights
router.get('/insights',
  auth,
  healthController.getHealthInsights
);

// POST /api/health/goals - Set health goals
router.post('/goals',
  auth,
  [
    body('sleepGoal')
      .optional()
      .isFloat({ min: 6, max: 12 })
      .withMessage('Sleep goal must be between 6 and 12 hours'),
    body('exerciseGoal')
      .optional()
      .isInt({ min: 1, max: 7 })
      .withMessage('Exercise goal must be between 1 and 7 days per week'),
    body('waterGoal')
      .optional()
      .isInt({ min: 4, max: 15 })
      .withMessage('Water goal must be between 4 and 15 glasses')
  ],
  healthController.setHealthGoals
);

// GET /api/health/goals - Get user's health goals
router.get('/goals',
  auth,
  healthController.getHealthGoals
);

// DELETE /api/health/daily-log - Delete a daily log
router.delete('/daily-log',
  auth,
  [
    query('date')
      .notEmpty()
      .isISO8601()
      .withMessage('Valid date is required')
  ],
  healthController.deleteDailyLog
);

module.exports = router;
