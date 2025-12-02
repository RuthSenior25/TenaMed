const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Drug = require('../models/Drug');
const Pharmacy = require('../models/Pharmacy');
const Notification = require('../models/Notification');
const { authenticate, authorize, checkPharmacyOwnership } = require('../middleware/auth');
const { validateInventory } = require('../middleware/validation');

// Get pharmacy inventory (pharmacy owner or admin)
router.get('/my/inventory', authenticate, authorize('pharmacy', 'admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      lowStock, 
      expiring,
      sortBy = 'name', 
      sortOrder = 'asc' 
    } = req.query;

    let pharmacyId;
    
    if (req.user.role === 'pharmacy') {
      const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
      if (!pharmacy) {
        return res.status(404).json({ message: 'Pharmacy not found' });
      }
      pharmacyId = pharmacy._id;
    } else {
      // Admin must provide pharmacy ID
      pharmacyId = req.query.pharmacyId;
      if (!pharmacyId) {
        return res.status(400).json({ message: 'Pharmacy ID is required for admin users' });
      }
    }

    const filter = { pharmacy: pharmacyId, isActive: true };
    
    if (search) {
      filter['drug.name'] = { $regex: search, $options: 'i' };
    }
    
    if (category) {
      filter['drug.category'] = category;
    }
    
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$quantity', '$reorderLevel'] };
    }
    
    if (expiring === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      filter.expiryDate = { $lte: thirtyDaysFromNow };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const inventory = await Inventory.find(filter)
      .populate('drug', 'name genericName category form prescriptionRequired manufacturer')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Inventory.countDocuments(filter);

    // Add virtual fields
    const inventoryWithVirtuals = inventory.map(item => ({
      ...item.toObject(),
      isLowStock: item.quantity <= item.reorderLevel,
      isExpired: new Date() > item.expiryDate,
      daysUntilExpiry: Math.ceil((item.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      inventory: inventoryWithVirtuals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Server error while fetching inventory' });
  }
});

// Add item to inventory (pharmacy owner)
router.post('/', authenticate, authorize('pharmacy'), validateInventory, async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    const inventoryData = {
      ...req.body,
      pharmacy: pharmacy._id
    };

    // Check if drug exists
    const drug = await Drug.findById(inventoryData.drug);
    if (!drug || !drug.isActive) {
      return res.status(404).json({ message: 'Drug not found' });
    }

    // Check if inventory item already exists
    const existingItem = await Inventory.findOne({
      pharmacy: pharmacy._id,
      drug: inventoryData.drug,
      batchNumber: inventoryData.batchNumber,
      isActive: true
    });

    if (existingItem) {
      return res.status(400).json({
        message: 'Inventory item with this drug and batch number already exists'
      });
    }

    const inventory = new Inventory(inventoryData);
    await inventory.save();

    // Check for low stock and create notification
    if (inventory.quantity <= inventory.reorderLevel) {
      await Notification.createLowStockAlert(pharmacy, drug, inventory.quantity, inventory.reorderLevel);
    }

    // Check for expiry and create notification
    const daysUntilExpiry = Math.ceil((inventory.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 30) {
      await Notification.createExpiryAlert(pharmacy, drug, daysUntilExpiry);
    }

    res.status(201).json({
      message: 'Inventory item added successfully',
      inventory: await Inventory.findById(inventory._id).populate('drug', 'name genericName category form')
    });
  } catch (error) {
    console.error('Add inventory error:', error);
    res.status(500).json({ message: 'Server error while adding inventory item' });
  }
});

// Update inventory item (pharmacy owner)
router.put('/:id', authenticate, authorize('pharmacy'), validateInventory, async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await Inventory.findById(id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Check if user owns this inventory item
    const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
    if (!pharmacy || inventory.pharmacy.toString() !== pharmacy._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = req.body;
    updates.updatedAt = new Date();

    // Don't allow changing pharmacy or drug
    delete updates.pharmacy;
    delete updates.drug;

    const updatedInventory = await Inventory.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('drug', 'name genericName category form');

    // Check for low stock and create notification
    if (updatedInventory.quantity <= updatedInventory.reorderLevel) {
      const drug = await Drug.findById(updatedInventory.drug);
      await Notification.createLowStockAlert(pharmacy, drug, updatedInventory.quantity, updatedInventory.reorderLevel);
    }

    // Check for expiry and create notification
    const daysUntilExpiry = Math.ceil((updatedInventory.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 30) {
      const drug = await Drug.findById(updatedInventory.drug);
      await Notification.createExpiryAlert(pharmacy, drug, daysUntilExpiry);
    }

    res.json({
      message: 'Inventory item updated successfully',
      inventory: updatedInventory
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ message: 'Server error while updating inventory item' });
  }
});

// Delete inventory item (pharmacy owner)
router.delete('/:id', authenticate, authorize('pharmacy'), async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await Inventory.findById(id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Check if user owns this inventory item
    const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
    if (!pharmacy || inventory.pharmacy.toString() !== pharmacy._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete
    await Inventory.findByIdAndUpdate(id, { isActive: false, updatedAt: new Date() });

    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ message: 'Server error while deleting inventory item' });
  }
});

// Get low stock alerts (pharmacy owner)
router.get('/alerts/low-stock', authenticate, authorize('pharmacy'), async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    const lowStockItems = await Inventory.find({
      pharmacy: pharmacy._id,
      isActive: true,
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    }).populate('drug', 'name genericName category form');

    res.json({ lowStockItems });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({ message: 'Server error while fetching low stock alerts' });
  }
});

// Get expiry alerts (pharmacy owner)
router.get('/alerts/expiry', authenticate, authorize('pharmacy'), async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringItems = await Inventory.find({
      pharmacy: pharmacy._id,
      isActive: true,
      expiryDate: { $lte: thirtyDaysFromNow }
    }).populate('drug', 'name genericName category form');

    // Add days until expiry
    const itemsWithDays = expiringItems.map(item => ({
      ...item.toObject(),
      daysUntilExpiry: Math.ceil((item.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
    }));

    res.json({ expiringItems: itemsWithDays });
  } catch (error) {
    console.error('Get expiry alerts error:', error);
    res.status(500).json({ message: 'Server error while fetching expiry alerts' });
  }
});

// Restock inventory (pharmacy owner)
router.post('/:id/restock', authenticate, authorize('pharmacy'), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, newBatchNumber, newExpiryDate, newPrice } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Valid quantity is required' });
    }

    const inventory = await Inventory.findById(id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Check if user owns this inventory item
    const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
    if (!pharmacy || inventory.pharmacy.toString() !== pharmacy._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update quantity and optionally other fields
    const updates = {
      quantity: inventory.quantity + quantity,
      lastRestocked: new Date(),
      updatedAt: new Date()
    };

    if (newBatchNumber) updates.batchNumber = newBatchNumber;
    if (newExpiryDate) updates.expiryDate = newExpiryDate;
    if (newPrice !== undefined) updates.price = newPrice;

    const updatedInventory = await Inventory.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('drug', 'name genericName category form');

    res.json({
      message: 'Inventory restocked successfully',
      inventory: updatedInventory
    });
  } catch (error) {
    console.error('Restock inventory error:', error);
    res.status(500).json({ message: 'Server error while restocking inventory' });
  }
});

// Get inventory statistics (pharmacy owner or admin)
router.get('/stats/overview', authenticate, authorize('pharmacy', 'admin'), async (req, res) => {
  try {
    let pharmacyId;
    
    if (req.user.role === 'pharmacy') {
      const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
      if (!pharmacy) {
        return res.status(404).json({ message: 'Pharmacy not found' });
      }
      pharmacyId = pharmacy._id;
    } else {
      pharmacyId = req.query.pharmacyId;
      if (!pharmacyId) {
        return res.status(400).json({ message: 'Pharmacy ID is required for admin users' });
      }
    }

    const stats = await Inventory.aggregate([
      { $match: { pharmacy: pharmacyId, isActive: true } },
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

    const categoryStats = await Inventory.aggregate([
      { $match: { pharmacy: pharmacyId, isActive: true } },
      {
        $lookup: {
          from: 'drugs',
          localField: 'drug',
          foreignField: '_id',
          as: 'drugInfo'
        }
      },
      { $unwind: '$drugInfo' },
      {
        $group: {
          _id: '$drugInfo.category',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    res.json({
      overview: stats[0] || { totalItems: 0, totalQuantity: 0, totalValue: 0, lowStockItems: 0, expiringItems: 0 },
      categories: categoryStats
    });
  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({ message: 'Server error while fetching inventory statistics' });
  }
});

module.exports = router;
