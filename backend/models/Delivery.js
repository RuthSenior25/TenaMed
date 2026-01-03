const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'assigned'
  },
  pickupLocation: {
    type: String,
    required: true
  },
  deliveryLocation: {
    type: String,
    required: true
  },
  estimatedTime: Number, // in minutes
  actualTime: Number, // in minutes
  distance: Number, // in km
  assignedAt: {
    type: Date,
    default: Date.now
  },
  pickedUpAt: Date,
  deliveredAt: Date,
  notes: String,
  trackingCode: {
    type: String,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate tracking code before saving
deliverySchema.pre('save', function(next) {
  if (!this.trackingCode) {
    this.trackingCode = 'TRK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Delivery', deliverySchema);
