const mongoose = require('mongoose');

const symptomAnalysisSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Session Info
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  
  // User Input Data
  symptoms: {
    selected: [{
      name: {
        type: String,
        required: true
      },
      severity: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
      }
    }],
    duration: {
      value: Number, // in days
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks', 'months'],
        default: 'days'
      }
    },
    severity: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    },
    additionalInfo: {
      type: String,
      maxlength: 1000
    }
  },
  
  // Patient Context
  patientContext: {
    age: {
      type: Number,
      min: 1,
      max: 120
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    medicalHistory: [String],
    currentMedications: [String],
    allergies: [String]
  },
  
  // AI Analysis Results
  aiAnalysis: {
    // Primary Predictions
    possibleConditions: [{
      name: {
        type: String,
        required: true
      },
      probability: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      description: String,
      icd10Code: String, // Medical classification code
      category: {
        type: String,
        enum: ['common', 'moderate', 'serious', 'emergency']
      }
    }],
    
    // Urgency Assessment
    urgency: {
      level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
      },
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      reasoning: String
    },
    
    // AI Confidence
    confidence: {
      overall: {
        type: Number,
        min: 0,
        max: 100
      },
      dataQuality: {
        type: Number,
        min: 0,
        max: 100
      }
    }
  },
  
  // Medical Recommendations
  recommendations: {
    // Immediate Actions
    immediateActions: [{
      action: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent']
      },
      description: String
    }],
    
    // When to seek help
    seekHelp: {
      timeframe: {
        type: String,
        enum: ['immediate', 'within_hours', 'within_days', 'routine_checkup']
      },
      reasons: [String],
      redFlags: [String] // Warning signs to watch for
    },
    
    // Self-care suggestions
    selfCare: [{
      category: {
        type: String,
        enum: ['rest', 'hydration', 'medication', 'lifestyle', 'monitoring']
      },
      suggestion: String,
      duration: String
    }],
    
    // Follow-up
    followUp: {
      recommended: Boolean,
      timeframe: String,
      reason: String
    }
  },
  
  // Analysis Metadata
  analysisMetadata: {
    modelVersion: String,
    processingTime: Number, // milliseconds
    dataSource: {
      type: String,
      default: 'MedGemma'
    },
    analysisDate: {
      type: Date,
      default: Date.now
    },
    
    // Quality indicators
    inputQuality: {
      symptomClarity: Number, // 0-100
      contextCompleteness: Number, // 0-100
      overall: Number // 0-100
    }
  },
  
  // User Feedback (for model improvement)
  feedback: {
    helpful: Boolean,
    accuracy: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    actualDiagnosis: String, // If user provides later
    submittedAt: Date
  },
  
  // Status and Tracking
  status: {
    type: String,
    enum: ['analyzing', 'completed', 'reviewed', 'archived'],
    default: 'analyzing'
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

// Indexes for performance
symptomAnalysisSchema.index({ userId: 1, createdAt: -1 });
symptomAnalysisSchema.index({ sessionId: 1 });
symptomAnalysisSchema.index({ 'aiAnalysis.urgency.level': 1 });
symptomAnalysisSchema.index({ status: 1 });

// Update timestamp on save
symptomAnalysisSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted duration
symptomAnalysisSchema.virtual('formattedDuration').get(function() {
  if (!this.symptoms.duration.value) return 'Not specified';
  return `${this.symptoms.duration.value} ${this.symptoms.duration.unit}`;
});

// Method to get urgency description
symptomAnalysisSchema.methods.getUrgencyDescription = function() {
  const descriptions = {
    low: 'Monitor symptoms and consider routine healthcare consultation',
    medium: 'Schedule appointment with healthcare provider within a few days',
    high: 'Seek medical attention within 24 hours',
    critical: 'Seek immediate emergency medical care'
  };
  
  return descriptions[this.aiAnalysis.urgency.level] || 'Assessment pending';
};

// Method to get primary condition
symptomAnalysisSchema.methods.getPrimaryCondition = function() {
  if (!this.aiAnalysis.possibleConditions || this.aiAnalysis.possibleConditions.length === 0) {
    return null;
  }
  
  return this.aiAnalysis.possibleConditions.reduce((prev, current) => 
    (prev.probability > current.probability) ? prev : current
  );
};

// Static method to get user's symptom history
symptomAnalysisSchema.statics.getUserSymptomHistory = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('createdAt symptoms.selected aiAnalysis.urgency.level aiAnalysis.possibleConditions status');
};

// Static method for symptom pattern analysis
symptomAnalysisSchema.statics.analyzeSymptomPatterns = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $unwind: '$symptoms.selected'
    },
    {
      $group: {
        _id: '$symptoms.selected.name',
        frequency: { $sum: 1 },
        avgSeverity: { $avg: '$symptoms.selected.severity' },
        lastOccurrence: { $max: '$createdAt' }
      }
    },
    {
      $sort: { frequency: -1 }
    }
  ]);
};

module.exports = mongoose.model('SymptomAnalysis', symptomAnalysisSchema);
