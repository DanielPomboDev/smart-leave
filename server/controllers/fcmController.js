const User = require('../models/User');

// Save FCM token for a user
exports.saveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id; // Assuming you have middleware that sets req.user
    
    console.log('Received FCM token save request:', { fcmToken, userId }); // Add this log
    
    // Validate input
    if (!fcmToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'FCM token is required' 
      });
    }
    
    // Update user with FCM token
    const user = await User.findByIdAndUpdate(
      userId,
      { fcm_token: fcmToken },
      { new: true, runValidators: true }
    );
    
    console.log('User after FCM token update:', user); // Add this log
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'FCM token saved successfully',
      user: {
        id: user.id,
        fcm_token: user.fcm_token
      }
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save FCM token',
      error: error.message 
    });
  }
};