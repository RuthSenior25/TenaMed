const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');

// Get government statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('🏛️ [GOVT] Fetching government statistics...');
    
    // Get real system statistics
    const [
      totalPharmacies,
      activePharmacies,
      totalPatients,
      totalOrders,
      completedDeliveries,
      pendingDeliveries,
      totalDrivers,
      activeDrivers
    ] = await Promise.all([
      User.countDocuments({ role: 'pharmacy' }),
      User.countDocuments({ role: 'pharmacy', status: 'approved', isActive: true }),
      User.countDocuments({ role: 'patient' }),
      Order.countDocuments(),
      Delivery.countDocuments({ status: 'delivered' }),
      Delivery.countDocuments({ status: { $in: ['assigned', 'picked_up', 'in_transit'] } }),
      User.countDocuments({ role: 'delivery_person' }),
      User.countDocuments({ role: 'delivery_person', isApproved: true, isActive: true })
    ]);

    // Calculate compliance rate (active pharmacies / total pharmacies)
    const complianceRate = totalPharmacies > 0 ? Math.round((activePharmacies / totalPharmacies) * 100) : 0;
    
    // Calculate monthly growth (new pharmacies this month)
    const thisMonth = new Date();
    thisMonth.setDate(1); // First day of current month
    const monthlyGrowth = await User.countDocuments({ 
      role: 'pharmacy', 
      createdAt: { $gte: thisMonth } 
    });

    // Calculate delivery success rate
    const deliverySuccessRate = completedDeliveries > 0 ? 
      Math.round((completedDeliveries / (completedDeliveries + pendingDeliveries)) * 100) : 0;

    // Get recent orders for monitoring
    const recentOrders = await Order.find()
      .populate('pharmacyId', 'pharmacyName')
      .populate('patientId', 'email profile')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get pending pharmacy registrations
    const pendingPharmacies = await User.find({ 
      role: 'pharmacy', 
      status: 'pending' 
    })
    .select('email profile pharmacyName createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

    const stats = {
      // Pharmacy statistics
      totalPharmacies,
      activePharmacies,
      pendingPharmacies: pendingPharmacies.length,
      complianceRate,
      monthlyGrowth,
      
      // User statistics
      totalPatients,
      totalDrivers,
      activeDrivers,
      
      // Order and delivery statistics
      totalOrders,
      completedDeliveries,
      pendingDeliveries,
      deliverySuccessRate,
      
      // System health
      systemStatus: 'operational',
      lastUpdated: new Date().toISOString()
    };

    console.log('✅ [GOVT] Statistics fetched successfully:', {
      pharmacies: `${activePharmacies}/${totalPharmacies}`,
      compliance: `${complianceRate}%`,
      orders: totalOrders,
      deliveries: `${completedDeliveries} completed, ${pendingDeliveries} pending`
    });

    res.json({
      success: true,
      data: stats,
      recentOrders,
      pendingPharmacies
    });

  } catch (error) {
    console.error('❌ [GOVT] Error fetching statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch government statistics', 
      error: error.message 
    });
  }
});

// Get all pharmacies for monitoring
router.get('/pharmacies', auth.authenticate, auth.checkRole(['government', 'admin']), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { role: 'pharmacy' };
    if (status) {
      query.status = status;
    }

    const pharmacies = await User.find(query)
      .select('email profile pharmacyName status isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: pharmacies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ [GOVT] Error fetching pharmacies:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pharmacies', 
      error: error.message 
    });
  }
});

// Get system activity logs
router.get('/activity', auth.authenticate, auth.checkRole(['government', 'admin']), async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get recent activities from different collections
    const [
      recentOrders,
      recentDeliveries,
      recentUsers
    ] = await Promise.all([
      Order.find({ createdAt: { $gte: startDate } })
        .populate('pharmacyId', 'pharmacyName')
        .populate('patientId', 'email profile')
        .sort({ createdAt: -1 })
        .limit(10),
      Delivery.find({ createdAt: { $gte: startDate } })
        .populate('orderId', 'medications totalAmount')
        .populate('driverId', 'email profile')
        .sort({ createdAt: -1 })
        .limit(10),
      User.find({ createdAt: { $gte: startDate } })
        .select('email role profile createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const activities = [
      ...recentOrders.map(order => ({
        type: 'order',
        action: 'New order placed',
        details: `Order from ${order.patientId?.profile?.firstName || 'Patient'} to ${order.pharmacyId?.pharmacyName || 'Pharmacy'}`,
        timestamp: order.createdAt,
        user: order.patientId?.email
      })),
      ...recentDeliveries.map(delivery => ({
        type: 'delivery',
        action: `Delivery ${delivery.status}`,
        details: `Order #${delivery.orderId} ${delivery.status}`,
        timestamp: delivery.createdAt,
        user: delivery.driverId?.email
      })),
      ...recentUsers.map(user => ({
        type: 'user',
        action: `New ${user.role} registered`,
        details: `${user.profile?.firstName || 'User'} joined the system`,
        timestamp: user.createdAt,
        user: user.email
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('❌ [GOVT] Error fetching activity logs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch activity logs', 
      error: error.message 
    });
  }
});

module.exports = router;
