import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { requestForToken } from './firebase';

// Function to initialize Firebase Cloud Messaging
const initializeFirebase = async () => {
  try {
    // Request permission and get FCM token
    const token = await requestForToken();
    if (token) {
      console.log('FCM Token:', token);
      // Here you would typically send the token to your server
      // We'll implement this in the next step
    } else {
      console.log('Failed to get FCM token');
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
};

// Initialize Firebase when the app loads
initializeFirebase();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
