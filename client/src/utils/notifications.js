import { messaging, getToken, onMessage } from '../firebase';
import { authAPI } from '../api/client';
import { toast } from 'react-toastify';

const VAPID_KEY = "BNvJqIuV_Y2B1_xR8d2OqZ5Fp_R_KqK_q9_K9_K9_K9_K9_K9_K9_K9_K9_K9_K9_K9_K9_K9"; // 🚨 USER SHOULD PROVIDE THIS OR I USE A PLACEHOLDER

export const requestNotificationPermission = async (userId) => {
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || VAPID_KEY
      });

      if (token) {
        console.log('FCM Token:', token);
        // Send to backend
        try {
          await authAPI.updateFCMToken({ fcmToken: token });
          console.log('FCM Token synced with backend');
        } catch (err) {
          console.error('Failed to sync FCM token:', err);
        }
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Payload:", payload);
      resolve(payload);
    });
  });
