import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from '../api/api';

// Configure how notifications appear while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

async function registerForPushNotifications() {
  if (!Device.isDevice) return null; // push doesn't work on simulators

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

export default function usePushNotifications(user) {
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications()
      .then(token => {
        if (token) {
          api.post('/auth/push-token', { token }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [user?.id]); // re-run if the logged-in user changes
}
