const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    required: true
  },
  drug: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drug',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  batchNumber: {
    type: String,
    required: true,
    trim: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  manufactureDate: {
    type: Date
  },
  storageLocation: {
    type: String,
    maxlength: 50
  },
  reorderLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  maxStock: {
    type: Number,
    min: 0
  },
  lastRestocked: {
    type: Date,
    default: Date.now
  },
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

// Compound index for unique pharmacy-drug combination
inventorySchema.index({ pharmacy: 1, drug: 1 }, { unique: true });

// Index for searching by expiry date
inventorySchema.index({ expiryDate: 1 });

// Virtual for checking if stock is low
inventorySchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.reorderLevel;
});

// Virtual for checking if item is expired
inventorySchema.virtual('isExpired').get(function() {
  return new Date() > this.expiryDate;
});

// Virtual for days until expiry
inventorySchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const expiryDate = new Date(this.expiryDate);
  const diffTime = expiryDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to check for low stock and expiry
inventorySchema.pre('save', function(next) {
  if (this.isModified('quantity') && this.quantity <= this.reorderLevel) {
    // This will trigger low stock notification
    this._lowStock = true;
  }
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
