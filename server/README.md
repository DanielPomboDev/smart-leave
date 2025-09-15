# SmartLeave Server

This is the backend server for the SmartLeave application, built with Node.js, Express, and MongoDB.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Firebase Account (for push notifications)

### Installation

1. Clone the repository
2. Navigate to the server directory: `cd server`
3. Install dependencies: `npm install`

### Environment Variables

Create a `.env` file in the server directory with the following variables:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartleave
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FIREBASE_VAPID_PUBLIC_KEY=your_firebase_vapid_public_key
FIREBASE_VAPID_PRIVATE_KEY=your_firebase_vapid_private_key
```

### Firebase Configuration for Push Notifications

This server uses Firebase Cloud Messaging (FCM) for push notifications. To set up FCM:

1. Create a Firebase project at https://console.firebase.google.com/
2. Register your web app in the Firebase project
3. Get the Firebase configuration values (apiKey, authDomain, etc.)
4. In the Firebase Console, go to Project Settings > Cloud Messaging
5. In the "Web Push certificates" section, find your key pair
6. Click the three dots menu (...) next to your key pair and select "Manage key pair"
7. Copy both the "Public key" and "Private key" values
8. Add these values to your `.env` file as `FIREBASE_VAPID_PUBLIC_KEY` and `FIREBASE_VAPID_PRIVATE_KEY`

### Running the Server

- Development: `npm run dev`
- Production: `npm start`

## API Endpoints

(Add API documentation here)

## License

(Add license information here)