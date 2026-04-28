/**
 * Map screen — admin sensor map (CRM backend, dark theme)
 * Mirrors flood-website-crm /map
 */
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, Platform,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminSensorsApi } from '@/src/api';
import { colors, spacing, typography, radius, shadow } from '@/src/theme/admin';
import type { SensorNodeDto, FloodLevel } from '@/src/api/types';

const PINNED_KEY = 'crm_pinned_nodes';

const KK: Region = { latitude: 5.9749, longitude: 116.0724, latitudeDelta: 0.4, longitudeDelta: 0.4 };

const LEVEL_COLOR: Record<number, string> = {
  0: '#22C55E',
  1: '#3B82F6',
  2: '#F59E0B',
  3: '#EF4444',
};
const DEAD_COLOR = '#9CA3AF';

function markerColor(node: SensorNodeDto): string {
  if (node.isDead) return DEAD_COLOR;
  return LEVEL_COLOR[node.currentLevel] ?? LEVEL_COLOR[0];
}

const LEVEL_LABEL: Record<number, string> = { 0: 'Normal', 1: 'Watch', 2: 'Warning', 3: 'Critical' };
const WATER_LEVEL_M: Record<number, string> = { 0: '0.0 m', 1: '1.0 m', 2: '2.5 m', 3: '4.0 m' };

const LEGEND = [
  { color: LEVEL_COLOR[0], label: 'Normal' },
  { color: LEVEL_COLOR[1], label: 'Watch' },
  { color: LEVEL_COLOR[2], label: 'Warning' },
  { color: LEVEL_COLOR[3], label: 'Critical' },
  { color: DEAD_COLOR, label: 'Offline' },
];

type FilterLevel = 'all' | 0 | 1 | 2 | 3 | 'dead' | 'pinned';
const FILTER_OPTS: { key: FilterLevel; label: string; color: string }[] = [
  { key: 'all',    label: 'All',      color: colors.primary },
  { key: 0,        label: 'Normal',   color: LEVEL_COLOR[0] },
  { key: 1,        label: 'Watch',    color: LEVEL_COLOR[1] },
  { key: 2,        label: 'Warning',  color: LEVEL_COLOR[2] },
  { key: 3,        label: 'Critical', color: LEVEL_COLOR[3] },
  { key: 'dead',   label: 'Offline',  color: DEAD_COLOR },
  { key: 'pinned', label: '★ Pinned', color: '#F59E0B' },
];

function NodeSheet({ node, isPinned, onTogglePin, onClose }: { node: SensorNodeDto; isPinned: boolean; onTogglePin: (node: SensorNodeDto) => void; onClose: () => void }) {
  const lvlColor = markerColor(node);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheet.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={sheet.container}>
        <View style={[sheet.indicator, { backgroundColor: lvlColor }]} />
        <View style={sheet.header}>
          <View>
            <Text style={sheet.nodeId}>{node.nodeId}</Text>
            <Text style={sheet.name}>{node.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => onTogglePin(node)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={isPinned ? 'star' : 'star-outline'} size={24} color={isPinned ? '#F59E0B' : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={26} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={sheet.row}>
          <View style={[sheet.badge, { backgroundColor: lvlColor + '22' }]}>
            <View style={[sheet.dot, { backgroundColor: lvlColor }]} />
            <Text style={[sheet.badgeText, { color: lvlColor }]}>{node.isDead ? 'Offline' : LEVEL_LABEL[node.currentLevel]}</Text>
          </View>
          <Text style={sheet.waterLevel}>{node.isDead ? '—' : WATER_LEVEL_M[node.currentLevel]}</Text>
        </View>
        <View style={sheet.grid}>
          {[
            { label: 'Area',      value: node.area },
            { label: 'Location',  value: node.location || '—' },
            { label: 'State',     value: node.state },
            { label: 'Latitude',  value: node.latitude.toFixed(5) },
            { label: 'Longitude', value: node.longitude.toFixed(5) },
            { label: 'Last seen', value: node.lastUpdated ? new Date(node.lastUpdated).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : '—' },
          ].map(({ label, value }) => (
            <View key={label} style={sheet.gridItem}>
              <Text style={sheet.gridLabel}>{label}</Text>
              <Text style={sheet.gridValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

export default function MapScreen() {
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [selected, setSelected] = useState<SensorNodeDto | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    AsyncStorage.getItem(PINNED_KEY).then((raw) => {
      if (raw) { try { setPinnedIds(new Set<string>(JSON.parse(raw) as string[])); } catch { /* ok */ } }
    });
  }, []);

  const togglePin = useCallback((node: SensorNodeDto) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.nodeId)) { next.delete(node.nodeId); } else { next.add(node.nodeId); }
      AsyncStorage.setItem(PINNED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin-sensors'], queryFn: adminSensorsApi.getAll, refetchInterval: 60_000 });
  const nodes = data ?? [];

  const filtered = useMemo(() => {
    if (filter === 'all')    return nodes;
    if (filter === 'dead')   return nodes.filter((n) => n.isDead);
    if (filter === 'pinned') return nodes.filter((n) => pinnedIds.has(n.nodeId));
    return nodes.filter((n) => !n.isDead && n.currentLevel === filter);
  }, [nodes, filter, pinnedIds]);

  const counts = useMemo(() => ({
    total:    nodes.length,
    critical: nodes.filter((n) => !n.isDead && n.currentLevel === 3).length,
    warning:  nodes.filter((n) => !n.isDead && n.currentLevel === 2).length,
    offline:  nodes.filter((n) => n.isDead).length,
    pinned:   pinnedIds.size,
  }), [nodes, pinnedIds]);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Sensor Map</Text>
            <Text style={styles.headerSub}>
              {counts.total} nodes · {counts.critical} critical · {counts.warning} warning{counts.pinned > 0 ? ` · ${counts.pinned} ★` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTER_OPTS.map((opt) => {
            const active = filter === opt.key;
            return (
              <TouchableOpacity
                key={String(opt.key)}
                style={[styles.chip, active && { backgroundColor: opt.color, borderColor: opt.color }]}
                onPress={() => setFilter(opt.key)}
                activeOpacity={0.75}
              >
                {opt.key !== 'all' && <View style={[styles.chipDot, { backgroundColor: active ? '#fff' : opt.color }]} />}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading sensors…</Text>
        </View>
      ) : (
        <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={KK} showsUserLocation showsMyLocationButton>
          {filtered.map((node) => (
            <Marker
              key={node.id}
              coordinate={{ latitude: node.latitude, longitude: node.longitude }}
              pinColor={pinnedIds.has(node.nodeId) ? '#F59E0B' : markerColor(node)}
              zIndex={pinnedIds.has(node.nodeId) ? 999 : 0}
              onPress={() => setSelected(node)}
            >
              <Callout tooltip={false}>
                <View style={styles.callout}>
                  <Text style={styles.calloutId}>{node.nodeId}</Text>
                  <Text style={styles.calloutLevel}>{node.isDead ? 'Offline' : LEVEL_LABEL[node.currentLevel]}{!node.isDead && ` · ${WATER_LEVEL_M[node.currentLevel]}`}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {isError && !isLoading && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Failed to load sensors</Text>
          <TouchableOpacity onPress={() => refetch()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.errorBannerRetry}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && (
        <View style={styles.legend}>
          {LEGEND.map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      )}

      {selected && (
        <NodeSheet node={selected} isPinned={pinnedIds.has(selected.nodeId)} onTogglePin={togglePin} onClose={() => setSelected(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerWrap: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  refreshBtn: { padding: spacing.xs },
  filterRow: { paddingHorizontal: spacing.base, paddingBottom: spacing.sm, gap: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { ...typography.badge, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { ...typography.body, color: colors.textMuted },
  callout: { padding: 8, minWidth: 120 },
  calloutId: { fontWeight: '700', fontSize: 13, color: '#1A1A2E' },
  calloutLevel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  errorBanner: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.status.critical + 'EE', paddingVertical: 10, paddingHorizontal: spacing.base },
  errorBannerText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  errorBannerRetry: { color: '#fff', fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' },
  legend: { position: 'absolute', bottom: Platform.OS === 'ios' ? 32 : 16, right: 12, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radius.md, padding: spacing.sm, gap: 4, borderWidth: 1, borderColor: colors.border, ...shadow.light },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
});

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  container: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, overflow: 'hidden' },
  indicator: { height: 4, marginHorizontal: '40%', marginTop: 10, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  nodeId: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  name: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, marginBottom: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  waterLevel: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.base, gap: 12 },
  gridItem: { width: '45%' },
  gridLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  gridValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
});
