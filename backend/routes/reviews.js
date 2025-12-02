const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Pharmacy = require('../models/Pharmacy');
const { authenticate, authorize } = require('../middleware/auth');
const { validateReview } = require('../middleware/validation');

// Create new review (patients only)
router.post('/', authenticate, authorize('patient'), validateReview, async (req, res) => {
  try {
    const { pharmacy, rating, title, comment, serviceRatings, wouldRecommend } = req.body;

    // Check if pharmacy exists and is approved
    const pharmacyDoc = await Pharmacy.findById(pharmacy);
    if (!pharmacyDoc || !pharmacyDoc.isActive || !pharmacyDoc.isApproved) {
      return res.status(404).json({ message: 'Pharmacy not found or not approved' });
    }

    // Check if user already reviewed this pharmacy
    const existingReview = await Review.findOne({
      patient: req.user._id,
      pharmacy: pharmacy
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this pharmacy' });
    }

    const review = new Review({
      patient: req.user._id,
      pharmacy,
      rating,
      title,
      comment,
      serviceRatings,
      wouldRecommend
    });

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('pharmacy', 'name');

    res.status(201).json({
      message: 'Review submitted successfully',
      review: populatedReview
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error while creating review' });
  }
});

// Get reviews for a pharmacy (public endpoint)
router.get('/pharmacy/:pharmacyId', async (req, res) => {
  try {
    const { pharmacyId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', rating } = req.query;

    // Check if pharmacy exists
    const pharmacy = await Pharmacy.findById(pharmacyId);
    if (!pharmacy || !pharmacy.isActive) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    const filter = { pharmacy: pharmacyId, isActive: true };
    if (rating) {
      filter.rating = parseInt(rating);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const reviews = await Review.find(filter)
      .populate('patient', 'username profile.firstName profile.lastName')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(filter);

    res.json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get pharmacy reviews error:', error);
    res.status(500).json({ message: 'Server error while fetching reviews' });
  }
});

// Get user's reviews (authenticated users)
router.get('/my/reviews', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = { patient: req.user._id, isActive: true };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const reviews = await Review.find(filter)
      .populate('pharmacy', 'name address ratings')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(filter);

    res.json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ message: 'Server error while fetching reviews' });
  }
});

// Update review (patient who created it)
router.put('/:id', authenticate, authorize('patient'), validateReview, async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns this review
    if (review.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = req.body;
    updates.updatedAt = new Date();

    // Don't allow changing patient or pharmacy
    delete updates.patient;
    delete updates.pharmacy;

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('patient', 'username profile.firstName profile.lastName')
      .populate('pharmacy', 'name');

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error while updating review' });
  }
});

// Delete review (patient who created it or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns this review or is admin
    if (req.user.role !== 'admin' && review.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete
    await Review.findByIdAndUpdate(id, { isActive: false, updatedAt: new Date() });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error while deleting review' });
  }
});

// Mark review as helpful (public endpoint)
router.post('/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review || !review.isActive) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.helpfulCount += 1;
    await review.save();

    res.json({
      message: 'Review marked as helpful',
      helpfulCount: review.helpfulCount
    });
  } catch (error) {
    console.error('Mark review helpful error:', error);
    res.status(500).json({ message: 'Server error while marking review as helpful' });
  }
});

// Respond to review (pharmacy owner)
router.post('/:id/response', authenticate, authorize('pharmacy'), async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Response text is required' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns the pharmacy being reviewed
    const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
    if (!pharmacy || review.pharmacy.toString() !== pharmacy._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    review.response = {
      text: text.trim(),
      date: new Date(),
      respondedBy: req.user._id
    };

    await review.save();

    // Create notification for the patient
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: review.patient,
      type: 'review-response',
      title: 'Response to Your Review',
      message: `${pharmacy.name} has responded to your review`,
      relatedEntity: { entityType: 'review', entityId: review._id },
      actionRequired: false
    });

    const populatedReview = await Review.findById(review._id)
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('pharmacy', 'name')
      .populate('response.respondedBy', 'username profile.firstName profile.lastName');

    res.json({
      message: 'Response added successfully',
      review: populatedReview
    });
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({ message: 'Server error while adding response' });
  }
});

// Get review statistics (admin or pharmacy owner)
router.get('/stats/overview', authenticate, authorize('admin', 'pharmacy'), async (req, res) => {
  try {
    let filter = { isActive: true };

    if (req.user.role === 'pharmacy') {
      const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
      if (!pharmacy) {
        return res.status(404).json({ message: 'Pharmacy not found' });
      }
      filter.pharmacy = pharmacy._id;
    }

    const stats = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          wouldRecommendCount: { $sum: { $cond: ['$wouldRecommend', 1, 0] } },
          wouldRecommendPercentage: {
            $multiply: [
              { $divide: [{ $sum: { $cond: ['$wouldRecommend', 1, 0] } }, { $sum: 1 }] },
              100
            ]
          }
        }
      }
    ]);

    const ratingDistribution = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const recentReviews = await Review.find(filter)
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('pharmacy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      overview: stats[0] || { totalReviews: 0, averageRating: 0, wouldRecommendCount: 0, wouldRecommendPercentage: 0 },
      ratingDistribution,
      recentReviews
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ message: 'Server error while fetching review statistics' });
  }
});

// Get all reviews (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      rating, 
      pharmacyId, 
      patientId,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const filter = { isActive: true };
    
    if (rating) filter.rating = parseInt(rating);
    if (pharmacyId) filter.pharmacy = pharmacyId;
    if (patientId) filter.patient = patientId;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const reviews = await Review.find(filter)
      .populate('patient', 'username profile.firstName profile.lastName email')
      .populate('pharmacy', 'name address contact')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(filter);

    res.json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({ message: 'Server error while fetching reviews' });
  }
});

module.exports = router;
