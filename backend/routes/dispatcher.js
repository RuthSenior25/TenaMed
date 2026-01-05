const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const Pharmacy = require('../models/Pharmacy');

// Get pending orders for dispatcher
router.get('/orders', auth.authenticate, auth.checkRole(['dispatcher']), async (req, res) => {
  try {
    const orders = await Order.find({ 
      status: 'confirmed',
      deliveryStatus: 'pending'
    })
    .populate('pharmacyId', 'pharmacyName email profile')
    .populate('patientId', 'email profile')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available drivers
router.get('/drivers', auth.authenticate, auth.checkRole(['dispatcher']), async (req, res) => {
  try {
    const drivers = await User.find({ 
      role: 'driver',
      isAvailable: true 
    }).select('email profile location vehicleType isAvailable');

    res.json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Assign driver to order
router.post('/assign', auth.authenticate, auth.checkRole(['dispatcher']), async (req, res) => {
  try {
    const { orderId, driverId } = req.body;

    // Update order with driver assignment
    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        deliveryStatus: 'assigned',
        assignedDriver: driverId,
        assignedAt: new Date()
      },
      { new: true }
    ).populate('pharmacyId', 'pharmacyName profile')
     .populate('patientId', 'email profile')
     .populate('assignedDriver', 'email profile');

    // Create delivery record
    const delivery = new Delivery({
      orderId: orderId,
      driverId: driverId,
      status: 'assigned',
      assignedAt: new Date()
    });
    await delivery.save();

    // Update driver availability
    await User.findByIdAndUpdate(driverId, { isAvailable: false });

    res.json({
      success: true,
      message: 'Driver assigned successfully',
      data: { order, delivery }
    });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update delivery status
router.put('/status/:deliveryId', auth.authenticate, auth.checkRole(['dispatcher']), async (req, res) => {
  try {
    const { status } = req.body;
    const { deliveryId } = req.params;

    const delivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('orderId')
     .populate('driverId', 'email profile');

    // Update order status
    if (delivery.orderId) {
      await Order.findByIdAndUpdate(delivery.orderId._id, {
        deliveryStatus: status
      });
    }

    // If delivery is complete, make driver available again
    if (status === 'delivered') {
      await User.findByIdAndUpdate(delivery.driverId._id, { isAvailable: true });
    }

    res.json({
      success: true,
      message: 'Delivery status updated',
      data: delivery
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get active deliveries
router.get('/deliveries', auth.authenticate, auth.checkRole(['dispatcher']), async (req, res) => {
  try {
    const deliveries = await Delivery.find({
      status: { $in: ['assigned', 'picked_up', 'in_transit'] }
    })
    .populate('orderId', 'medications totalAmount deliveryAddress')
    .populate('driverId', 'email profile location vehicleType')
    .populate('pharmacyId', 'pharmacyName profile')
    .sort({ assignedAt: -1 });

    res.json({
      success: true,
      data: deliveries
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Process payment
router.post('/payment', auth.authenticate, auth.checkRole(['dispatcher']), async (req, res) => {
  try {
    const { orderId, paymentMethod, amount } = req.body;

    // Update order payment status
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: 'paid',
        paymentMethod,
        paidAmount: amount,
        paidAt: new Date()
      },
      { new: true }
    ).populate('pharmacyId', 'email');

    // Here you would integrate with actual payment gateway
    // For now, we'll simulate successful payment

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: order
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get delivery analytics
router.get('/analytics', auth.authenticate, auth.checkRole(['dispatcher']), async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayDeliveries,
      weekDeliveries,
      monthDeliveries,
      totalDeliveries,
      activeDrivers,
      pendingOrders
    ] = await Promise.all([
      Delivery.countDocuments({ createdAt: { $gte: startOfDay }, status: 'delivered' }),
      Delivery.countDocuments({ createdAt: { $gte: startOfWeek }, status: 'delivered' }),
      Delivery.countDocuments({ createdAt: { $gte: startOfMonth }, status: 'delivered' }),
      Delivery.countDocuments({ status: 'delivered' }),
      User.countDocuments({ role: 'driver', isAvailable: true }),
      Order.countDocuments({ deliveryStatus: 'pending' })
    ]);

    res.json({
      success: true,
      data: {
        todayDeliveries,
        weekDeliveries,
        monthDeliveries,
        totalDeliveries,
        activeDrivers,
        pendingOrders
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
