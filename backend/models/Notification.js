const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['low-stock', 'expiry-alert', 'order-status', 'review-response', 'system-alert', 'approval-status', 'delivery-update']
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  relatedEntity: {
    entityType: { type: String, enum: ['drug', 'pharmacy', 'order', 'review', 'delivery'] },
    entityId: { type: mongoose.Schema.Types.ObjectId }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String
  },
  actionButtonText: {
    type: String,
    maxlength: 50
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
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

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1, priority: 1 });

// Pre-save middleware to set expiry for certain notification types
notificationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Set expiry for different notification types
    const expiryMap = {
      'low-stock': 7 * 24 * 60 * 60 * 1000, // 7 days
      'expiry-alert': 30 * 24 * 60 * 60 * 1000, // 30 days
      'order-status': 7 * 24 * 60 * 60 * 1000, // 7 days
      'system-alert': 3 * 24 * 60 * 60 * 1000 // 3 days
    };
    
    if (expiryMap[this.type]) {
      this.expiresAt = new Date(Date.now() + expiryMap[this.type]);
    }
  }
  next();
});

// Static method to create different types of notifications
notificationSchema.statics.createLowStockAlert = function(pharmacy, drug, currentQuantity, threshold) {
  return this.create({
    recipient: pharmacy.owner,
    type: 'low-stock',
    title: 'Low Stock Alert',
    message: `${drug.name} is running low. Current stock: ${currentQuantity} (Threshold: ${threshold})`,
    relatedEntity: { entityType: 'drug', entityId: drug._id },
    priority: 'high',
    actionRequired: true,
    actionUrl: `/pharmacy/inventory/${drug._id}`,
    actionButtonText: 'Restock Now',
    metadata: { pharmacyId: pharmacy._id, drugId: drug._id, currentQuantity, threshold }
  });
};

notificationSchema.statics.createExpiryAlert = function(pharmacy, drug, daysUntilExpiry) {
  return this.create({
    recipient: pharmacy.owner,
    type: 'expiry-alert',
    title: 'Drug Expiry Alert',
    message: `${drug.name} expires in ${daysUntilExpiry} days`,
    relatedEntity: { entityType: 'drug', entityId: drug._id },
    priority: daysUntilExpiry <= 7 ? 'urgent' : 'high',
    actionRequired: true,
    actionUrl: `/pharmacy/inventory/${drug._id}`,
    actionButtonText: 'Manage Stock',
    metadata: { pharmacyId: pharmacy._id, drugId: drug._id, daysUntilExpiry }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
