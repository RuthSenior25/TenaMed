const mongoose = require('mongoose');

const drugSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  genericName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  brandName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: ['antibiotics', 'painkillers', 'vitamins', 'chronic-disease', 'emergency', 'pediatric', 'women-health', 'men-health', 'mental-health', 'other']
  },
  strength: {
    value: { type: Number, required: true },
    unit: { type: String, required: true } // mg, ml, g, etc.
  },
  form: {
    type: String,
    required: true,
    enum: ['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'inhaler', 'patch', 'other']
  },
  prescriptionRequired: {
    type: Boolean,
    default: false
  },
  manufacturer: {
    type: String,
    trim: true,
    maxlength: 100
  },
  activeIngredients: [{
    name: { type: String, required: true },
    strength: { type: String, required: true }
  }],
  sideEffects: [{
    type: String,
    maxlength: 200
  }],
  contraindications: [{
    type: String,
    maxlength: 200
  }],
  dosageInstructions: {
    type: String,
    maxlength: 500
  },
  storageInstructions: {
    type: String,
    maxlength: 300
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

// Index for better search performance
drugSchema.index({ name: 'text', genericName: 'text', brandName: 'text' });

module.exports = mongoose.model('Drug', drugSchema);
