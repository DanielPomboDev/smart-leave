// Firebase Admin SDK configuration using Web Push Certificates
const admin = require("firebase-admin");

// VAPID keys for Web Push
// These are set in the .env file
const vapidKeys = {
  publicKey: process.env.FIREBASE_VAPID_PUBLIC_KEY,
  privateKey: process.env.FIREBASE_VAPID_PRIVATE_KEY
};

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  // Only initialize if not already initialized
  if (!admin.apps.length) {
    // Try to initialize with service account credentials if available
    // Otherwise, initialize with default credentials
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } catch (error) {
      console.error("Error initializing Firebase Admin SDK:", error);
      // Fallback to default initialization
      admin.initializeApp();
    }
  }
  
  return admin;
};

// Check if VAPID keys are properly configured
const isVapidConfigured = () => {
  return vapidKeys.publicKey && vapidKeys.privateKey && vapidKeys.privateKey !== "";
};

module.exports = { 
  initializeFirebase,
  vapidKeys,
  isVapidConfigured
};