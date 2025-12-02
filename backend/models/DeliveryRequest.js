const mongoose = require('mongoose');

const deliveryRequestSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    required: true
  },
  items: [{
    drug: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drug',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    prescriptionRequired: {
      type: Boolean,
      default: false
    }
  }],
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    landmark: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  contactPhone: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'on-the-way', 'delivered', 'cancelled'],
    default: 'pending'
  },
  dispatcher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile'],
    default: 'cash'
  },
  prescriptionImage: {
    type: String, // URL to uploaded prescription image
    required: function() {
      return this.items.some(item => item.prescriptionRequired);
    }
  },
  estimatedDeliveryTime: {
    type: Date
  },
  actualDeliveryTime: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 500
  },
  trackingCode: {
    type: String,
    unique: true,
    required: true
  },
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, maxlength: 200 }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate unique tracking code before save
deliveryRequestSchema.pre('save', function(next) {
  if (this.isNew && !this.trackingCode) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.trackingCode = `TNMD-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Index for efficient queries
deliveryRequestSchema.index({ patient: 1, status: 1 });
deliveryRequestSchema.index({ pharmacy: 1, status: 1 });
deliveryRequestSchema.index({ dispatcher: 1, status: 1 });
deliveryRequestSchema.index({ trackingCode: 1 });

module.exports = mongoose.model('DeliveryRequest', deliveryRequestSchema);
