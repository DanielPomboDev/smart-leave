// Import Firebase and initialize messaging
importScripts("https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.1.3/firebase-messaging-compat.js");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5jcugxxICocTxt3nJMo2h1c8LSPB8DXU",
  authDomain: "smart-leave-mern.firebaseapp.com",
  projectId: "smart-leave-mern",
  storageBucket: "smart-leave-mern.firebasestorage.app",
  messagingSenderId: "361014009148",
  appId: "1:361014009148:web:0de0f7a74bb4b151ca1239",
  measurementId: "G-ZJ1R3HRWMP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || "/favicon.ico",
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});