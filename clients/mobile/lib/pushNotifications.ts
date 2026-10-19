/**
 * Expo push notification registration.
 *
 * Registers the device for remote notifications (native only; silently skips
 * on web where the Notifications API behaves differently), obtains the Expo
 * Push Token, and persists it on the user's Firestore document so the API
 * server can send targeted pushes even when the app is backgrounded or closed.
 *
 * Call `registerAndSavePushToken(uid)` once after sign-in — it is idempotent
 * and safe to call on every app open.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Configure how incoming notifications are presented while the app is in the
// foreground (banner + sound + badge dot). Uses the v2 API fields.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and, if granted, obtain the Expo Push
 * Token, then write it to `users/{uid}.expoPushToken` in Firestore.
 *
 * The token is a stable string of the form `ExponentPushToken[...]`. Expo's
 * push service uses it to route the notification to the correct device.
 *
 * Silently no-ops on web — Expo notifications require a native runtime.
 * Also no-ops when no EAS project ID is configured (e.g. bare development
 * without EAS credentials) since `getExpoPushTokenAsync` requires one.
 */
export async function registerAndSavePushToken(uid: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!db) return;

  try {
    // Expo push tokens require an EAS project ID to be configured. Without
    // one, getExpoPushTokenAsync() will throw — check early and skip cleanly
    // rather than silently swallowing the error.
    const projectId: string | undefined =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra as Record<string, any> | undefined)?.eas?.projectId;

    if (!projectId) {
      // Not running in an EAS-enrolled build; push registration is unavailable.
      return;
    }

    // getPermissionsAsync / requestPermissionsAsync extend PermissionResponse
    // from 'expo'. Cast via unknown to access the standard `granted` and
    // `canAskAgain` fields that TS can't see through the transitive import.
    const existingResult = (await Notifications.getPermissionsAsync()) as unknown as {
      granted: boolean;
      canAskAgain: boolean;
    };
    let granted = existingResult.granted;

    if (!granted && existingResult.canAskAgain) {
      const requested = (await Notifications.requestPermissionsAsync()) as unknown as {
        granted: boolean;
      };
      granted = requested.granted;
    }

    if (!granted) {
      // User declined — don't persist anything; we'll try again next launch.
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    if (!token) return;

    // Merge-write so we don't clobber other profile fields.
    await setDoc(
      doc(db, 'users', uid),
      { expoPushToken: token },
      { merge: true }
    );
  } catch (err) {
    // Best-effort — notification failure must never break sign-in or the app.
    console.warn('[pushNotifications] registration failed:', err);
  }
}
