const mongoose = require('mongoose');

let Appointment;

try {
  Appointment = mongoose.model('Appointment');
} catch (error) {
  const appointmentSchema = new mongoose.Schema({
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    appointmentDate: {
      type: Date,
      required: true
    },
    appointmentTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    type: {
      type: String,
      enum: ['consultation', 'follow-up', 'emergency', 'routine-checkup', 'specialist-consultation'],
      default: 'consultation'
    },
    // 🔧 NEW: Appointment Mode
    appointmentMode: {
      type: String,
      enum: ['online', 'clinic', 'home-visit'],
      default: 'clinic',
      required: true
    },
    // 🔧 NEW: Clinic/Location Details
    clinicDetails: {
      address: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String
    },
    // 🔧 NEW: Online Meeting Details
    onlineMeetingDetails: {
      meetingId: String,
      meetingLink: String,
      platform: {
        type: String,
        enum: ['video-call', 'voice-call', 'chat'],
        default: 'video-call'
      }
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled'
    },
    symptoms: {
      type: String,
      required: true,
      maxlength: 1000
    },
    diagnosis: {
      type: String,
      maxlength: 1000
    },
    doctorNotes: {
      type: String,
      maxlength: 1000
    },
    patientNotes: {
      type: String,
      maxlength: 500
    },
    prescription: [{
      medicine: {
        type: String,
        required: true
      },
      dosage: {
        type: String,
        required: true
      },
      frequency: {
        type: String,
        required: true
      },
      duration: {
        type: String,
        required: true
      },
      instructions: {
        type: String
      }
    }],
    consultationFee: {
      type: Number,
      default: 500
    },
    // 🔧 NEW: Payment Details
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'wallet', 'cash', 'insurance'],
      default: 'cash'
    },
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: {
      type: Date
    },
    followUpNotes: {
      type: String,
      maxlength: 500
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    confirmedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      maxlength: 500
    },
    // 🔧 NEW: Rating System
    patientRating: {
      type: Number,
      min: 1,
      max: 5
    },
    patientReview: {
      type: String,
      maxlength: 1000
    },
    doctorRating: {
      type: Number,
      min: 1,
      max: 5
    }
  }, {
    timestamps: true
  });

  // Indexes for better performance
  appointmentSchema.index({ doctor: 1, appointmentDate: 1, appointmentTime: 1 });
  appointmentSchema.index({ patient: 1, appointmentDate: -1 });
  appointmentSchema.index({ status: 1, appointmentDate: 1 });
  appointmentSchema.index({ appointmentDate: 1, status: 1 });
  appointmentSchema.index({ appointmentMode: 1, status: 1 });

  // Virtual for appointment duration
  appointmentSchema.virtual('duration').get(function() {
    if (this.completedAt && this.confirmedAt) {
      return Math.round((this.completedAt - this.confirmedAt) / (1000 * 60)); // minutes
    }
    return null;
  });

  // Pre-save middleware
  appointmentSchema.pre('save', function(next) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
    if (this.status === 'cancelled' && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
    if (this.status === 'confirmed' && !this.confirmedAt) {
      this.confirmedAt = new Date();
    }
    
    // Generate meeting details for online appointments
    if (this.appointmentMode === 'online' && !this.onlineMeetingDetails.meetingId) {
      this.onlineMeetingDetails.meetingId = `meet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.onlineMeetingDetails.meetingLink = `/video-consultation/${this._id}`;
    }
    
    next();
  });

  // Static methods
  appointmentSchema.statics.findUpcoming = function(patientId) {
    return this.find({
      patient: patientId,
      appointmentDate: { $gte: new Date() },
      status: { $nin: ['cancelled', 'completed', 'no-show'] }
    }).populate('doctor', 'firstName lastName specialization hospitalAffiliation consultationFee')
      .sort({ appointmentDate: 1, appointmentTime: 1 });
  };

  appointmentSchema.statics.findByDateRange = function(patientId, startDate, endDate) {
    return this.find({
      patient: patientId,
      appointmentDate: { $gte: startDate, $lte: endDate }
    }).populate('doctor', 'firstName lastName specialization hospitalAffiliation consultationFee')
      .sort({ appointmentDate: -1, appointmentTime: -1 });
  };

  appointmentSchema.statics.findByMode = function(patientId, mode) {
    return this.find({
      patient: patientId,
      appointmentMode: mode
    }).populate('doctor', 'firstName lastName specialization hospitalAffiliation consultationFee')
      .sort({ appointmentDate: -1, appointmentTime: -1 });
  };

  Appointment = mongoose.model('Appointment', appointmentSchema);
}

module.exports = Appointment;
