const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');

// Get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      priority, 
      read, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const filter = { recipient: req.user._id, isActive: true };
    
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (read !== undefined) filter.isRead = read === 'true';

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const notifications = await Notification.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);

    // Add time ago calculation
    const notificationsWithTimeAgo = notifications.map(notification => ({
      ...notification.toObject(),
      timeAgo: getTimeAgo(notification.createdAt)
    }));

    res.json({
      notifications: notificationsWithTimeAgo,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalNotifications: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

// Get unread notification count
router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
      isActive: true
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error while fetching unread count' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error while marking notification as read' });
  }
});

// Mark all notifications as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false, isActive: true },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error while marking all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete
    notification.isActive = false;
    await notification.save();

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error while deleting notification' });
  }
});

// Create notification (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { recipients, type, title, message, priority, relatedEntity, actionRequired, actionUrl, actionButtonText } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ message: 'At least one recipient is required' });
    }

    const notifications = recipients.map(recipient => ({
      recipient,
      type,
      title,
      message,
      priority: priority || 'medium',
      relatedEntity,
      actionRequired: actionRequired || false,
      actionUrl,
      actionButtonText
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(201).json({
      message: 'Notifications created successfully',
      notifications: createdNotifications
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Server error while creating notification' });
  }
});

// Get notification by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ notification });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ message: 'Server error while fetching notification' });
  }
});

// Get notification types (for admin)
router.get('/types/list', authenticate, authorize('admin'), async (req, res) => {
  try {
    const types = await Notification.distinct('type');
    
    const typeCounts = await Promise.all(
      types.map(async (type) => {
        const count = await Notification.countDocuments({ type, isActive: true });
        return { type, count };
      })
    );

    res.json({ types: typeCounts });
  } catch (error) {
    console.error('Get notification types error:', error);
    res.status(500).json({ message: 'Server error while fetching notification types' });
  }
});

// Get notification statistics (admin or user)
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    let filter = { isActive: true };

    if (req.user.role !== 'admin') {
      filter.recipient = req.user._id;
    }

    const stats = await Notification.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          unreadNotifications: { $sum: { $cond: ['$isRead', 0, 1] } },
          highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          actionRequired: { $sum: { $cond: ['$actionRequired', 1, 0] } }
        }
      }
    ]);

    const typeStats = await Notification.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: { $sum: { $cond: ['$isRead', 0, 1] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const recentNotifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      overview: stats[0] || { totalNotifications: 0, unreadNotifications: 0, highPriority: 0, actionRequired: 0 },
      types: typeStats,
      recentNotifications
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ message: 'Server error while fetching notification statistics' });
  }
});

// Send bulk notifications (admin only)
router.post('/bulk', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { recipientRole, type, title, message, priority, relatedEntity, actionRequired, actionUrl, actionButtonText } = req.body;

    if (!recipientRole) {
      return res.status(400).json({ message: 'Recipient role is required' });
    }

    // Get all users with specified role
    const User = require('../models/User');
    const recipients = await User.find({ role: recipientRole, isActive: true }).select('_id');

    if (recipients.length === 0) {
      return res.status(404).json({ message: 'No users found with specified role' });
    }

    const notifications = recipients.map(recipient => ({
      recipient: recipient._id,
      type,
      title,
      message,
      priority: priority || 'medium',
      relatedEntity,
      actionRequired: actionRequired || false,
      actionUrl,
      actionButtonText
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(201).json({
      message: `Bulk notifications sent to ${recipients.length} users`,
      notifications: createdNotifications
    });
  } catch (error) {
    console.error('Send bulk notifications error:', error);
    res.status(500).json({ message: 'Server error while sending bulk notifications' });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + ' years ago';
  if (interval === 1) return '1 year ago';
  
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + ' months ago';
  if (interval === 1) return '1 month ago';
  
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + ' days ago';
  if (interval === 1) return '1 day ago';
  
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + ' hours ago';
  if (interval === 1) return '1 hour ago';
  
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + ' minutes ago';
  if (interval === 1) return '1 minute ago';
  
  return 'Just now';
}

module.exports = router;
