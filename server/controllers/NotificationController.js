const Notification = require('../models/Notification');

// Get all notifications for a user
const getUserNotifications = async (req, res) => {
  try {
    const { user_id, user_type, _id } = req.user;
    const { limit = 10, offset = 0, read } = req.query;
    
    // Build query - using _id as the notifiableId since that's what we stored
    const query = {
      notifiableType: user_type,
      notifiableId: _id.toString() // Convert ObjectId to string for comparison
    };
    
    // Filter by read status if specified
    if (read !== undefined) {
      if (read === 'true') {
        query.readAt = { $ne: null };
      } else if (read === 'false') {
        query.readAt = null;
      }
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
      
    const total = await Notification.countDocuments(query);
    
    res.json({
      success: true,
      notifications,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

// Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_type, _id } = req.user;
    
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: id,
        notifiableType: user_type,
        notifiableId: _id.toString()
      },
      { readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const { user_id, user_type, _id } = req.user;
    
    const result = await Notification.updateMany(
      { 
        notifiableType: user_type,
        notifiableId: _id.toString(),
        readAt: null
      },
      { readAt: new Date() }
    );
    
    res.json({ 
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_type, _id } = req.user;
    
    const notification = await Notification.findOneAndDelete({
      _id: id,
      notifiableType: user_type,
      notifiableId: _id.toString()
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
};

// Create a notification (internal use)
const createNotification = async (notifiableType, notifiableId, type, data) => {
  try {
    const notification = new Notification({
      type,
      notifiableType,
      notifiableId,
      data
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
};