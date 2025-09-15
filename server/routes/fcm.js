const express = require('express');
const router = express.Router();
const { saveFcmToken } = require('../controllers/fcmController');
const auth = require('../middleware/auth');

// Route to save FCM token
router.post('/save-fcm-token', auth, saveFcmToken);

module.exports = router;