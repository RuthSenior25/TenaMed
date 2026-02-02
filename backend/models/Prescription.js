const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  drug: {
    name: {
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
    instructions: {
      type: String
    },
    duration: {
      type: String
    },
    quantity: {
      type: Number,
      required: true
    },
    refills: {
      type: Number,
      default: 0,
      min: 0
    },
    refillsUsed: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending_refill'],
    default: 'active'
  },
  prescribedDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  lastRefillDate: {
    type: Date
  },
  refillRequests: [{
    requestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    processedDate: Date,
    notes: String
  }]
}, {
  timestamps: true
});

// Index for efficient queries
prescriptionSchema.index({ patientId: 1, status: 1 });
prescriptionSchema.index({ pharmacyId: 1, status: 1 });
prescriptionSchema.index({ doctorId: 1, status: 1 });

// Virtual for checking if refills are available
prescriptionSchema.virtual('refillsAvailable').get(function() {
  return this.drug.refills - this.drug.refillsUsed;
});

// Virtual for checking if prescription is expired
prescriptionSchema.virtual('isExpired').get(function() {
  return this.expiryDate && this.expiryDate < new Date();
});

// Method to request a refill
prescriptionSchema.methods.requestRefill = function(notes) {
  if (this.drug.refillsUsed >= this.drug.refills) {
    throw new Error('No refills remaining');
  }
  
  this.refillRequests.push({
    requestDate: new Date(),
    status: 'pending',
    notes: notes
  });
  
  this.status = 'pending_refill';
  return this.save();
};

// Method to approve a refill
prescriptionSchema.methods.approveRefill = function(requestIndex, notes) {
  if (requestIndex >= this.refillRequests.length) {
    throw new Error('Invalid refill request');
  }
  
  const request = this.refillRequests[requestIndex];
  if (request.status !== 'pending') {
    throw new Error('Refill request already processed');
  }
  
  request.status = 'approved';
  request.processedDate = new Date();
  request.notes = notes;
  
  this.drug.refillsUsed += 1;
  this.lastRefillDate = new Date();
  this.status = 'active';
  
  return this.save();
};

// Pre-save middleware to set expiry date if not provided
prescriptionSchema.pre('save', function(next) {
  if (!this.expiryDate && this.drug.duration) {
    // Parse duration (e.g., "30 days", "3 months")
    const durationMatch = this.drug.duration.match(/(\d+)\s*(day|week|month|year)s?/i);
    if (durationMatch) {
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      
      let expiryDate = new Date(this.prescribedDate);
      switch (unit) {
        case 'day':
          expiryDate.setDate(expiryDate.getDate() + value);
          break;
        case 'week':
          expiryDate.setDate(expiryDate.getDate() + (value * 7));
          break;
        case 'month':
          expiryDate.setMonth(expiryDate.getMonth() + value);
          break;
        case 'year':
          expiryDate.setFullYear(expiryDate.getFullYear() + value);
          break;
      }
      this.expiryDate = expiryDate;
    }
  }
  next();
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
