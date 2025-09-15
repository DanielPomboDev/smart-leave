const admin = require("firebase-admin");
const { vapidKeys, isVapidConfigured } = require("../config/firebase");

// Function to send push notification to a specific FCM token
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  try {
    // Check if VAPID keys are configured
    if (!isVapidConfigured()) {
      console.warn("VAPID keys not configured. Skipping push notification.");
      return { success: false, error: "VAPID keys not configured" };
    }

    // Initialize Firebase Admin SDK if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    // Create message payload
    const message = {
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: data, // Additional data payload
    };

    // Send message
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
    return { success: true, response };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: error.message };
  }
};

// Function to send push notifications to multiple tokens
const sendPushNotifications = async (fcmTokens, title, body, data = {}) => {
  try {
    // Check if VAPID keys are configured
    if (!isVapidConfigured()) {
      console.warn("VAPID keys not configured. Skipping push notifications.");
      return { success: false, error: "VAPID keys not configured" };
    }

    // Initialize Firebase Admin SDK if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    // Create multicast message
    const message = {
      tokens: fcmTokens,
      notification: {
        title: title,
        body: body,
      },
      data: data,
    };

    // Send multicast message
    const response = await admin.messaging().sendMulticast(message);
    
    // Log results
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(fcmTokens[idx]);
          console.error('Failure sending notification to', fcmTokens[idx], resp.error);
        }
      });
      console.log('List of tokens that caused failures: ', failedTokens);
    }
    
    console.log("Successfully sent messages:", response);
    return { success: true, response };
  } catch (error) {
    console.error("Error sending push notifications:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification,
  sendPushNotifications,
};