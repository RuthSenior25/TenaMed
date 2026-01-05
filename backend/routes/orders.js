const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');

// Create new order
router.post('/', auth.authenticate, async (req, res) => {
  try {
    const { pharmacyId, medications, deliveryAddress, notes, totalAmount } = req.body;
    
    // Get current user (patient)
    const patient = await User.findById(req.user._id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Validate pharmacy
    const pharmacy = await User.findById(pharmacyId);
    if (!pharmacy || pharmacy.role !== 'pharmacy' || pharmacy.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Invalid pharmacy' });
    }

    // Create order
    const order = new Order({
      patientId: req.user._id,
      pharmacyId,
      medications: medications.filter(med => med.name.trim()),
      deliveryAddress,
      notes,
      totalAmount,
      status: 'pending'
    });

    await order.save();

    // Populate order details for response
    await order.populate('pharmacyId', 'pharmacyName email profile');
    await order.populate('patientId', 'email profile');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create order', 
      error: error.message 
    });
  }
});

// Get patient orders
router.get('/my-orders', auth.authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ patientId: req.user._id })
      .populate('pharmacyId', 'pharmacyName email profile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders', 
      error: error.message 
    });
  }
});

// Get pharmacy orders
router.get('/pharmacy-orders', auth.authenticate, auth.checkRole(['pharmacy']), async (req, res) => {
  try {
    const orders = await Order.find({ pharmacyId: req.user._id })
      .populate('patientId', 'email profile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching pharmacy orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders', 
      error: error.message 
    });
  }
});

// Update order status
router.put('/:orderId/status', auth.authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check permissions
    if (req.user.role === 'pharmacy' && order.pharmacyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (req.user.role === 'patient' && order.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    await order.populate('pharmacyId', 'pharmacyName email profile');
    await order.populate('patientId', 'email profile');

    res.json({
      success: true,
      message: 'Order status updated',
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order status', 
      error: error.message 
    });
  }
});

module.exports = router;
