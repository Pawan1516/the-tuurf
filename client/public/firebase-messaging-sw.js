// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
  apiKey: "AIzaSyDvQHltVOOS-vvr4egHilYHGLJ9Vq7qnSE",
  authDomain: "the-turf-79c80.firebaseapp.com",
  projectId: "the-turf-79c80",
  storageBucket: "the-turf-79c80.firebasestorage.app",
  messagingSenderId: "689625083056",
  appId: "1:689625083056:web:39a2a9c457e5e6e7355f75",
  measurementId: "G-ZRH0CYBFQZ"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title || 'New Notification from The Turf';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
