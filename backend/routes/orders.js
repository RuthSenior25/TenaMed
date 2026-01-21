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
      status: 'pending',
      deliveryStatus: 'pending'
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
    
    console.log(`=== ORDER STATUS UPDATE ===`);
    console.log(`Order ID: ${orderId}`);
    console.log(`Requested status: ${status}`);
    console.log(`User role: ${req.user.role}`);
    console.log(`User ID: ${req.user._id}`);

    const order = await Order.findById(orderId);
    if (!order) {
      console.log(`Order not found: ${orderId}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log(`Current order status: ${order.status} / ${order.deliveryStatus}`);

    // Check permissions
    if (req.user.role === 'pharmacy' && order.pharmacyId.toString() !== req.user._id.toString()) {
      console.log(`Pharmacy not authorized for this order`);
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (req.user.role === 'patient' && order.patientId.toString() !== req.user._id.toString()) {
      console.log(`Patient not authorized for this order`);
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    order.status = status;
    
    // Auto-set delivery status when order becomes ready for pickup
    if (status === 'ready') {
      order.deliveryStatus = 'pending'; // Ensure it's ready for dispatcher
      console.log(`🚨 ORDER READY FOR DISPATCHER! Order ${order._id} marked as ready for pickup by pharmacy ${req.user._id}`);
    }
    
    order.updatedAt = new Date();
    await order.save();
    
    console.log(`✅ Order ${order._id} status updated to: ${order.status} / ${order.deliveryStatus}`);
    console.log(`=== END ORDER STATUS UPDATE ===`);

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

// Get driver deliveries
router.get('/my-deliveries', auth.authenticate, auth.checkRole(['driver']), async (req, res) => {
  try {
    console.log(`Fetching deliveries for driver: ${req.user._id}`);
    
    const deliveries = await Delivery.find({ driverId: req.user._id })
      .populate('orderId', 'medications totalAmount deliveryAddress')
      .populate('pharmacyId', 'pharmacyName profile')
      .sort({ assignedAt: -1 });

    console.log(`Found ${deliveries.length} deliveries for driver`);

    res.json({
      success: true,
      data: deliveries
    });
  } catch (error) {
    console.error('Error fetching driver deliveries:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch deliveries', 
      error: error.message 
    });
  }
});

// Update delivery status (for drivers)
router.put('/update-delivery/:deliveryId', auth.authenticate, auth.checkRole(['driver']), async (req, res) => {
  try {
    const { status } = req.body;
    const { deliveryId } = req.params;

    console.log(`Driver ${req.user._id} updating delivery ${deliveryId} to status: ${status}`);

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    // Check if driver owns this delivery
    if (delivery.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Validate status transition
    const validTransitions = {
      'assigned': ['picked_up'],
      'picked_up': ['in_transit'],
      'in_transit': ['delivered']
    };

    if (!validTransitions[delivery.status]?.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status transition from ${delivery.status} to ${status}` 
      });
    }

    delivery.status = status;
    delivery.updatedAt = new Date();
    await delivery.save();

    // Update order delivery status
    if (delivery.orderId) {
      await Order.findByIdAndUpdate(delivery.orderId, {
        deliveryStatus: status
      });
    }

    // If delivery is complete, make driver available again
    if (status === 'delivered') {
      await User.findByIdAndUpdate(req.user._id, { isAvailable: true });
    }

    console.log(`✅ Delivery ${deliveryId} updated to: ${status}`);

    res.json({
      success: true,
      message: 'Delivery status updated',
      data: delivery
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update delivery status', 
      error: error.message 
    });
  }
});

module.exports = router;
