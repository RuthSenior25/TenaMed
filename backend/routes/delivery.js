const express = require('express');
const router = express.Router();
const DeliveryRequest = require('../models/DeliveryRequest');
const Pharmacy = require('../models/Pharmacy');
const Inventory = require('../models/Inventory');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');
const { validateDeliveryRequest } = require('../middleware/validation');

// Create delivery request (patients only)
router.post('/', authenticate, authorize('patient'), validateDeliveryRequest, async (req, res) => {
  try {
    const { pharmacy, items, deliveryAddress, contactPhone, paymentMethod, notes } = req.body;

    // Check if pharmacy exists and is approved
    const pharmacyDoc = await Pharmacy.findById(pharmacy);
    if (!pharmacyDoc || !pharmacyDoc.isActive || !pharmacyDoc.isApproved) {
      return res.status(404).json({ message: 'Pharmacy not found or not approved' });
    }

    // Check if all items are available in pharmacy inventory
    for (const item of items) {
      const inventory = await Inventory.findOne({
        pharmacy,
        drug: item.drug,
        quantity: { $gte: item.quantity },
        isActive: true
      }).populate('drug');

      if (!inventory) {
        const drug = await require('../models/Drug').findById(item.drug);
        return res.status(400).json({
          message: `Insufficient stock for ${drug ? drug.name : 'unknown drug'}`
        });
      }
    }

    // Calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      const inventory = await Inventory.findOne({
        pharmacy,
        drug: item.drug,
        isActive: true
      });
      totalAmount += inventory.price * item.quantity;
    }

    // Add delivery fee (could be calculated based on distance)
    const deliveryFee = 50; // Fixed delivery fee for now
    totalAmount += deliveryFee;

    const deliveryRequest = new DeliveryRequest({
      patient: req.user._id,
      pharmacy,
      items,
      deliveryAddress,
      contactPhone,
      totalAmount,
      deliveryFee,
      paymentMethod,
      notes
    });

    await deliveryRequest.save();

    // Create notification for pharmacy
    await Notification.create({
      recipient: pharmacyDoc.owner,
      type: 'order-status',
      title: 'New Delivery Request',
      message: `New delivery request from ${req.user.profile.firstName} ${req.user.profile.lastName}`,
      relatedEntity: { entityType: 'order', entityId: deliveryRequest._id },
      priority: 'high',
      actionRequired: true,
      actionUrl: `/pharmacy/delivery/${deliveryRequest._id}`,
      actionButtonText: 'View Order'
    });

    const populatedRequest = await DeliveryRequest.findById(deliveryRequest._id)
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('pharmacy', 'name address contact')
      .populate('items.drug', 'name genericName form');

    res.status(201).json({
      message: 'Delivery request created successfully',
      deliveryRequest: populatedRequest
    });
  } catch (error) {
    console.error('Create delivery request error:', error);
    res.status(500).json({ message: 'Server error while creating delivery request' });
  }
});

// Get delivery requests by role
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    let filter = { isActive: true };

    // Filter based on user role
    if (req.user.role === 'patient') {
      filter.patient = req.user._id;
    } else if (req.user.role === 'pharmacy') {
      const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
      if (!pharmacy) {
        return res.status(404).json({ message: 'Pharmacy not found' });
      }
      filter.pharmacy = pharmacy._id;
    } else if (req.user.role === 'dispatcher') {
      filter.dispatcher = req.user._id;
    } else if (req.user.role === 'admin') {
      // Admin can see all, but can filter by status
    }

    if (status) {
      filter.status = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const deliveryRequests = await DeliveryRequest.find(filter)
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('pharmacy', 'name address contact')
      .populate('dispatcher', 'username profile.firstName profile.lastName')
      .populate('items.drug', 'name genericName form')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DeliveryRequest.countDocuments(filter);

    res.json({
      deliveryRequests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRequests: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get delivery requests error:', error);
    res.status(500).json({ message: 'Server error while fetching delivery requests' });
  }
});

// Get delivery request by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryRequest = await DeliveryRequest.findById(id)
      .populate('patient', 'username profile.firstName profile.lastName email')
      .populate('pharmacy', 'name address contact')
      .populate('dispatcher', 'username profile.firstName profile.lastName')
      .populate('items.drug', 'name genericName form prescriptionRequired');

    if (!deliveryRequest) {
      return res.status(404).json({ message: 'Delivery request not found' });
    }

    // Check permissions
    const isOwner = deliveryRequest.patient._id.toString() === req.user._id.toString();
    const isPharmacy = req.user.role === 'pharmacy' && 
      deliveryRequest.pharmacy._id.toString() === (await Pharmacy.findOne({ owner: req.user._id }))._id.toString();
    const isDispatcher = deliveryRequest.dispatcher && 
      deliveryRequest.dispatcher._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isPharmacy && !isDispatcher && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ deliveryRequest });
  } catch (error) {
    console.error('Get delivery request error:', error);
    res.status(500).json({ message: 'Server error while fetching delivery request' });
  }
});

// Update delivery status (pharmacy, dispatcher, or admin)
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status || !['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'on-the-way', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }

    const deliveryRequest = await DeliveryRequest.findById(id);
    if (!deliveryRequest) {
      return res.status(404).json({ message: 'Delivery request not found' });
    }

    // Check permissions and validate status transitions
    const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
    const isPharmacy = pharmacy && deliveryRequest.pharmacy.toString() === pharmacy._id.toString();
    const isDispatcher = req.user.role === 'dispatcher';
    const isAdmin = req.user.role === 'admin';

    if (!isPharmacy && !isDispatcher && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate status transitions based on role
    const pharmacyAllowedStatuses = ['confirmed', 'preparing', 'ready', 'cancelled'];
    const dispatcherAllowedStatuses = ['assigned', 'on-the-way', 'delivered'];
    
    if (isPharmacy && !pharmacyAllowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Pharmacy cannot set this status' });
    }
    
    if (isDispatcher && !dispatcherAllowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Dispatcher cannot set this status' });
    }

    // Update status
    const previousStatus = deliveryRequest.status;
    deliveryRequest.status = status;
    deliveryRequest.updatedAt = new Date();

    // Add to status history
    deliveryRequest.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: notes || ''
    });

    // Set actual delivery time if delivered
    if (status === 'delivered') {
      deliveryRequest.actualDeliveryTime = new Date();
    }

    // Set dispatcher if assigned
    if (status === 'assigned' && isDispatcher) {
      deliveryRequest.dispatcher = req.user._id;
    }

    await deliveryRequest.save();

    // Create notifications
    if (status === 'confirmed' || status === 'preparing' || status === 'ready') {
      await Notification.create({
        recipient: deliveryRequest.patient,
        type: 'order-status',
        title: 'Order Status Updated',
        message: `Your order is now ${status}`,
        relatedEntity: { entityType: 'order', entityId: deliveryRequest._id },
        priority: 'medium'
      });
    } else if (status === 'on-the-way') {
      await Notification.create({
        recipient: deliveryRequest.patient,
        type: 'delivery-update',
        title: 'Order On The Way',
        message: 'Your order is on the way for delivery',
        relatedEntity: { entityType: 'delivery', entityId: deliveryRequest._id },
        priority: 'high'
      });
    } else if (status === 'delivered') {
      await Notification.create({
        recipient: deliveryRequest.patient,
        type: 'delivery-update',
        title: 'Order Delivered',
        message: 'Your order has been delivered successfully',
        relatedEntity: { entityType: 'delivery', entityId: deliveryRequest._id },
        priority: 'medium'
      });
    }

    const updatedRequest = await DeliveryRequest.findById(deliveryRequest._id)
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('pharmacy', 'name address contact')
      .populate('dispatcher', 'username profile.firstName profile.lastName')
      .populate('items.drug', 'name genericName form');

    res.json({
      message: `Delivery status updated to ${status}`,
      deliveryRequest: updatedRequest
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ message: 'Server error while updating delivery status' });
  }
});

// Track delivery by tracking code (public endpoint)
router.get('/track/:trackingCode', async (req, res) => {
  try {
    const { trackingCode } = req.params;

    const deliveryRequest = await DeliveryRequest.findOne({ 
      trackingCode: trackingCode.toUpperCase(),
      isActive: true 
    })
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('pharmacy', 'name address contact')
      .populate('dispatcher', 'username profile.firstName profile.lastName')
      .populate('items.drug', 'name genericName form');

    if (!deliveryRequest) {
      return res.status(404).json({ message: 'Delivery request not found' });
    }

    // Return limited information for public tracking
    const publicInfo = {
      trackingCode: deliveryRequest.trackingCode,
      status: deliveryRequest.status,
      statusHistory: deliveryRequest.statusHistory,
      estimatedDeliveryTime: deliveryRequest.estimatedDeliveryTime,
      actualDeliveryTime: deliveryRequest.actualDeliveryTime,
      pharmacy: {
        name: deliveryRequest.pharmacy.name,
        contact: deliveryRequest.pharmacy.contact
      },
      items: deliveryRequest.items.map(item => ({
        drug: item.drug.name,
        quantity: item.quantity
      }))
    };

    res.json({ deliveryRequest: publicInfo });
  } catch (error) {
    console.error('Track delivery error:', error);
    res.status(500).json({ message: 'Server error while tracking delivery' });
  }
});

// Get available delivery requests for dispatchers
router.get('/available/assignments', authenticate, authorize('dispatcher'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const filter = { 
      status: 'ready', // Ready for pickup
      dispatcher: { $exists: false }, // Not assigned yet
      isActive: true 
    };

    const deliveryRequests = await DeliveryRequest.find(filter)
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('pharmacy', 'name address contact')
      .populate('items.drug', 'name genericName form')
      .sort({ createdAt: 1 }) // Oldest first
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DeliveryRequest.countDocuments(filter);

    res.json({
      deliveryRequests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRequests: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get available assignments error:', error);
    res.status(500).json({ message: 'Server error while fetching available assignments' });
  }
});

// Get delivery statistics (admin, pharmacy, or dispatcher)
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    let filter = { isActive: true };

    // Filter based on user role
    if (req.user.role === 'pharmacy') {
      const pharmacy = await Pharmacy.findOne({ owner: req.user._id });
      if (!pharmacy) {
        return res.status(404).json({ message: 'Pharmacy not found' });
      }
      filter.pharmacy = pharmacy._id;
    } else if (req.user.role === 'dispatcher') {
      filter.dispatcher = req.user._id;
    }

    const stats = await DeliveryRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalStats = await DeliveryRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
          averageValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const recentRequests = await DeliveryRequest.find(filter)
      .populate('patient', 'username profile.firstName profile.lastName')
      .populate('pharmacy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      statusStats: stats,
      overview: totalStats[0] || { totalRequests: 0, totalValue: 0, averageValue: 0 },
      recentRequests
    });
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({ message: 'Server error while fetching delivery statistics' });
  }
});

module.exports = router;
