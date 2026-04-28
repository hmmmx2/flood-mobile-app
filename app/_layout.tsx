import { useEffect, useState } from 'react';
import { Platform, View, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { tokenStore, registerAuthFailureHandler } from '@/src/api/client';
import { useAuthStore } from '@/src/store/authStore';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,   // 1 minute
      retry: 2,
    },
  },
});

// Show notifications while app is in foreground (all roles)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootLayoutNav() {
  const { setUser } = useAuthStore();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('https://clients3.google.com/generate_204', {
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(id);
        setIsOnline(res.status === 204 || res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    void checkConnection();
    const interval = setInterval(() => { void checkConnection(); }, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Safety net: if no tokens exist (e.g. first launch), clear user state.
    // index.tsx handles the full session restore including profile fetch.
    tokenStore.get().then((tokens) => {
      if (!tokens) setUser(null);
    });

    // MOB-003: clear auth state when token refresh fails (prevents stuck sessions)
    registerAuthFailureHandler(() => {
      useAuthStore.getState().setUser(null);
      router.replace('/(auth)/login');
    });

    // Android requires a notification channel for alerts to appear on API 26+
    if (Platform.OS === 'android') {
      void Notifications.setNotificationChannelAsync('floodwatch-alerts', {
        name: 'FloodWatch Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1d4ed8',
        sound: 'default',
      });
    }
  }, []);

  // MOB-005: handle push notification taps to navigate to the relevant screen
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      if (data?.type === 'post' && data?.postId) {
        router.push(`/(app)/post/${data.postId as string}`);
      } else if (data?.type === 'alert') {
        router.push('/(app)/alerts');
      } else if (data?.type === 'blog' && data?.blogId) {
        router.push(`/(app)/blog/${data.blogId as string}`);
      } else {
        router.push('/(app)/');
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <>
      {!isOnline && (
        <View style={{ backgroundColor: '#f59e0b', padding: 8, alignItems: 'center', zIndex: 999 }}>
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>No internet connection</Text>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Explicit declarations prevent any accidental header flash */}
        <Stack.Screen name="index"  options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)"  options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
