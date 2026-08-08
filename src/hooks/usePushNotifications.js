// TEMPORARILY DISABLED (again) — re-enabling this after moving
// setNotificationHandler() into a useEffect (so it no longer runs at
// module-import time) produced a NEW symptom on a fresh build: the app opens
// to a solid black screen and stays there, with NOTHING in the on-device
// crash log. That rules out a native SIGABRT this time — it means whatever
// is failing is a plain JS-level error, but it's happening somewhere the
// app's own ErrorBoundary/AppNavigator-load diagnostics (see App.js) don't
// catch it, which most likely means it's blocking synchronously during
// module evaluation rather than during a render/effect.
//
// Still unresolved: why the native module isn't behaving. One real
// candidate — this project was transferred to a different EAS team
// ("lysandra's team") shortly before this, and push notification
// credentials/entitlements are per-team; they may not have been
// regenerated for the new team. Needs its own investigation before
// re-enabling. Disabled here so the rest of this batch of changes (tabs,
// admin panel, sound effect, etc.) can be tested independently.
//
// import { useEffect } from 'react';
// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import Constants from 'expo-constants';
// import api from '../api/api';
//
// async function registerForPushNotifications() {
//   if (!Device.isDevice) return null; // push doesn't work on simulators
//
//   const { status: existing } = await Notifications.getPermissionsAsync();
//   let finalStatus = existing;
//
//   if (existing !== 'granted') {
//     const { status } = await Notifications.requestPermissionsAsync();
//     finalStatus = status;
//   }
//
//   if (finalStatus !== 'granted') return null;
//
//   const projectId = Constants.expoConfig?.extra?.eas?.projectId;
//   if (!projectId) return null;
//
//   const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
//   return token;
// }
//
// export default function usePushNotifications(user) {
//   useEffect(() => {
//     Notifications.setNotificationHandler({
//       handleNotification: async () => ({
//         shouldShowAlert: true,
//         shouldPlaySound: true,
//         shouldSetBadge:  false,
//       }),
//     });
//   }, []);
//
//   useEffect(() => {
//     if (!user) return;
//     let cancelled = false;
//
//     registerForPushNotifications()
//       .then(token => {
//         if (!token || cancelled) return;
//         api.post('/auth/push-token', { token }).catch(() => {});
//       })
//       .catch(() => {});
//
//     return () => { cancelled = true; };
//   }, [user]);
// }

export default function usePushNotifications() {
  // no-op while push notifications are disabled
}
