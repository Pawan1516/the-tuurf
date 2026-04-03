import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

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
const app = initializeApp(firebaseConfig);

// Initialize Analytics
export const analytics = getAnalytics(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Messaging
export const messaging = getMessaging(app);

export { getToken, onMessage };
