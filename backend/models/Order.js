const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    required: true
  },
  medications: [{
    name: String,
    quantity: Number,
    price: Number,
    instructions: String,
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  deliveryAddress: {
    street: String,
    city: String,
    kebele: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'],
    default: 'pending'
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile_transfer']
  },
  paidAmount: Number,
  paidAt: Date,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
