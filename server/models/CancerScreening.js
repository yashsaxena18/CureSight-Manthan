const mongoose = require('mongoose');

const cancerScreeningSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Image Information
  imageDetails: {
    originalName: String,
    filename: String, // Stored filename
    filepath: String, // Full path to file
    mimetype: String,
    size: Number, // File size in bytes
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Processing Status
  status: {
    type: String,
    enum: ['uploading', 'processing', 'analyzing', 'completed', 'failed'],
    default: 'uploading'
  },
  
  // AI Analysis Results
  aiAnalysis: {
    // Primary Results
    suspiciousScore: {
      type: Number,
      min: 0,
      max: 1 // 0 = normal, 1 = highly suspicious
    },
    
    riskCategory: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
      default: 'low'
    },
    
    confidence: {
      type: Number,
      min: 0,
      max: 100 // Confidence percentage
    },
    
    // Detected Features
    detectedAbnormalities: [{
      type: {
        type: String,
        enum: ['mass', 'calcification', 'architectural_distortion', 'asymmetry']
      },
      location: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      },
      confidence: Number,
      description: String
    }],
    
    // BIRADS Classification
    biRadsCategory: {
      type: Number,
      min: 0,
      max: 6
    },
    
    // Image Quality Assessment
    imageQuality: {
      score: Number, // 0-100
      issues: [String], // positioning, compression, etc.
      enhancement: {
        applied: Boolean,
        methods: [String] // CLAHE, median filter, etc.
      }
    }
  },
  
  // Medical Recommendations
  recommendations: {
    // Immediate Actions
    immediateAction: {
      type: String,
      enum: ['routine_followup', 'short_term_followup', 'immediate_consultation', 'urgent_referral'],
      default: 'routine_followup'
    },
    
    // Follow-up Timeline
    followUpRecommended: {
      type: String,
      enum: ['none', '6_months', '1_year', '2_years', 'immediate']
    },
    
    // Additional Tests
    additionalTests: [{
      testType: String, // 'ultrasound', 'MRI', 'biopsy'
      priority: String, // 'routine', 'urgent', 'stat'
      reason: String
    }],
    
    // Lifestyle Recommendations
    lifestyle: {
      dietSuggestions: [String],
      exerciseRecommendations: [String],
      riskFactorModifications: [String]
    }
  },
  
  // Analysis Metadata
  analysisMetadata: {
    modelVersion: String, // MedGemma version used
    processingTime: Number, // Time in milliseconds
    enhancementApplied: Boolean,
    preprocessingSteps: [String],
    
    // Technical Details
    imageEnhancements: {
      contrastImprovement: Number,
      noiseReduction: Boolean,
      pectoralMuscleRemoval: Boolean
    }
  },
  
  // Medical Context
  patientContext: {
    age: Number,
    familyHistory: Boolean,
    previousScreenings: Boolean,
    riskFactors: [String],
    currentSymptoms: [String]
  },
  
  // Review Information
  review: {
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: String, // Medical professional ID
    reviewedAt: Date,
    reviewNotes: String,
    finalRecommendation: String
  },
  
  // Audit Trail
  auditTrail: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String,
    ipAddress: String,
    userAgent: String
  }],
  
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
cancerScreeningSchema.index({ userId: 1, createdAt: -1 });
cancerScreeningSchema.index({ status: 1 });
cancerScreeningSchema.index({ 'aiAnalysis.riskCategory': 1 });

// Update timestamp on save
cancerScreeningSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to add audit trail entry
cancerScreeningSchema.methods.addAuditEntry = function(action, details, req) {
  this.auditTrail.push({
    action,
    details,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
};

// Method to get risk description
cancerScreeningSchema.methods.getRiskDescription = function() {
  const riskDescriptions = {
    low: 'Low risk - Routine screening recommended',
    moderate: 'Moderate risk - Consider additional imaging or shorter follow-up interval',
    high: 'High risk - Recommend immediate consultation with specialist',
    critical: 'Critical findings - Urgent medical evaluation required'
  };
  
  return riskDescriptions[this.aiAnalysis.riskCategory] || 'Assessment pending';
};

// Static method to get user screening history
cancerScreeningSchema.statics.getUserScreeningHistory = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('createdAt aiAnalysis.riskCategory aiAnalysis.suspiciousScore status');
};

module.exports = mongoose.model('CancerScreening', cancerScreeningSchema);
