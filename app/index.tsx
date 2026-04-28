/**
 * Root entry — restores persisted session then routes:
 *   authenticated  → /(app)  (role-based tabs take over from there)
 *   unauthenticated → /(auth)/login
 *
 * After session restore, the auth store user.role determines which
 * tab set is shown in /(app)/_layout.tsx.
 *
 * Push notification token registration happens here (non-blocking)
 * so it fires for both session restores and first logins.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { tokenStore } from '@/src/api/client';
import { useAuthStore } from '@/src/store/authStore';
import { profileApi } from '@/src/api';
import { tryRegisterPushToken } from '@/src/utils/push';
import type { AuthUser } from '@/src/api/types';

// Neutral spinner colour — role is unknown at this point
const BRAND = '#1d4ed8';

export default function Index() {
  const { setUser } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      try {
        const tokens = await tokenStore.get();
        if (tokens?.accessToken) {
          try {
            // Profile endpoint lives on community backend for all roles
            const profile = await profileApi.get();
            // UserProfileDto and AuthUser share the same shape — cast is safe
            setUser(profile as AuthUser);
            setAuthed(true);
            // Register push token after confirmed session (non-blocking)
            void tryRegisterPushToken();
          } catch {
            // Token expired or invalid — clear and fall through to login
            await tokenStore.clear();
            setAuthed(false);
          }
        } else {
          setAuthed(false);
        }
      } finally {
        setReady(true);
      }
    }
    void restoreSession();
  }, [setUser]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  // Both roles land in /(app); the layout there handles tab differentiation
  return <Redirect href={authed ? '/(app)' : '/(auth)/login'} />;
}
