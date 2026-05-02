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

// ── Severity config ───────────────────────────────────────────────────────────
const KK: Region = { latitude: 5.9749, longitude: 116.0724, latitudeDelta: 0.4, longitudeDelta: 0.4 };

type SeverityCfg = { label: string; bg: string; fg: string; stripe: string; icon: keyof typeof Ionicons.glyphMap; markerColor: string; dot: string };
const SEV: Record<AlertSeverity, SeverityCfg> = {
  normal:   { label: 'Normal',   bg: '#F0FDF4', fg: '#15803D', stripe: '#22C55E', icon: 'checkmark-circle', markerColor: '#22C55E', dot: '#22C55E' },
  watch:    { label: 'Watch',    bg: '#EFF6FF', fg: '#1D4ED8', stripe: '#3B82F6', icon: 'eye',              markerColor: '#3B82F6', dot: '#3B82F6' },
  warning:  { label: 'Warning',  bg: '#FFF7ED', fg: '#C2410C', stripe: '#F97316', icon: 'warning',          markerColor: '#F97316', dot: '#F97316' },
  critical: { label: 'Critical', bg: '#FEF2F2', fg: '#B91C1C', stripe: '#EF4444', icon: 'alert-circle',     markerColor: '#EF4444', dot: '#EF4444' },
};
type FilterKey = 'all' | AlertSeverity;

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN ALERTS SCREEN (CRM backend, dark theme)
// ═════════════════════════════════════════════════════════════════════════════

type AdminSeverityFilter = 'all' | 'critical' | 'warning' | 'watch' | 'normal';
const ADMIN_FILTERS: { key: AdminSeverityFilter; label: string; color: string }[] = [
  { key: 'all',      label: 'All',     color: ac.primary },
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

  const allItems: FeedItemDto[] = data?.pages.flatMap((p) => p.items ?? []) ?? [];
  const filtered      = useMemo(() => severityFilter === 'all' ? allItems : allItems.filter((a) => a.severity === severityFilter), [allItems, severityFilter]);
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
  chip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: asp.sm + 2, paddingVertical: asp.xs + 1, borderRadius: ar.full, borderWidth: 1, borderColor: ac.border, backgroundColor: ac.card, gap: 5 },
  chipDot:  { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: '600', color: ac.textSecondary },
});

// ═════════════════════════════════════════════════════════════════════════════
// COMMUNITY ALERTS SCREEN (community backend, light theme) — full redesign
// ═════════════════════════════════════════════════════════════════════════════

const BRAND  = '#1d4ed8';
const BG     = '#eef2ff';
const CARD   = '#FFFFFF';
const BORDER = '#e2e8f0';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';

// ── Severity badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const cfg = SEV[severity];
  return (
    <View style={[badge.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.fg} />
      <Text style={[badge.text, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
});

// ── Alert list card ───────────────────────────────────────────────────────────

const AlertListItem = React.memo(function AlertListItem({ item }: { item: FeedItemDto }) {
  const cfg = SEV[item.severity];
  return (
    <View style={[communityStyles.alertCard, { borderLeftColor: cfg.stripe }]}>
      {/* Top row: badge + time */}
      <View style={communityStyles.alertTopRow}>
        <SeverityBadge severity={item.severity} />
        <Text style={communityStyles.alertTime}>
          {new Date(item.createdAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {/* Title */}
      <Text style={communityStyles.alertTitle} numberOfLines={2}>{item.title}</Text>

      {/* Summary */}
      {!!item.summary && (
        <Text style={communityStyles.alertSummary} numberOfLines={2}>{item.summary}</Text>
      )}

      {/* Footer: sensor + water level */}
      <View style={communityStyles.alertFooter}>
        <View style={communityStyles.alertSensorRow}>
          <Ionicons name="radio-outline" size={12} color={MUTED} />
          <Text style={communityStyles.alertSensorText} numberOfLines={1}>{item.sensorName}</Text>
        </View>
        <View style={[communityStyles.alertWaterChip, { backgroundColor: cfg.bg }]}>
          <Ionicons name="water-outline" size={12} color={cfg.fg} />
          <Text style={[communityStyles.alertWaterText, { color: cfg.fg }]}>
            {item.waterLevelMeters?.toFixed(1) ?? '—'} m
          </Text>
        </View>
      </View>
    </View>
  );
});

// ── Filter chip row ───────────────────────────────────────────────────────────

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning',  label: 'Warning' },
  { key: 'watch',    label: 'Watch' },
  { key: 'normal',   label: 'Normal' },
];

function CommunityAlertsScreen() {
  const { highlight, focusLat, focusLng } = useLocalSearchParams<{
    highlight?: string; focusLat?: string; focusLng?: string; focusNodeId?: string;
  }>();
  const [activeTab, setActiveTab]   = useState<'list' | 'map'>('list');
  const [filterKey, setFilterKey]   = useState<FilterKey>('all');
  const mapRef = useRef<MapView>(null);

  const { data, isLoading, isError, isFetchingNextPage, fetchNextPage, hasNextPage, refetch, isRefetching } =
    useInfiniteQuery<CursorPageDto<FeedItemDto>, Error, InfiniteData<CursorPageDto<FeedItemDto>>, string[], string | undefined>({
      queryKey: ['community-alerts-feed'],
      queryFn: ({ pageParam }) => feedApi.getPage(pageParam),
      getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
      initialPageParam: undefined,
    });

  const { data: sensors } = useQuery({ queryKey: ['community-sensors'], queryFn: sensorsApi.getAll });

  const allItems: FeedItemDto[] = data?.pages.flatMap((p) => p.items ?? []) ?? [];
  const filtered      = useMemo(() => filterKey === 'all' ? allItems : allItems.filter((a) => a.severity === filterKey), [allItems, filterKey]);
  const criticalCount = allItems.filter((a) => a.severity === 'critical').length;

  useEffect(() => { if (highlight) setFilterKey('critical'); }, [highlight]);

  useEffect(() => {
    if (focusLat && focusLng && mapRef.current) {
      setActiveTab('map');
      mapRef.current.animateToRegion({
        latitude:  parseFloat(focusLat),
        longitude: parseFloat(focusLng),
        latitudeDelta: 0.01, longitudeDelta: 0.01,
      }, 500);
    }
  }, [focusLat, focusLng]);

  return (
    <SafeAreaView style={communityStyles.screen} edges={['top']}>

      {/* ── Header ── */}
      <View style={communityStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={communityStyles.headerTitle}>Alerts</Text>
          <Text style={communityStyles.headerSub}>
            {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
            {criticalCount > 0 && (
              <Text style={{ color: SEV.critical.fg }}>  ·  {criticalCount} critical</Text>
            )}
          </Text>
        </View>
        {/* Tab toggle */}
        <View style={communityStyles.tabToggle}>
          {(['list', 'map'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[communityStyles.toggleBtn, activeTab === t && communityStyles.toggleBtnActive]}
              onPress={() => setActiveTab(t)}
              accessibilityRole="button"
              accessibilityLabel={t === 'list' ? 'List view' : 'Map view'}
              accessibilityState={{ selected: activeTab === t }}
            >
              <Ionicons
                name={t === 'list' ? 'list-outline' : 'map-outline'}
                size={16}
                color={activeTab === t ? '#fff' : MUTED}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Filter chips ── */}
      <View style={communityStyles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={communityStyles.filterRow}>
          {FILTERS.map((f) => {
            const active = filterKey === f.key;
            const cfg    = f.key !== 'all' ? SEV[f.key as AlertSeverity] : null;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  communityStyles.filterChip,
                  active && cfg  && { backgroundColor: cfg.stripe,  borderColor: cfg.stripe },
                  active && !cfg && { backgroundColor: BRAND,       borderColor: BRAND },
                ]}
                onPress={() => setFilterKey(f.key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${f.label}`}
                accessibilityState={{ selected: active }}
              >
                {active && cfg && <Ionicons name={cfg.icon} size={12} color="#fff" />}
                <Text style={[communityStyles.filterChipText, active && communityStyles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {activeTab === 'list' ? (
        isLoading ? (
          <View style={communityStyles.centred}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={communityStyles.loadingText}>Loading alerts…</Text>
          </View>
        ) : isError ? (
          <View style={communityStyles.centred}>
            <View style={communityStyles.errIconWrap}>
              <Ionicons name="cloud-offline-outline" size={36} color={MUTED} />
            </View>
            <Text style={communityStyles.errTitle}>Failed to load alerts</Text>
            <Text style={communityStyles.errDesc}>Check your connection and try again.</Text>
            <TouchableOpacity style={communityStyles.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={communityStyles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <AlertListItem item={item} />}
            contentContainerStyle={communityStyles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View style={communityStyles.centred}>
                <View style={[communityStyles.errIconWrap, { backgroundColor: SEV.normal.bg }]}>
                  <Ionicons name="checkmark-circle" size={36} color={SEV.normal.fg} />
                </View>
                <Text style={communityStyles.errTitle}>All clear!</Text>
                <Text style={communityStyles.errDesc}>
                  {filterKey !== 'all' ? 'No alerts match this filter.' : 'No active alerts — the system is operating normally.'}
                </Text>
              </View>
            }
            onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isFetchingNextPage
                ? <ActivityIndicator color={BRAND} style={{ padding: 16 }} />
                : null
            }
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} colors={[BRAND]} />
            }
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            windowSize={5}
          />
        )
      ) : (
        /* ── Map tab ── */
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE}
            initialRegion={KK}
            showsUserLocation
            showsMyLocationButton
          >
            {(sensors ?? []).map((node) => {
              const level = node.currentLevel === 3 ? 'critical' : node.currentLevel === 2 ? 'warning' : node.currentLevel === 1 ? 'watch' : 'normal';
              return (
                <Marker
                  key={node.id}
                  coordinate={{ latitude: node.latitude, longitude: node.longitude }}
                  pinColor={SEV[level].markerColor}
                >
                  <Callout tooltip={false}>
                    <View style={communityStyles.callout}>
                      <Text style={communityStyles.calloutId}>{node.nodeId}</Text>
                      <Text style={communityStyles.calloutName}>{node.name}</Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
            {filtered.map((alert) => {
              const sensor = (sensors ?? []).find((s) => s.nodeId === alert.sensorId || s.id === alert.sensorId);
              if (!sensor) return null;
              return (
                <Marker
                  key={alert.id}
                  coordinate={{ latitude: sensor.latitude, longitude: sensor.longitude }}
                  pinColor={SEV[alert.severity].markerColor}
                >
                  <Callout tooltip={false}>
                    <View style={communityStyles.callout}>
                      <Text style={communityStyles.calloutId}>{alert.title}</Text>
                      <Text style={communityStyles.calloutName}>
                        {alert.sensorName} · {alert.waterLevelMeters?.toFixed(1) ?? '—'} m
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>

          {/* Map legend overlay */}
          <View style={communityStyles.mapLegend}>
            {(['normal', 'watch', 'warning', 'critical'] as AlertSeverity[]).map((sev) => (
              <View key={sev} style={communityStyles.legendItem}>
                <View style={[communityStyles.legendDot, { backgroundColor: SEV[sev].markerColor }]} />
                <Text style={communityStyles.legendText}>{SEV[sev].label}</Text>
              </View>
            ))}
          </View>
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

// ── Community styles ──────────────────────────────────────────────────────────

const communityStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  headerSub:   { fontSize: 12, color: MUTED, marginTop: 2 },
  tabToggle:   { flexDirection: 'row', gap: 4 },
  toggleBtn: {
    width: 36, height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: { backgroundColor: BRAND, borderColor: BRAND },

  // Filters
  filterWrapper: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  filterRow:     { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  filterChipText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  // List
  listContent: { padding: 14, paddingBottom: 32 },

  // Alert card
  alertCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 5,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  alertTopRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertTime:      { fontSize: 11, color: MUTED, fontWeight: '500' },
  alertTitle:     { fontSize: 15, fontWeight: '700', color: TEXT, lineHeight: 21 },
  alertSummary:   { fontSize: 13, color: MUTED, lineHeight: 19 },
  alertFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  alertSensorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  alertSensorText:{ fontSize: 12, color: MUTED, flex: 1 },
  alertWaterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 14 },
  alertWaterText: { fontSize: 12, fontWeight: '700' },

  // Empty / error / loading states
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loadingText:   { fontSize: 14, color: MUTED, marginTop: 4 },
  errIconWrap:   { width: 72, height: 72, borderRadius: 36, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  errTitle:      { fontSize: 17, fontWeight: '700', color: TEXT },
  errDesc:       { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
  retryBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: BRAND, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 11 },
  retryBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Map callout
  callout:     { padding: 10, minWidth: 130 },
  calloutId:   { fontWeight: '700', fontSize: 13, color: TEXT },
  calloutName: { fontSize: 12, color: MUTED, marginTop: 2 },

  // Map legend
  mapLegend: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 16,
    right: 12,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: '600', color: TEXT },
});
