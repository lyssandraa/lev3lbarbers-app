import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from '../api/api';

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
  // setNotificationHandler is a synchronous native call — calling it at
  // module scope (before the app has mounted) crashed the app at launch
  // with SIGABRT / objc_exception_rethrow, since the native module wasn't
  // guaranteed to be initialized yet. Registering it inside an effect
  // guarantees the RN bridge/native modules are already up.
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  false,
      }),
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    registerForPushNotifications()
      .then(token => {
        if (!token || cancelled) return;
        api.post('/auth/push-token', { token }).catch(() => {});
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user]);
}
