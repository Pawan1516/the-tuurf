import React, { useState } from 'react';
import { messaging } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { Bell, Copy, CheckCircle } from 'lucide-react';

const PushNotificationManager = () => {
  const [fcmToken, setFcmToken] = useState(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastNotification, setLastNotification] = useState(null);

  // YOUR VAPID KEY
  const vapidKey = 'BNRvVzGhWb6ZpFhous0nLoEdHeFSKxufV_av4F84uB8gN586DR4H9H4s4XLDGR_ixENnTiksVEjqKpugAJlJbW8';

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setIsPermissionGranted(true);
        // Get the token from Firebase
        const token = await getToken(messaging, { vapidKey });
        
        if (token) {
          setFcmToken(token);
          console.log("FCM Token Received: ", token);
        } else {
          console.log('No registration token generated. Request permission to generate one.');
        }

        // Set up listener for foreground messages
        onMessage(messaging, (payload) => {
          console.log('Message received. ', payload);
          setLastNotification(payload.notification);
          // Show foreground toast dynamically (optional)
          alert(`🔔 ${payload.notification.title}\n${payload.notification.body}`);
        });

      } else {
        alert('Permission for notifications was denied or dismissed.');
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      alert('Error requesting push notification permission. See console.');
    }
  };

  const copyToClipboard = () => {
    if (fcmToken) {
      navigator.clipboard.writeText(fcmToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex flex-col gap-4 max-w-md w-full mx-auto my-8">
      <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
        <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl">
          <Bell size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Push Notifications</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Firebase Cloud Messaging</p>
        </div>
      </div>

      {!isPermissionGranted ? (
        <button
          onClick={requestPermission}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
          <Bell size={16} /> Enable Notifications
        </button>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-800 mb-2">Your Device Registration Token:</h3>
            <div className="flex items-end gap-2">
              <textarea 
                readOnly 
                value={fcmToken || "Fetching..."} 
                className="w-full h-24 p-2 text-[10px] font-mono bg-white border border-emerald-200 rounded-lg text-emerald-900 outline-none resize-none"
              />
              <button 
                onClick={copyToClipboard}
                title="Copy Token"
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex-shrink-0"
              >
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          {lastNotification && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl animate-fade-in">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-1">Last Notification Received:</h3>
              <p className="font-bold text-sm text-blue-900">{lastNotification.title}</p>
              <p className="text-xs text-blue-700 mt-1">{lastNotification.body}</p>
            </div>
          )}
          
          <p className="text-center text-[10px] text-gray-400 font-bold px-2">
            Copy this token and use your Firebase Console (Messaging tab) to send a test push notification to this exact device!
          </p>
        </div>
      )}
    </div>
  );
};

export default PushNotificationManager;
