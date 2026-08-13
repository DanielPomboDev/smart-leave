const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @desc    Update user password
// @route   PUT /api/settings/password
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const { password, password_confirmation } = req.body;

    // Validate input
    if (!password || !password_confirmation) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both password and password confirmation'
      });
    }

    if (password !== password_confirmation) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Log for debugging
    console.log('User from request:', req.user);
    
    // Update user password using the custom user_id field
    // req.user.user_id corresponds to the user_id field in the User model
    // Also clear mustChangePassword — the user has now chosen their own password
    const updatedUser = await User.findOneAndUpdate(
      { user_id: req.user.user_id },
      { password: hashedPassword, mustChangePassword: false },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.log('User not found with user_id:', req.user.user_id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating password'
    });
  }
};

module.exports = {
  updatePassword
};