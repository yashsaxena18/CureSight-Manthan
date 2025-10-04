const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Log Date
  date: {
    type: Date,
    required: true,
    default: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
  },
  
  // Sleep Tracking
  sleep: {
    hours: {
      type: Number,
      min: [0, 'Sleep hours cannot be negative'],
      max: [24, 'Sleep hours cannot exceed 24']
    },
    quality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: null
    },
    bedtime: {
      type: String, // Format: "23:30"
      validate: {
        validator: function(time) {
          return !time || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
        },
        message: 'Invalid time format. Use HH:MM format'
      }
    },
    wakeup: {
      type: String, // Format: "07:00"
      validate: {
        validator: function(time) {
          return !time || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
        },
        message: 'Invalid time format. Use HH:MM format'
      }
    }
  },
  
  // Exercise Tracking
  exercise: {
    type: {
      type: String,
      enum: ['cardio', 'strength', 'yoga', 'swimming', 'cycling', 'walking', 'rest', 'other'],
      default: null
    },
    duration: {
      type: Number, // minutes
      min: [0, 'Exercise duration cannot be negative'],
      max: [600, 'Exercise duration seems too high (max 10 hours)']
    },
    intensity: {
      type: String,
      enum: ['low', 'moderate', 'high', 'very-high'],
      default: null
    },
    calories: {
      type: Number,
      min: [0, 'Calories burned cannot be negative'],
      max: [2000, 'Calories burned seems too high']
    }
  },
  
  // Diet & Nutrition Tracking
  diet: {
    meals: {
      type: Number,
      min: [0, 'Number of meals cannot be negative'],
      max: [10, 'Number of meals seems too high'],
      default: null
    },
    water: {
      type: Number, // glasses
      min: [0, 'Water intake cannot be negative'],
      max: [20, 'Water intake seems too high'],
      default: null
    },
    supplements: {
      type: String,
      maxlength: [200, 'Supplements description too long']
    },
    notes: {
      type: String,
      maxlength: [500, 'Diet notes too long']
    }
  },
  
  // Mood & Wellness Tracking
  mood: {
    rating: {
      type: String,
      enum: ['excellent', 'good', 'neutral', 'low', 'poor'],
      default: null
    },
    stress: {
      type: String,
      enum: ['none', 'low', 'moderate', 'high', 'severe'],
      default: null
    },
    energy: {
      type: String,
      enum: ['very-high', 'high', 'moderate', 'low', 'very-low'],
      default: null
    },
    notes: {
      type: String,
      maxlength: [500, 'Mood notes too long']
    }
  },
  
  // Calculated Metrics
  metrics: {
    completenessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    sleepScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    exerciseScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    nutritionScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    moodScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for user and date (ensures one log per user per day)
dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

// Index for date queries
dailyLogSchema.index({ date: -1 });

// Pre-save middleware to calculate scores
dailyLogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate completeness score
  this.metrics.completenessScore = this.calculateCompleteness();
  
  // Calculate individual category scores
  this.metrics.sleepScore = this.calculateSleepScore();
  this.metrics.exerciseScore = this.calculateExerciseScore();
  this.metrics.nutritionScore = this.calculateNutritionScore();
  this.metrics.moodScore = this.calculateMoodScore();
  
  // Calculate overall score
  this.metrics.overallScore = this.calculateOverallScore();
  
  next();
});

// Method to calculate completeness percentage
dailyLogSchema.methods.calculateCompleteness = function() {
  let filledFields = 0;
  let totalFields = 0;
  
  // Sleep fields (4)
  totalFields += 4;
  if (this.sleep.hours !== null && this.sleep.hours !== undefined) filledFields++;
  if (this.sleep.quality) filledFields++;
  if (this.sleep.bedtime) filledFields++;
  if (this.sleep.wakeup) filledFields++;
  
  // Exercise fields (4)
  totalFields += 4;
  if (this.exercise.type) filledFields++;
  if (this.exercise.duration !== null && this.exercise.duration !== undefined) filledFields++;
  if (this.exercise.intensity) filledFields++;
  if (this.exercise.calories !== null && this.exercise.calories !== undefined) filledFields++;
  
  // Diet fields (4)
  totalFields += 4;
  if (this.diet.meals !== null && this.diet.meals !== undefined) filledFields++;
  if (this.diet.water !== null && this.diet.water !== undefined) filledFields++;
  if (this.diet.supplements) filledFields++;
  if (this.diet.notes) filledFields++;
  
  // Mood fields (4)
  totalFields += 4;
  if (this.mood.rating) filledFields++;
  if (this.mood.stress) filledFields++;
  if (this.mood.energy) filledFields++;
  if (this.mood.notes) filledFields++;
  
  return Math.round((filledFields / totalFields) * 100);
};

// Method to calculate sleep score
dailyLogSchema.methods.calculateSleepScore = function() {
  let score = 0;
  
  // Hours score (0-40 points)
  if (this.sleep.hours) {
    if (this.sleep.hours >= 7 && this.sleep.hours <= 9) {
      score += 40; // Optimal sleep
    } else if (this.sleep.hours >= 6 && this.sleep.hours <= 10) {
      score += 30; // Good sleep
    } else if (this.sleep.hours >= 5 && this.sleep.hours <= 11) {
      score += 20; // Fair sleep
    } else {
      score += 10; // Poor sleep
    }
  }
  
  // Quality score (0-30 points)
  const qualityScores = {
    'excellent': 30,
    'good': 25,
    'fair': 15,
    'poor': 5
  };
  if (this.sleep.quality) {
    score += qualityScores[this.sleep.quality] || 0;
  }
  
  // Consistency bonus (0-30 points) - if both bedtime and wakeup provided
  if (this.sleep.bedtime && this.sleep.wakeup) {
    score += 30;
  } else if (this.sleep.bedtime || this.sleep.wakeup) {
    score += 15;
  }
  
  return Math.min(score, 100);
};

// Method to calculate exercise score
dailyLogSchema.methods.calculateExerciseScore = function() {
  let score = 0;
  
  // Type score (0-25 points)
  if (this.exercise.type) {
    if (this.exercise.type === 'rest') {
      score += 15; // Rest day is important
    } else {
      score += 25; // Active exercise
    }
  }
  
  // Duration score (0-35 points)
  if (this.exercise.duration) {
    if (this.exercise.duration >= 30 && this.exercise.duration <= 90) {
      score += 35; // Optimal duration
    } else if (this.exercise.duration >= 15 && this.exercise.duration <= 120) {
      score += 25; // Good duration
    } else if (this.exercise.duration >= 10) {
      score += 15; // Some exercise
    }
  }
  
  // Intensity score (0-25 points)
  const intensityScores = {
    'very-high': 25,
    'high': 22,
    'moderate': 20,
    'low': 15
  };
  if (this.exercise.intensity) {
    score += intensityScores[this.exercise.intensity] || 0;
  }
  
  // Calorie tracking bonus (0-15 points)
  if (this.exercise.calories) {
    score += 15;
  }
  
  return Math.min(score, 100);
};

// Method to calculate nutrition score
dailyLogSchema.methods.calculateNutritionScore = function() {
  let score = 0;
  
  // Meals score (0-30 points)
  if (this.diet.meals) {
    if (this.diet.meals >= 3 && this.diet.meals <= 5) {
      score += 30; // Optimal meal frequency
    } else if (this.diet.meals >= 2 && this.diet.meals <= 6) {
      score += 20; // Good meal frequency
    } else {
      score += 10; // Suboptimal
    }
  }
  
  // Water score (0-30 points)
  if (this.diet.water) {
    if (this.diet.water >= 8) {
      score += 30; // Optimal hydration
    } else if (this.diet.water >= 6) {
      score += 25; // Good hydration
    } else if (this.diet.water >= 4) {
      score += 15; // Fair hydration
    } else {
      score += 5; // Poor hydration
    }
  }
  
  // Supplements tracking (0-20 points)
  if (this.diet.supplements) {
    score += 20;
  }
  
  // Notes bonus (0-20 points) - shows mindful eating
  if (this.diet.notes) {
    score += 20;
  }
  
  return Math.min(score, 100);
};

// Method to calculate mood score
dailyLogSchema.methods.calculateMoodScore = function() {
  let score = 0;
  
  // Mood rating (0-40 points)
  const moodScores = {
    'excellent': 40,
    'good': 35,
    'neutral': 25,
    'low': 15,
    'poor': 5
  };
  if (this.mood.rating) {
    score += moodScores[this.mood.rating] || 0;
  }
  
  // Stress level (0-30 points, inverted - less stress = higher score)
  const stressScores = {
    'none': 30,
    'low': 25,
    'moderate': 15,
    'high': 8,
    'severe': 2
  };
  if (this.mood.stress) {
    score += stressScores[this.mood.stress] || 0;
  }
  
  // Energy level (0-30 points)
  const energyScores = {
    'very-high': 30,
    'high': 25,
    'moderate': 20,
    'low': 10,
    'very-low': 5
  };
  if (this.mood.energy) {
    score += energyScores[this.mood.energy] || 0;
  }
  
  return Math.min(score, 100);
};

// Method to calculate overall wellness score
dailyLogSchema.methods.calculateOverallScore = function() {
  const weights = {
    sleep: 0.3,      // 30% weight
    exercise: 0.25,  // 25% weight
    nutrition: 0.25, // 25% weight
    mood: 0.2        // 20% weight
  };
  
  const weightedScore = 
    (this.metrics.sleepScore * weights.sleep) +
    (this.metrics.exerciseScore * weights.exercise) +
    (this.metrics.nutritionScore * weights.nutrition) +
    (this.metrics.moodScore * weights.mood);
  
  return Math.round(weightedScore);
};

// Static method to get user's weekly summary
dailyLogSchema.statics.getWeeklySummary = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        avgOverallScore: { $avg: '$metrics.overallScore' },
        avgSleepScore: { $avg: '$metrics.sleepScore' },
        avgExerciseScore: { $avg: '$metrics.exerciseScore' },
        avgNutritionScore: { $avg: '$metrics.nutritionScore' },
        avgMoodScore: { $avg: '$metrics.moodScore' },
        totalLogs: { $sum: 1 },
        avgSleepHours: { $avg: '$sleep.hours' },
        totalExerciseMinutes: { $sum: '$exercise.duration' }
      }
    }
  ]);
};

// Static method to get user's health trends
dailyLogSchema.statics.getHealthTrends = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    userId,
    date: { $gte: startDate }
  })
  .select('date metrics.overallScore metrics.sleepScore metrics.exerciseScore metrics.nutritionScore metrics.moodScore')
  .sort({ date: 1 });
};

module.exports = mongoose.model('DailyLog', dailyLogSchema);
