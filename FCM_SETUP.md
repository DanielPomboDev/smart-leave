# Firebase Cloud Messaging (FCM) Push Notifications Setup

This document explains how to set up and use Firebase Cloud Messaging (FCM) push notifications in the SmartLeave application.

## Overview

The SmartLeave application uses Firebase Cloud Messaging (FCM) to send push notifications to users when important events occur, such as:
- New leave requests
- Leave request status updates (approved, disapproved, etc.)

The implementation consists of:
1. Client-side setup (React app) - requests permission and gets FCM token
2. Server-side setup (Node.js app) - sends push notifications using Firebase Admin SDK

## Setup Instructions

### 1. Firebase Project Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Register your web app in the Firebase project
3. Note the Firebase configuration values (apiKey, authDomain, etc.)

### 2. Web Push Certificates

1. In the Firebase Console, go to Project Settings > Cloud Messaging
2. In the "Web Push certificates" section, find your key pair
3. Click the three dots menu (...) next to your key pair and select "Manage key pair"
4. Copy both the "Public key" and "Private key" values

### 3. Client-side Configuration

The client-side configuration is handled through environment variables in the `.env` file:

```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
REACT_APP_FIREBASE_VAPID_KEY=your_public_vapid_key
```

### 4. Server-side Configuration

The server-side configuration is handled through environment variables in the `.env` file:

```
FIREBASE_VAPID_PUBLIC_KEY=your_public_vapid_key
FIREBASE_VAPID_PRIVATE_KEY=your_private_vapid_key
```

## How It Works

### Client-side (React)

1. When a user logs in, the app requests permission to send notifications
2. If permission is granted, the app retrieves an FCM token
3. The FCM token is sent to the server and stored in the user's database record
4. A service worker handles background messages

### Server-side (Node.js)

1. When an important event occurs (e.g., leave request approved), the server retrieves the user's FCM token
2. The server uses the Firebase Admin SDK to send a push notification to the user's device
3. The notification includes relevant information about the event

## Testing

To test the push notification system:

1. Ensure both the client and server are properly configured with Firebase credentials
2. Start the client and server applications
3. Log in as a user and enable notifications in the profile settings
4. Trigger an event that should send a notification (e.g., submit a leave request)
5. Check that a push notification is received

## Troubleshooting

### Common Issues

1. **Notifications not received**: Ensure the browser allows notifications for the site
2. **FCM token not generated**: Check that all Firebase configuration values are correct
3. **Server errors**: Verify that the VAPID keys are correctly set in the server `.env` file

### Debugging

1. Check the browser console for any JavaScript errors
2. Check the server logs for any error messages
3. Verify that the FCM token is being correctly stored in the database
4. Use the Firebase Console to check if messages are being sent successfully

## Security Considerations

1. Never commit Firebase credentials to version control
2. Use environment variables to store sensitive information
3. Ensure that only authorized users can receive notifications
4. Regularly rotate your Firebase keys for security

## Further Reading

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)