const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Pharmacy = require('../models/Pharmacy');
const { authenticate, authorize, checkOwnership } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (status === 'approved') filter.isApproved = true;
    if (status === 'pending') filter.isApproved = false;
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// Get user by ID (admin or owner)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Admin can view any user, users can only view their own profile
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is a pharmacy, also fetch pharmacy details
    let pharmacy = null;
    if (user.role === 'pharmacy') {
      pharmacy = await Pharmacy.findOne({ owner: user._id });
    }

    res.json({ user, pharmacy });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
});

// Update user profile
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only update their own profile, admin can update any
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const allowedUpdates = ['profile', 'isActive', 'isApproved'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Only admin can change approval status and active status
    if (req.user.role !== 'admin') {
      delete updates.isActive;
      delete updates.isApproved;
    }

    // Don't allow role changes through this endpoint
    if (req.body.role !== undefined) {
      return res.status(400).json({ message: 'Role changes are not allowed through this endpoint' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deletion of admin users
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin users' });
    }

    // If user is a pharmacy, also delete the pharmacy
    if (user.role === 'pharmacy') {
      await Pharmacy.deleteOne({ owner: user._id });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
});

// Approve/Reject pharmacy registration (admin only)
router.patch('/:id/approval', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved, rejectionReason } = req.body;

    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({ message: 'isApproved must be a boolean' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'pharmacy') {
      return res.status(400).json({ message: 'Only pharmacy users can be approved/rejected' });
    }

    user.isApproved = isApproved;
    user.updatedAt = new Date();

    await user.save();

    // If approved, also approve the pharmacy
    if (isApproved) {
      await Pharmacy.findOneAndUpdate(
        { owner: user._id },
        { isApproved: true, updatedAt: new Date() }
      );
    } else {
      // If rejected, deactivate the pharmacy
      await Pharmacy.findOneAndUpdate(
        { owner: user._id },
        { isApproved: false, updatedAt: new Date() }
      );
    }

    // Create notification for the pharmacy user
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: user._id,
      type: 'approval-status',
      title: isApproved ? 'Pharmacy Approved' : 'Pharmacy Registration Rejected',
      message: isApproved 
        ? 'Your pharmacy registration has been approved. You can now start managing your inventory.'
        : `Your pharmacy registration has been rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
      priority: isApproved ? 'medium' : 'high'
    });

    res.json({
      message: `Pharmacy ${isApproved ? 'approved' : 'rejected'} successfully`,
      user: user.select('-password')
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ message: 'Server error while updating approval status' });
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          approved: { $sum: { $cond: ['$isApproved', 1, 0] } }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const approvedUsers = await User.countDocuments({ isApproved: true });

    res.json({
      totalUsers,
      activeUsers,
      approvedUsers,
      roleStats: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error while fetching user statistics' });
  }
});

module.exports = router;
