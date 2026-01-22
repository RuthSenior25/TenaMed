const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    required: true,
    enum: ['patient', 'pharmacy', 'admin', 'dispatcher', 'driver', 'delivery_person', 'supplier', 'government', 'system'],
    default: 'patient'
  },
  profile: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] }
  },
  pharmacyName: {
    type: String,
    required: function() {
      return this.role === 'pharmacy';
    }
  },
  // Pharmacy location fields
  pharmacyLocation: {
    address: { type: String },
    city: { type: String },
    kebele: { type: String },
    postalCode: { type: String },
    coordinates: {
      type: [Number], // [lng, lat] format for MongoDB
      default: [0, 0]
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: function() {
      return this.role === 'pharmacy' ? 'pending' : 'approved';
    }
  },
  rejectionReason: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: function() {
      return this.role === 'patient' || this.role === 'admin' || this.role === 'supplier';
    }
  },
  lastLogin: { type: Date },
  // Driver specific fields
  isAvailable: {
    type: Boolean,
    default: function() {
      return this.role === 'driver' || this.role === 'delivery_person';
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  vehicleType: {
    type: String,
    enum: ['motorcycle', 'car', 'van', 'bicycle'],
    default: 'motorcycle'
  },
  licensePlate: String,
  deliveryStats: {
    totalDeliveries: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    averageDeliveryTime: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 }
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Hide password in JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
