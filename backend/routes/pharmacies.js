const express = require('express');
const router = express.Router();
const Pharmacy = require('../models/Pharmacy');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Review = require('../models/Review');
const { authenticate, authorize, checkPharmacyOwnership } = require('../middleware/auth');
const { validatePharmacyRegistration } = require('../middleware/validation');

// Register new pharmacy (pharmacy users only)
router.post('/register', authenticate, authorize('pharmacy'), validatePharmacyRegistration, async (req, res) => {
  try {
    const pharmacyData = req.body;
    
    // Check if pharmacy with same license already exists
    const existingPharmacy = await Pharmacy.findOne({ 
      $or: [
        { licenseNumber: pharmacyData.licenseNumber },
        { 'contact.email': pharmacyData.contact.email }
      ]
    });

    if (existingPharmacy) {
      return res.status(400).json({
        message: 'Pharmacy already exists with this license number or email'
      });
    }

    // Create pharmacy with current user as owner
    const pharmacy = new Pharmacy({
      ...pharmacyData,
      owner: req.user._id,
      isApproved: false // Requires admin approval
    });

    await pharmacy.save();

    res.status(201).json({
      message: 'Pharmacy registration submitted successfully. Waiting for admin approval.',
      pharmacy
    });
  } catch (error) {
    console.error('Pharmacy registration error:', error);
    res.status(500).json({ message: 'Server error during pharmacy registration' });
  }
});

// Get all pharmacies (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      city, 
      state, 
      search, 
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const filter = { isActive: true };
    
    if (city) filter['address.city'] = city;
    if (state) filter['address.state'] = state;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pharmacies = await Pharmacy.find(filter)
      .populate('owner', 'username email profile.firstName profile.lastName')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Pharmacy.countDocuments(filter);

    res.json({
      pharmacies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPharmacies: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get pharmacies error:', error);
    res.status(500).json({ message: 'Server error while fetching pharmacies' });
  }
});

// Get pharmacy by ID (public endpoint)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pharmacy = await Pharmacy.findById(id)
      .populate('owner', 'username email profile.firstName profile.lastName')
      .populate({
        path: 'reviews',
        populate: {
          path: 'patient',
          select: 'username profile.firstName profile.lastName'
        }
      });

    if (!pharmacy || !pharmacy.isActive) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    res.json({ pharmacy });
  } catch (error) {
    console.error('Get pharmacy error:', error);
    res.status(500).json({ message: 'Server error while fetching pharmacy' });
  }
});

// Get my pharmacy (pharmacy users only)
router.get('/my/pharmacy', authenticate, authorize('pharmacy'), async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ owner: req.user._id })
      .populate('owner', 'username email profile.firstName profile.lastName');

    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found. Please register your pharmacy first.' });
    }

    res.json({ pharmacy });
  } catch (error) {
    console.error('Get my pharmacy error:', error);
    res.status(500).json({ message: 'Server error while fetching pharmacy' });
  }
});

// Update pharmacy (pharmacy owner or admin)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Find pharmacy and check ownership
    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    // Check if user is owner or admin
    if (req.user.role !== 'admin' && pharmacy.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const allowedUpdates = [
      'name', 'address', 'contact', 'coordinates', 'operatingHours', 
      'services', 'website', 'emergencyContact', 'lowStockThreshold'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Only admin can change approval status
    if (req.user.role === 'admin' && req.body.isApproved !== undefined) {
      updates.isApproved = req.body.isApproved;
    }

    // Only admin can change active status
    if (req.user.role === 'admin' && req.body.isActive !== undefined) {
      updates.isActive = req.body.isActive;
    }

    const updatedPharmacy = await Pharmacy.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('owner', 'username email profile.firstName profile.lastName');

    res.json({
      message: 'Pharmacy updated successfully',
      pharmacy: updatedPharmacy
    });
  } catch (error) {
    console.error('Update pharmacy error:', error);
    res.status(500).json({ message: 'Server error while updating pharmacy' });
  }
});

// Delete pharmacy (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    // Also delete related inventory
    await Inventory.deleteMany({ pharmacy: id });

    // Deactivate the pharmacy user
    await User.findByIdAndUpdate(pharmacy.owner, { isActive: false });

    await Pharmacy.findByIdAndDelete(id);

    res.json({ message: 'Pharmacy deleted successfully' });
  } catch (error) {
    console.error('Delete pharmacy error:', error);
    res.status(500).json({ message: 'Server error while deleting pharmacy' });
  }
});

// Get pharmacy inventory
router.get('/:id/inventory', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, search, category, sortBy = 'name', sortOrder = 'asc' } = req.query;

    // Check if pharmacy exists and is active
    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy || !pharmacy.isActive) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    const filter = { pharmacy: id, isActive: true };
    
    if (search) {
      filter['drug.name'] = { $regex: search, $options: 'i' };
    }
    if (category) {
      filter['drug.category'] = category;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const inventory = await Inventory.find(filter)
      .populate('drug', 'name genericName category form prescriptionRequired')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Inventory.countDocuments(filter);

    res.json({
      inventory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get pharmacy inventory error:', error);
    res.status(500).json({ message: 'Server error while fetching pharmacy inventory' });
  }
});

// Get pharmacy reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Check if pharmacy exists
    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const reviews = await Review.find({ pharmacy: id, isActive: true })
      .populate('patient', 'username profile.firstName profile.lastName')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({ pharmacy: id, isActive: true });

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
    res.status(500).json({ message: 'Server error while fetching pharmacy reviews' });
  }
});

// Get pharmacy statistics (admin and pharmacy owner)
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && pharmacy.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get inventory stats
    const inventoryStats = await Inventory.aggregate([
      { $match: { pharmacy: pharmacy._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
          lowStockItems: { $sum: { $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0] } },
          expiringItems: {
            $sum: {
              $cond: [
                { $lte: [{ $subtract: ['$expiryDate', new Date()] }, 30 * 24 * 60 * 60 * 1000] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get review stats
    const reviewStats = await Review.aggregate([
      { $match: { pharmacy: pharmacy._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          wouldRecommendCount: { $sum: { $cond: ['$wouldRecommend', 1, 0] } }
        }
      }
    ]);

    // Get delivery stats
    const DeliveryRequest = require('../models/DeliveryRequest');
    const deliveryStats = await DeliveryRequest.aggregate([
      { $match: { pharmacy: pharmacy._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      inventory: inventoryStats[0] || { totalItems: 0, totalQuantity: 0, totalValue: 0, lowStockItems: 0, expiringItems: 0 },
      reviews: reviewStats[0] || { totalReviews: 0, averageRating: 0, wouldRecommendCount: 0 },
      deliveries: deliveryStats
    });
  } catch (error) {
    console.error('Get pharmacy stats error:', error);
    res.status(500).json({ message: 'Server error while fetching pharmacy statistics' });
  }
});

module.exports = router;
