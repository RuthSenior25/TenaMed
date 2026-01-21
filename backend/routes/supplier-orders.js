const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SupplierOrder = require('../models/SupplierOrder');
const User = require('../models/User');

// Create new supplier order (from pharmacy)
router.post('/', auth.authenticate, auth.checkRole(['pharmacy']), async (req, res) => {
  try {
    const { supplierId, medicines, notes, deliveryAddress } = req.body;
    
    // Get current pharmacy
    const pharmacy = await User.findById(req.user._id);
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    }

    // Validate supplier
    const supplier = await User.findById(supplierId);
    if (!supplier || supplier.role !== 'supplier' || !supplier.isApproved) {
      return res.status(400).json({ success: false, message: 'Invalid supplier' });
    }

    // Create supplier order
    const supplierOrder = new SupplierOrder({
      pharmacyId: req.user._id,
      supplierId,
      medicines,
      notes,
      deliveryAddress,
      status: 'pending'
    });

    await supplierOrder.save();

    // Populate order details for response
    await supplierOrder.populate('pharmacyId', 'pharmacyName email profile');
    await supplierOrder.populate('supplierId', 'email profile');

    console.log(`📦 New supplier order created: ${supplierOrder._id} from pharmacy ${pharmacy.pharmacyName} to supplier ${supplier.email}`);

    res.status(201).json({
      success: true,
      message: 'Supplier order created successfully',
      data: supplierOrder
    });
  } catch (error) {
    console.error('Error creating supplier order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create supplier order', 
      error: error.message 
    });
  }
});

// Get pharmacy's supplier orders
router.get('/pharmacy-orders', auth.authenticate, auth.checkRole(['pharmacy']), async (req, res) => {
  try {
    const orders = await SupplierOrder.find({ pharmacyId: req.user._id })
      .populate('supplierId', 'email profile')
      .sort({ createdAt: -1 });

    console.log(`📋 Fetched ${orders.length} supplier orders for pharmacy ${req.user._id}`);

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching pharmacy supplier orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get supplier's orders (for suppliers)
router.get('/supplier-orders', auth.authenticate, auth.checkRole(['supplier']), async (req, res) => {
  try {
    const orders = await SupplierOrder.find({ supplierId: req.user._id })
      .populate('pharmacyId', 'pharmacyName email profile')
      .sort({ createdAt: -1 });

    console.log(`📋 Fetched ${orders.length} orders for supplier ${req.user._id}`);

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

// Update supplier order status (for suppliers)
router.put('/:orderId/status', auth.authenticate, auth.checkRole(['supplier']), async (req, res) => {
  try {
    const { status } = req.body;
    const { orderId } = req.params;

    const order = await SupplierOrder.findOne({ 
      _id: orderId, 
      supplierId: req.user._id 
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    console.log(`🔄 Supplier order ${orderId} status updated to: ${status}`);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error updating supplier order status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order status', 
      error: error.message 
    });
  }
});

module.exports = router;
