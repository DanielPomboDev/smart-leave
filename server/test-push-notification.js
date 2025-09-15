// Test script for push notifications
const { sendPushNotification } = require('./utils/pushNotifications');

// Replace with a valid FCM token for testing
const TEST_FCM_TOKEN = 'YOUR_TEST_FCM_TOKEN_HERE';

async function testPushNotification() {
  try {
    console.log('Testing push notification...');
    
    const result = await sendPushNotification(
      TEST_FCM_TOKEN,
      'Test Notification',
      'This is a test push notification from SmartLeave',
      { 
        type: 'test',
        timestamp: new Date().toISOString()
      }
    );
    
    if (result.success) {
      console.log('Push notification sent successfully!');
    } else {
      console.log('Failed to send push notification:', result.error);
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testPushNotification();