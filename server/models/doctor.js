const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema({
  // Basic Info
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  phoneNumber: {
    type: String,
    trim: true
  },

  // Professional Info
  specialization: {
    type: String,
    required: true
  },
  medicalLicenseNumber: {
    type: String,
    required: true
  },
  yearsOfExperience: {
    type: Number,
    required: true,
    min: 0
  },
  hospitalAffiliation: {
    type: String,
    required: true
  },

  // Location
  city: String,
  state: String,

  // Profile
  bio: String,
  consultationFee: {
    type: Number,
    default: 0
  },
  languages: [String],

  // VERIFICATION FIELDS - ADD THESE IF MISSING
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'in_review', 'verified', 'rejected'],
    default: 'pending'  // IMPORTANT: Default is pending
  },
  verificationNotes: String,
  
  // Verification Tracking
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  documentsRequestedAt: Date,
  documentsRequestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    default: 'doctor'
  },

  // Security
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,

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

// Password hashing middleware
doctorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password comparison method
doctorSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Full name virtual
doctorSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Account lock check
doctorSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Update timestamp on save
doctorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// JSON transform
doctorSchema.methods.toJSON = function() {
  const doctorObject = this.toObject();
  delete doctorObject.password;
  delete doctorObject.loginAttempts;
  delete doctorObject.lockUntil;
  return doctorObject;
};

module.exports = mongoose.model('Doctor', doctorSchema);
