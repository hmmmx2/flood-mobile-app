/**
 * Push notification helpers — shared across entry points.
 *
 * Used by:
 *   - app/index.tsx     (session restore)
 *   - app/(app)/_layout.tsx  (fresh login / register)
 *
 * Always non-blocking — errors are silently swallowed so they never
 * interrupt the authentication flow.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { pushApi } from '@/src/api';

/**
 * Request notification permission, obtain the Expo push token, and
 * register it with the backend.  Safe to call multiple times — the
 * backend endpoint is idempotent.
 */
export async function tryRegisterPushToken(): Promise<void> {
  try {
    // Expo push tokens are only available on physical devices
    if (!Device.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? '';
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await pushApi.registerToken({
      token,
      platform: Platform.OS as 'android' | 'ios',
    });
  } catch (error) {
    console.error('Push registration failed:', error);
  }
}
