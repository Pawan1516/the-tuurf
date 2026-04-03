importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDvQHltVOOS-vvr4egHilYHGLJ9Vq7qnSE",
  authDomain: "the-turf-79c80.firebaseapp.com",
  projectId: "the-turf-79c80",
  storageBucket: "the-turf-79c80.firebasestorage.app",
  messagingSenderId: "689625083056",
  appId: "1:689625083056:web:39a2a9c457e5e6e7355f75",
  measurementId: "G-ZRH0CYBFQZ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // User should provide valid icon path
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
