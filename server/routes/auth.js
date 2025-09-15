const express = require('express');
const { showLogin, login, getProfile, logout, updateProfileImage } = require('../controllers/AuthController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { saveFcmToken } = require('../controllers/fcmController');

const router = express.Router();

// Show login form
router.get('/login', showLogin);

// Login user
router.post('/login', login);

// Get user profile (protected route)
router.get('/profile', protect, getProfile);

// Update profile image (protected route)
router.post('/profile/image', protect, upload.single('profileImage'), updateProfileImage);

// Save FCM token (protected route)
router.post('/save-fcm-token', protect, (req, res, next) => {
  console.log('FCM token save route called'); // Add this log
  next();
}, saveFcmToken);

// Logout user
router.post('/logout', logout);

module.exports = router;