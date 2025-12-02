const express = require('express');
const router = express.Router();
const Drug = require('../models/Drug');
const Inventory = require('../models/Inventory');
const Pharmacy = require('../models/Pharmacy');
const { authenticate, authorize } = require('../middleware/auth');
const { validateDrug } = require('../middleware/validation');

// Search drugs (public endpoint)
router.get('/search', async (req, res) => {
  try {
    const { 
      q, 
      category, 
      form, 
    prescriptionRequired, 
      page = 1, 
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const filter = { isActive: true };
    
    if (q) {
      filter.$text = { $search: q };
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (form) {
      filter.form = form;
    }
    
    if (prescriptionRequired !== undefined) {
      filter.prescriptionRequired = prescriptionRequired === 'true';
    }

    const sortOptions = {};
    if (q && filter.$text) {
      // Add text search score sorting
      sortOptions.score = { $meta: 'textScore' };
    }
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const drugs = await Drug.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Drug.countDocuments(filter);

    res.json({
      drugs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDrugs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Search drugs error:', error);
    res.status(500).json({ message: 'Server error while searching drugs' });
  }
});

// Get drug by ID (public endpoint)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const drug = await Drug.findById(id);

    if (!drug || !drug.isActive) {
      return res.status(404).json({ message: 'Drug not found' });
    }

    res.json({ drug });
  } catch (error) {
    console.error('Get drug error:', error);
    res.status(500).json({ message: 'Server error while fetching drug' });
  }
});

// Get all drugs (admin and pharmacy users)
router.get('/', authenticate, authorize('admin', 'pharmacy'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      form, 
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const filter = {};
    
    if (category) filter.category = category;
    if (form) filter.form = form;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const drugs = await Drug.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Drug.countDocuments(filter);

    res.json({
      drugs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDrugs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get drugs error:', error);
    res.status(500).json({ message: 'Server error while fetching drugs' });
  }
});

// Create new drug (admin only)
router.post('/', authenticate, authorize('admin'), validateDrug, async (req, res) => {
  try {
    const drugData = req.body;

    // Check if drug already exists
    const existingDrug = await Drug.findOne({
      $or: [
        { name: drugData.name, strength: drugData.strength, form: drugData.form },
        { genericName: drugData.genericName, strength: drugData.strength, form: drugData.form }
      ]
    });

    if (existingDrug) {
      return res.status(400).json({
        message: 'Drug with this name, strength, and form already exists'
      });
    }

    const drug = new Drug(drugData);
    await drug.save();

    res.status(201).json({
      message: 'Drug created successfully',
      drug
    });
  } catch (error) {
    console.error('Create drug error:', error);
    res.status(500).json({ message: 'Server error while creating drug' });
  }
});

// Update drug (admin only)
router.put('/:id', authenticate, authorize('admin'), validateDrug, async (req, res) => {
  try {
    const { id } = req.params;

    const drug = await Drug.findById(id);
    if (!drug) {
      return res.status(404).json({ message: 'Drug not found' });
    }

    const updates = req.body;
    updates.updatedAt = new Date();

    const updatedDrug = await Drug.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Drug updated successfully',
      drug: updatedDrug
    });
  } catch (error) {
    console.error('Update drug error:', error);
    res.status(500).json({ message: 'Server error while updating drug' });
  }
});

// Delete drug (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const drug = await Drug.findById(id);
    if (!drug) {
      return res.status(404).json({ message: 'Drug not found' });
    }

    // Check if drug is in any inventory
    const inventoryCount = await Inventory.countDocuments({ drug: id, isActive: true });
    if (inventoryCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete drug. It is currently in inventory. Deactivate it instead.'
      });
    }

    await Drug.findByIdAndDelete(id);

    res.json({ message: 'Drug deleted successfully' });
  } catch (error) {
    console.error('Delete drug error:', error);
    res.status(500).json({ message: 'Server error while deleting drug' });
  }
});

// Get drug availability across pharmacies (public endpoint)
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { city, state, sortBy = 'price', sortOrder = 'asc', page = 1, limit = 20 } = req.query;

    // Check if drug exists
    const drug = await Drug.findById(id);
    if (!drug || !drug.isActive) {
      return res.status(404).json({ message: 'Drug not found' });
    }

    // Build filter for inventory
    const filter = { drug: id, quantity: { $gt: 0 }, isActive: true };

    // Find inventory items with pharmacy details
    const inventoryQuery = Inventory.find(filter)
      .populate({
        path: 'pharmacy',
        match: { isActive: true, isApproved: true },
        select: 'name address contact ratings operatingHours'
      });

    // Add location filter if specified
    if (city || state) {
      const locationFilter = {};
      if (city) locationFilter['address.city'] = city;
      if (state) locationFilter['address.state'] = state;
      
      inventoryQuery.populate({
        path: 'pharmacy',
        match: { ...locationFilter, isActive: true, isApproved: true },
        select: 'name address contact ratings operatingHours'
      });
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const inventory = await inventoryQuery
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter out null pharmacy results (from the match)
    const availableInventory = inventory.filter(item => item.pharmacy !== null);

    const total = await Inventory.countDocuments(filter);

    res.json({
      drug,
      availability: availableInventory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPharmacies: availableInventory.length,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get drug availability error:', error);
    res.status(500).json({ message: 'Server error while fetching drug availability' });
  }
});

// Get drug categories (public endpoint)
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Drug.distinct('category', { isActive: true });
    
    const categoryCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Drug.countDocuments({ category, isActive: true });
        return { category, count };
      })
    );

    res.json({ categories: categoryCounts });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
});

// Get drug forms (public endpoint)
router.get('/forms/list', async (req, res) => {
  try {
    const forms = await Drug.distinct('form', { isActive: true });
    
    const formCounts = await Promise.all(
      forms.map(async (form) => {
        const count = await Drug.countDocuments({ form, isActive: true });
        return { form, count };
      })
    );

    res.json({ forms: formCounts });
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ message: 'Server error while fetching forms' });
  }
});

// Get drug statistics (admin only)
router.get('/stats/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const stats = await Drug.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalDrugs: { $sum: 1 },
          prescriptionRequired: { $sum: { $cond: ['$prescriptionRequired', 1, 0] } },
          overTheCounter: { $sum: { $cond: ['$prescriptionRequired', 0, 1] } }
        }
      }
    ]);

    const categoryStats = await Drug.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          prescriptionRequired: { $sum: { $cond: ['$prescriptionRequired', 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const formStats = await Drug.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$form',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      overview: stats[0] || { totalDrugs: 0, prescriptionRequired: 0, overTheCounter: 0 },
      categories: categoryStats,
      forms: formStats
    });
  } catch (error) {
    console.error('Get drug stats error:', error);
    res.status(500).json({ message: 'Server error while fetching drug statistics' });
  }
});

module.exports = router;
