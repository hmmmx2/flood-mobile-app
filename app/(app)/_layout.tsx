/**
 * Unified app tab layout — role-based navigation
 *
 * customer (end user) → community tabs (blue, light)
 *   Feed · Community · Blog · Alerts · Sensors · Profile
 *
 * admin               → CRM tabs (blue, dark)
 *   Dashboard · Sensors · Map · Alerts · Broadcasts · More
 *
 * All screens are declared here; irrelevant tabs are hidden via href: null.
 * The tab bar theme switches dynamically based on role.
 */

import { useEffect, useState } from 'react';
import { Platform, View, Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useQuery } from '@tanstack/react-query';
import { tokenStore } from '@/src/api/client';
import { useAuthStore } from '@/src/store/authStore';
import { tryRegisterPushToken } from '@/src/utils/push';
import { sensorsApi, crmFeedApi } from '@/src/api';

// Community brand colour
const COMMUNITY_TINT = '#1d4ed8';
// Admin brand colour
const ADMIN_TINT = '#1d4ed8';

export default function AppLayout() {
  const user     = useAuthStore((s) => s.user);
  const isAdmin  = user?.role === 'admin';
  const isLoading = useAuthStore((s) => s.isLoading);
  const [isOffline, setIsOffline] = useState(false);

  // Guard: redirect to login if tokens disappear (logout or server invalidation)
  useEffect(() => {
    tokenStore.get().then((tokens) => {
      if (!tokens) router.replace('/(auth)/login');
    });
  }, []);

  // Guard: if user becomes null after load (e.g. explicit logout elsewhere),
  // ensure we navigate away from the protected area
  useEffect(() => {
    if (!isLoading && user === null) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, user]);

  // Register push token once per authenticated user session.
  // This covers fresh login/register flows (index.tsx covers session restore).
  useEffect(() => {
    if (user?.id) void tryRegisterPushToken();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // FEAT-001: Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  // FEAT-002: Unread alert badge
  const { data: sensors } = useQuery({
    queryKey: ['community-sensors-badge'],
    queryFn: sensorsApi.getAll,
    enabled: !isAdmin && !!user,
    staleTime: 60_000,
  });
  const { data: crmFeedPage } = useQuery({
    queryKey: ['crm-alerts-badge'],
    queryFn: () => crmFeedApi.getPage(undefined),
    enabled: isAdmin && !!user,
    staleTime: 60_000,
  });

  const alertBadgeCount = isAdmin
    ? (crmFeedPage?.items ?? []).filter((a) => a.severity === 'critical').length
    : (sensors ?? []).filter((s) => s.currentLevel >= 2).length;
  const alertBadge = alertBadgeCount > 0
    ? (alertBadgeCount > 99 ? '99+' : alertBadgeCount)
    : undefined;

  // ── Dynamic tab bar theme ──────────────────────────────────────────────────
  const activeTint   = isAdmin ? ADMIN_TINT   : COMMUNITY_TINT;
  const tabBarBg     = isAdmin ? '#0d1f3d'    : '#FFFFFF';
  const tabBarBorder = isAdmin ? '#1e3a5f'    : '#DDE3ED';

  return (
    <View style={{ flex: 1 }}>
      {isOffline && (
        <View style={{ backgroundColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 16, gap: 6 }}>
          <Ionicons name="wifi-outline" size={14} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>No internet connection · Updates paused</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopWidth: 1,
          borderTopColor: tabBarBorder,
          height: Platform.OS === 'ios' ? 82 : 62,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
      }}
    >
      {/* ── index — Feed (customer) OR Dashboard (admin) ───────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: isAdmin ? 'Dashboard' : 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isAdmin ? 'speedometer-outline' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* ── community — Posts & Groups (customer only) ─────────────────── */}
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── blog — Blog reading (customer only) ───────────────────────── */}
      <Tabs.Screen
        name="blog"
        options={{
          title: 'Blog',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── alerts — Community alerts (customer) OR CRM alerts (admin) ── */}
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarBadge: alertBadge,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── sensors — Community sensors (customer) OR CRM sensors (admin) */}
      <Tabs.Screen
        name="sensors"
        options={{
          title: 'Sensors',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── profile — User profile (customer only) ────────────────────── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── map — Sensor map (admin only) ─────────────────────────────── */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── broadcasts — Emergency broadcasts (admin only) ─────────────── */}
      <Tabs.Screen
        name="broadcasts"
        options={{
          title: 'Broadcasts',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── more — Admin account hub & settings (admin only) ──────────── */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Hidden modal / detail screens (all roles) ─────────────────── */}
      <Tabs.Screen name="post/[id]" options={{ href: null }} />
      <Tabs.Screen name="g/[slug]"  options={{ href: null }} />
      <Tabs.Screen name="blog/[id]" options={{ href: null }} />
      <Tabs.Screen name="safety"    options={{ href: null }} />

      {/* ── Hidden admin feature screens (accessible via deep link) ───── */}
      <Tabs.Screen name="analytics"        options={{ href: null }} />
      <Tabs.Screen name="reports"          options={{ href: null }} />
      <Tabs.Screen name="users"            options={{ href: null }} />
      <Tabs.Screen name="admin-blogs"      options={{ href: null }} />
      <Tabs.Screen name="admin-community"  options={{ href: null }} />

    </Tabs>
    </View>
    </View>
  );
}
