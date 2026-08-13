const express = require('express');
const rateLimit = require('express-rate-limit');
const { showLogin, login, getProfile, logout, updateProfileImage, updateSignature } = require('../controllers/AuthController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Brute-force protection: max 20 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }
});

// Show login form
router.get('/login', showLogin);

// Login user
router.post('/login', loginLimiter, login);

// Get user profile (protected route)
router.get('/profile', protect, getProfile);

// Update profile image (protected route)
router.post('/profile/image', protect, upload.single('profileImage'), updateProfileImage);

// Update digital signature (protected route)
router.post('/profile/signature', protect, updateSignature);

// Logout user
router.post('/logout', logout);

module.exports = router;