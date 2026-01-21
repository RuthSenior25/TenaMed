const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Drug = require('../models/Drug');
const Order = require('../models/Order');
const User = require('../models/User');

// Get supplier's products
router.get('/products', auth.authenticate, auth.checkRole(['supplier']), async (req, res) => {
  try {
    console.log('📦 Fetching products for supplier:', req.user._id);
    
    const products = await Drug.find({ 
      supplierId: req.user._id 
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${products.length} products for supplier`);
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Create new product
router.post('/products', auth.authenticate, auth.checkRole(['supplier']), async (req, res) => {
  try {
    const {
      name,
      genericName,
      category,
      strength,
      form,
      description,
      price,
      prescriptionRequired
    } = req.body;

    console.log('📦 Creating new product for supplier:', req.user._id);

    const product = new Drug({
      name,
      genericName,
      category,
      strength,
      form,
      description,
      price,
      prescriptionRequired,
      supplierId: req.user._id,
      createdBy: req.user._id
    });

    await product.save();

    console.log('✅ Product created successfully:', product._id);

    res.json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Update product
router.put('/products/:productId', auth.authenticate, auth.checkRole(['supplier']), async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Drug.findOneAndUpdate(
      { 
        _id: productId, 
        supplierId: req.user._id 
      },
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log('✅ Product updated:', productId);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Delete product
router.delete('/products/:productId', auth.authenticate, auth.checkRole(['supplier']), async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Drug.findOneAndDelete({
      _id: productId,
      supplierId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log('✅ Product deleted:', productId);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get supplier orders (purchase orders from pharmacies)
router.get('/orders', auth.authenticate, auth.checkRole(['supplier']), async (req, res) => {
  try {
    console.log('📋 Fetching orders for supplier:', req.user._id);
    
    // Find orders that contain products from this supplier
    const orders = await Order.find({
      'medications.supplierId': req.user._id
    })
    .populate('pharmacyId', 'pharmacyName email profile')
    .populate('patientId', 'email profile')
    .sort({ createdAt: -1 });

    console.log(`✅ Found ${orders.length} orders for supplier`);

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get all available suppliers (for pharmacies)
router.get('/available', auth.authenticate, auth.checkRole(['pharmacy']), async (req, res) => {
  try {
    console.log('🔍 Fetching available suppliers for pharmacy');
    
    const suppliers = await User.find({
      role: 'supplier',
      isActive: true,
      isApproved: true
    })
    .select('email profile firstName lastName createdAt')
    .sort({ 'profile.firstName': 1 });

    console.log(`✅ Found ${suppliers.length} available suppliers`);

    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    console.error('Error fetching available suppliers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get supplier analytics
router.get('/analytics', auth.authenticate, auth.checkRole(['supplier']), async (req, res) => {
  try {
    console.log('📊 Fetching analytics for supplier:', req.user._id);
    
    const [
      totalProducts,
      activeOrders,
      totalRevenue,
      partnerPharmacies
    ] = await Promise.all([
      Drug.countDocuments({ supplierId: req.user._id }),
      Order.countDocuments({ 'medications.supplierId': req.user._id }),
      Order.aggregate([
        { $match: { 'medications.supplierId': req.user._id } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.distinct('pharmacyId', { 'medications.supplierId': req.user._id })
    ]);

    const analytics = {
      totalProducts,
      activeOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      partnerPharmacies: partnerPharmacies.length
    };

    console.log('✅ Analytics fetched for supplier');

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching supplier analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;
