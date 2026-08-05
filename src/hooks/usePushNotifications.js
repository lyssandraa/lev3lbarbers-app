// TEMPORARILY DISABLED — Notifications.setNotificationHandler() (called at
// module scope below, unconditionally, on every app launch) is a void-return
// TurboModule call into expo-notifications' native side, and it's crashing
// the app at startup with SIGABRT / objc_exception_rethrow inside
// performVoidMethodInvocation (confirmed via on-device crash log). Likely
// the same root cause as the earlier "Cannot find native module
// ExpoPushTokenManager" error seen on a dev-client build — expo-notifications'
// native module isn't correctly linked/configured in this project. Needs a
// proper fix (reinstall/reconfigure the package, possibly a clean prebuild)
// as its own follow-up; disabled here so the rest of the app is unblocked.
//
// import { useEffect } from 'react';
// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import Constants from 'expo-constants';
// import api from '../api/api';
//
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge:  false,
//   }),
// });
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

export default function usePushNotifications() {
  // no-op while push notifications are disabled
}
