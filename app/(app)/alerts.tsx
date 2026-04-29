/**
 * Unified Alerts screen — role-based content:
 *   customer → Community alerts + map (community feed, light theme)
 *   admin    → CRM alerts feed (CRM backend, dark theme)
 */

// ── Shared imports ────────────────────────────────────────────────────────────
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { feedApi, sensorsApi, crmFeedApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import type { FeedItemDto, CursorPageDto, AlertSeverity, SensorNodeDto } from '@/src/api/types';

// ── Admin components ──────────────────────────────────────────────────────────
import ScreenHeader from '@/src/components/ui/ScreenHeader';
import AlertCard from '@/src/components/ui/AlertCard';
import EmptyState from '@/src/components/ui/EmptyState';
import { colors as ac, spacing as asp, typography as aty, radius as ar } from '@/src/theme/admin';

// ── Community colours ─────────────────────────────────────────────────────────
const BRAND  = '#1d4ed8';
const BG     = '#eef2ff';
const CARD   = '#FFFFFF';
const BORDER = '#e2e8f0';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';

const KK: Region = { latitude: 5.9749, longitude: 116.0724, latitudeDelta: 0.4, longitudeDelta: 0.4 };

type SeverityCfg = { label: string; bg: string; fg: string; stripe: string; icon: string; markerColor: string };
const SEV: Record<AlertSeverity, SeverityCfg> = {
  normal:   { label: 'Normal',   bg: '#E8F5E9', fg: '#2E7D32', stripe: '#4CAF50', icon: 'checkmark-circle', markerColor: '#22C55E' },
  watch:    { label: 'Watch',    bg: '#FFF8E1', fg: '#F57F17', stripe: '#FFC107', icon: 'eye',              markerColor: '#F59E0B' },
  warning:  { label: 'Warning',  bg: '#FFF3E0', fg: '#E65100', stripe: '#FF9800', icon: 'warning',          markerColor: '#F97316' },
  critical: { label: 'Critical', bg: '#FFEBEE', fg: '#B71C1C', stripe: '#F44336', icon: 'alert-circle',     markerColor: '#EF4444' },
};
type FilterKey = 'all' | AlertSeverity;

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN ALERTS SCREEN (CRM backend, dark theme)
// ═════════════════════════════════════════════════════════════════════════════

type AdminSeverityFilter = 'all' | 'critical' | 'warning' | 'watch' | 'normal';
const ADMIN_FILTERS: { key: AdminSeverityFilter; label: string; color: string }[] = [
  { key: 'all',      label: 'All',     color: ac.textSecondary },
  { key: 'critical', label: 'Danger',  color: ac.status.critical },
  { key: 'warning',  label: 'Warning', color: ac.status.warning },
  { key: 'watch',    label: 'Alert',   color: ac.status.watch },
  { key: 'normal',   label: 'Normal',  color: ac.status.normal },
];

function AdminAlertsScreen() {
  const [severityFilter, setSeverityFilter] = useState<AdminSeverityFilter>('all');

  const { data, isLoading, isError, isFetchingNextPage, fetchNextPage, hasNextPage, refetch, isRefetching } =
    useInfiniteQuery<CursorPageDto<FeedItemDto>, Error, InfiniteData<CursorPageDto<FeedItemDto>>, string[], string | undefined>({
      queryKey: ['crm-alerts-feed'],
      queryFn: ({ pageParam }) => crmFeedApi.getPage(pageParam),
      getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
      initialPageParam: undefined,
      retry: 2,
    });

  const allItems: FeedItemDto[] = data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = useMemo(() => severityFilter === 'all' ? allItems : allItems.filter((a) => a.severity === severityFilter), [allItems, severityFilter]);
  const criticalCount = allItems.filter((a) => a.severity === 'critical').length;

  return (
    <View style={{ flex: 1, backgroundColor: ac.background }}>
      <ScreenHeader
        title="Alerts"
        subtitle="Real-time flood events"
        rightAction={criticalCount > 0 ? { icon: 'flame', onPress: () => setSeverityFilter('critical'), badge: criticalCount } : undefined}
      />

      {/* Filter chips */}
      <FlatList
        horizontal
        data={ADMIN_FILTERS}
        keyExtractor={(f) => f.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: asp.base, paddingVertical: asp.sm, gap: asp.sm }}
        renderItem={({ item }) => {
          const active = severityFilter === item.key;
          return (
            <TouchableOpacity
              style={[adminAlertStyles.chip, active && { backgroundColor: item.color + '20', borderColor: item.color }]}
              onPress={() => setSeverityFilter(item.key)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${item.label}`}
              accessibilityState={{ selected: active }}
            >
              {active && <View style={[adminAlertStyles.chipDot, { backgroundColor: item.color }]} />}
              <Text style={[adminAlertStyles.chipText, active && { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Summary */}
      {!isLoading && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: asp.base, marginBottom: asp.xs }}>
          <Text style={{ ...aty.caption }}>{filtered.length} alert{filtered.length !== 1 ? 's' : ''}</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} accessibilityRole="button" accessibilityLabel="Refresh alerts">
            <Ionicons name="refresh-outline" size={14} color={ac.primary} />
            <Text style={{ fontSize: 12, color: ac.primary, fontWeight: '600' }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={ac.primary} style={{ marginTop: 60 }} />
      ) : isError ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load alerts" message="Check your connection and pull down to retry." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AlertCard alert={item} />}
          contentContainerStyle={{ padding: asp.base, paddingBottom: asp.xxl }}
          ItemSeparatorComponent={() => <View style={{ height: asp.sm }} />}
          ListEmptyComponent={<EmptyState icon="alert-circle-outline" title="No alerts" message={severityFilter !== 'all' ? 'No alerts match this filter.' : 'The system is operating normally.'} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={ac.primary} style={{ padding: 16 }} /> : null}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={ac.primary} />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          windowSize={5}
        />
      )}
    </View>
  );
}

const adminAlertStyles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: asp.sm + 2, paddingVertical: asp.xs + 1, borderRadius: ar.full, borderWidth: 1, borderColor: ac.border, backgroundColor: ac.card, gap: 5 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: '600', color: ac.textSecondary },
});

// ═════════════════════════════════════════════════════════════════════════════
// COMMUNITY ALERTS SCREEN (community backend, light theme)
// ═════════════════════════════════════════════════════════════════════════════

function AlertBadge({ severity }: { severity: AlertSeverity }) {
  const cfg = SEV[severity];
  return (
    <View style={[communityStyles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={10} color={cfg.fg} />
      <Text style={[communityStyles.badgeText, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

const AlertListItem = React.memo(function AlertListItem({ item }: { item: FeedItemDto }) {
  const cfg = SEV[item.severity];
  return (
    <View style={[communityStyles.alertCard, { borderLeftColor: cfg.stripe }]}>
      <View style={communityStyles.alertRow}>
        <View style={communityStyles.alertLeft}>
          <View style={communityStyles.alertTitleRow}>
            <AlertBadge severity={item.severity} />
          </View>
          <Text style={communityStyles.alertTitle} numberOfLines={2}>{item.title}</Text>
          {item.summary ? <Text style={communityStyles.alertSummary} numberOfLines={2}>{item.summary}</Text> : null}
        </View>
      </View>
      <View style={communityStyles.alertMeta}>
        <Text style={communityStyles.alertMetaText}>{item.sensorName} · {item.waterLevelMeters?.toFixed(1) ?? '—'} m</Text>
        <Text style={communityStyles.alertMetaText}>{new Date(item.createdAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </View>
  );
});

function CommunityAlertsScreen() {
  const { highlight, focusLat, focusLng, focusNodeId } = useLocalSearchParams<{ highlight?: string; focusLat?: string; focusLng?: string; focusNodeId?: string }>();
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [filterKey, setFilterKey] = useState<FilterKey>('all');
  const mapRef = useRef<MapView>(null);

  const { data, isLoading, isError, isFetchingNextPage, fetchNextPage, hasNextPage, refetch, isRefetching } =
    useInfiniteQuery<CursorPageDto<FeedItemDto>, Error, InfiniteData<CursorPageDto<FeedItemDto>>, string[], string | undefined>({
      queryKey: ['community-alerts-feed'],
      queryFn: ({ pageParam }) => feedApi.getPage(pageParam),
      getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
      initialPageParam: undefined,
    });

  const { data: sensors } = useQuery({ queryKey: ['community-sensors'], queryFn: sensorsApi.getAll });

  const allItems: FeedItemDto[] = data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = useMemo(() => filterKey === 'all' ? allItems : allItems.filter((a) => a.severity === filterKey), [allItems, filterKey]);
  const criticalCount = allItems.filter((a) => a.severity === 'critical').length;

  useEffect(() => {
    if (highlight) setFilterKey('critical');
  }, [highlight]);

  useEffect(() => {
    if (focusLat && focusLng && mapRef.current) {
      setActiveTab('map');
      mapRef.current.animateToRegion({
        latitude: parseFloat(focusLat),
        longitude: parseFloat(focusLng),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  }, [focusLat, focusLng]);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'warning',  label: 'Warning' },
    { key: 'watch',    label: 'Watch' },
    { key: 'normal',   label: 'Normal' },
  ];

  return (
    <SafeAreaView style={communityStyles.screen} edges={['top']}>
      {/* Header */}
      <View style={communityStyles.header}>
        <View>
          <Text style={communityStyles.headerTitle}>Alerts</Text>
          <Text style={communityStyles.headerSub}>
            {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
            {criticalCount > 0 ? ` · ${criticalCount} critical` : ''}
          </Text>
        </View>
        <View style={communityStyles.tabToggle}>
          {(['list', 'map'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[communityStyles.toggleBtn, activeTab === t && communityStyles.toggleBtnActive]}
              onPress={() => setActiveTab(t)}
              accessibilityRole="button"
              accessibilityLabel={t === 'list' ? 'List view' : 'Map view'}
              accessibilityState={{ selected: activeTab === t }}
            >
              <Ionicons name={t === 'list' ? 'list-outline' : 'map-outline'} size={16} color={activeTab === t ? BRAND : MUTED} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={communityStyles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[communityStyles.filterChip, filterKey === f.key && communityStyles.filterChipActive]}
            onPress={() => setFilterKey(f.key)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${f.label}`}
            accessibilityState={{ selected: filterKey === f.key }}
          >
            <Text style={[communityStyles.filterChipText, filterKey === f.key && communityStyles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {activeTab === 'list' ? (
        isLoading ? (
          <ActivityIndicator size="large" color={BRAND} style={{ marginTop: 60 }} />
        ) : isError ? (
          <View style={communityStyles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={44} color={MUTED} />
            <Text style={communityStyles.emptyTitle}>Failed to load alerts</Text>
            <Text style={communityStyles.emptyDesc}>Please check your connection.</Text>
            <TouchableOpacity style={communityStyles.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
              <Text style={communityStyles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <AlertListItem item={item} />}
            contentContainerStyle={communityStyles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <View style={communityStyles.emptyState}>
                <Ionicons name="checkmark-circle" size={44} color="#22C55E" />
                <Text style={communityStyles.emptyTitle}>No alerts</Text>
                <Text style={communityStyles.emptyDesc}>The system is operating normally.</Text>
              </View>
            }
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.3}
            ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={BRAND} style={{ padding: 16 }} /> : null}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} colors={[BRAND]} />}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            windowSize={5}
          />
        )
      ) : (
        <View style={{ flex: 1 }}>
          <MapView ref={mapRef} style={{ flex: 1 }} provider={PROVIDER_GOOGLE} initialRegion={KK} showsUserLocation showsMyLocationButton>
            {(sensors ?? []).map((node) => (
              <Marker key={node.id} coordinate={{ latitude: node.latitude, longitude: node.longitude }} pinColor={SEV[node.currentLevel === 3 ? 'critical' : node.currentLevel === 2 ? 'warning' : node.currentLevel === 1 ? 'watch' : 'normal'].markerColor}>
                <Callout tooltip={false}>
                  <View style={{ padding: 8, minWidth: 120 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13 }}>{node.nodeId}</Text>
                    <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{node.name}</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
            {filtered.map((alert) => {
              const sensor = (sensors ?? []).find((s) => s.nodeId === alert.sensorId || s.id === alert.sensorId);
              if (!sensor) return null;
              return (
                <Marker key={alert.id} coordinate={{ latitude: sensor.latitude, longitude: sensor.longitude }} pinColor={SEV[alert.severity].markerColor}>
                  <Callout tooltip={false}>
                    <View style={{ padding: 8, minWidth: 140 }}>
                      <Text style={{ fontWeight: '700', fontSize: 13 }}>{alert.title}</Text>
                      <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{alert.sensorName} · {alert.waterLevelMeters?.toFixed(1) ?? '—'} m</Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>
        </View>
      )}
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export default function AlertsScreen() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'admin') return <AdminAlertsScreen />;
  return <CommunityAlertsScreen />;
}

// ── Community alerts styles ────────────────────────────────────────────────────
const communityStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 19, fontWeight: '800', color: TEXT },
  headerSub: { fontSize: 12, color: MUTED, marginTop: 2 },
  tabToggle: { flexDirection: 'row', gap: 4 },
  toggleBtn: { padding: 7, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  toggleBtnActive: { borderColor: BRAND, backgroundColor: BRAND + '10' },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  filterChipActive: { borderColor: BRAND, backgroundColor: BRAND + '12' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: MUTED },
  filterChipTextActive: { color: BRAND },
  listContent: { padding: 12, paddingBottom: 24 },
  alertCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, borderLeftWidth: 4, padding: 14, gap: 8 },
  alertRow: { flexDirection: 'row', gap: 10 },
  alertLeft: { flex: 1, gap: 5 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  alertTitle: { fontSize: 14, fontWeight: '700', color: TEXT, lineHeight: 20 },
  alertSummary: { fontSize: 12, color: MUTED, lineHeight: 18 },
  alertMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  alertMetaText: { fontSize: 11, color: MUTED },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyDesc: { fontSize: 13, color: MUTED, textAlign: 'center' },
  retryBtn: { marginTop: 4, backgroundColor: BRAND, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
