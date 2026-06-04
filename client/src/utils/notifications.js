import { messaging, getToken, onMessage } from '../firebase';
import { authAPI } from '../api/client';
import { toast } from 'react-toastify';

const VAPID_KEY = "BNRvVzGhWb6ZpFhous0nLoEdHeFSKxufV_av4F84uB8gN586DR4H9H4s4XLDGR_ixENnTiksVEjqKpugAJlJbW8"; 

export const getNotificationStatus = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

let isSyncing = false;

export const requestNotificationPermission = async (userId) => {
  if (isSyncing) return;
  
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY || VAPID_KEY
      });

      if (token) {
        // Only sync if token has changed or not yet synced this session
        const lastSyncedToken = sessionStorage.getItem('lastFcmToken');
        if (lastSyncedToken === token) return;

        isSyncing = true;
        try {
          await authAPI.updateFCMToken({ fcmToken: token });
          sessionStorage.setItem('lastFcmToken', token);
          console.log('FCM Token synchronized with security node.');
        } catch (err) {
          if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
            console.error('Failed to sync FCM token:', err);
          }
        } finally {
          isSyncing = false;
        }
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
