const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  serviceRatings: {
    staffFriendliness: { type: Number, min: 1, max: 5 },
    waitTime: { type: Number, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    availability: { type: Number, min: 1, max: 5 },
    priceFairness: { type: Number, min: 1, max: 5 }
  },
  wouldRecommend: {
    type: Boolean,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  response: {
    text: { type: String, maxlength: 500 },
    date: { type: Date },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
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

// Ensure one review per patient per pharmacy
reviewSchema.index({ patient: 1, pharmacy: 1 }, { unique: true });

// Post-save middleware to update pharmacy ratings
reviewSchema.post('save', async function() {
  try {
    const Pharmacy = mongoose.model('Pharmacy');
    const stats = await mongoose.model('Review').aggregate([
      { $match: { pharmacy: this.pharmacy, isActive: true } },
      { $group: { _id: '$pharmacy', averageRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    
    if (stats.length > 0) {
      await Pharmacy.findByIdAndUpdate(this.pharmacy, {
        'ratings.average': stats[0].averageRating,
        'ratings.count': stats[0].count
      });
    }
  } catch (error) {
    console.error('Error updating pharmacy ratings:', error);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
