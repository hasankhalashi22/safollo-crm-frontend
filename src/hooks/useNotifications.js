import { useEffect } from 'react';
import { useAuth } from './useAuth';
import api from '../api/client';

export function useNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    registerAndSubscribe();
  }, [user]);

  const registerAndSubscribe = async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Get VAPID key
      const res = await api.get('/api/notifications/vapid-key');
      const vapidKey = res.publicKey;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Save subscription to backend
      await api.post('/api/notifications/subscribe', subscription);

    } catch (err) {
      console.error('Push notification setup error:', err);
    }
  };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}