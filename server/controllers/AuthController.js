const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.user_id,
      user_type: user.user_type
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// @desc    Show login form
// @route   GET /api/auth/login
// @access  Public
const showLogin = async (req, res) => {
  res.json({ message: 'Login page' });
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { employee_id, password } = req.body;

    // Validate input
    if (!employee_id || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide employee ID and password' 
      });
    }

    // Trim whitespace from employee_id
    const trimmedEmployeeId = employee_id.trim();

    // Find user by employee ID and populate department
    const user = await User.findOne({ user_id: trimmedEmployeeId })
      .populate('department_id', 'name');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'The employee ID does not exist in our system.' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'The password is incorrect.' 
      });
    }

    // Generate token
    const token = generateToken(user);

    // Determine redirect URL based on user type
    let redirectUrl = '/employee/dashboard';
    
    switch (user.user_type) {
      case 'hr':
        redirectUrl = '/hr/dashboard';
        break;
      case 'department_admin':
        redirectUrl = '/department/dashboard';
        break;
      case 'mayor':
        redirectUrl = '/mayor/dashboard';
        break;
      default:
        redirectUrl = '/employee/dashboard';
    }

    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        middle_initial: user.middle_initial,
        last_name: user.last_name,
        email: user.email,
        department_id: user.department_id,
        position: user.position,
        salary: user.salary,
        start_date: user.start_date,
        user_type: user.user_type,
        mustChangePassword: user.mustChangePassword
      },
      redirectUrl
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    // req.user is set by the auth middleware and already populated
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        user_id: req.user.user_id,
        first_name: req.user.first_name,
        middle_initial: req.user.middle_initial,
        last_name: req.user.last_name,
        email: req.user.email,
        department_id: req.user.department_id,
        position: req.user.position,
        salary: req.user.salary,
        start_date: req.user.start_date,
        user_type: req.user.user_type,
        profile_image: req.user.profile_image,
        signature: req.user.signature
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// @desc    Update user profile image
// @route   POST /api/auth/profile/image
// @access  Private
const updateProfileImage = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Update user with new profile image URL
    const user = await User.findOneAndUpdate(
      { user_id: req.user.user_id },
      { profile_image: req.file.path },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      profile_image: req.file.path
    });
  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile image'
    });
  }
};

// @desc    Update user digital signature
// @route   POST /api/auth/profile/signature
// @access  Private
const updateSignature = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { signature } = req.body;

    // Validate that a signature value was provided (empty string is allowed to clear)
    if (signature === undefined || typeof signature !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'No signature provided'
      });
    }

    // Update user with new signature (data URL or empty string to remove)
    const user = await User.findOneAndUpdate(
      { user_id: req.user.user_id },
      { signature },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Signature updated successfully',
      signature: user.signature
    });
  } catch (error) {
    console.error('Error updating signature:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating signature'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
};

module.exports = {
  showLogin,
  login,
  getProfile,
  updateProfileImage,
  updateSignature,
  logout
};