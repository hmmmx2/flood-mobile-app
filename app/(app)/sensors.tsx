/**
 * Unified Sensors screen — role-based:
 *   customer → community sensors with favourites (light theme)
 *   admin    → CRM sensor management with search/filter (dark theme)
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { sensorsApi, favouritesApi, adminSensorsApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import type { SensorNodeDto, FavouriteNodeDto } from '@/src/api/types';

// ── Admin components ──────────────────────────────────────────────────────────
import ScreenHeader from '@/src/components/ui/ScreenHeader';
import NodeCard from '@/src/components/ui/NodeCard';
import EmptyState from '@/src/components/ui/EmptyState';
import { colors as ac, spacing as asp, typography as aty, radius as ar } from '@/src/theme/admin';

// ── Community colours ─────────────────────────────────────────────────────────
const BRAND  = '#1d4ed8';
const BG     = '#eef2ff';
const CARD   = '#FFFFFF';
const BORDER = '#e2e8f0';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';

const LEVEL_COLOR: Record<number, string> = { 0: '#22C55E', 1: '#3B82F6', 2: '#F97316', 3: '#EF4444' };
const LEVEL_LABEL: Record<number, string> = { 0: 'Normal',  1: 'Watch',   2: 'Warning', 3: 'Critical' };
const WATER_M: Record<number, string>     = { 0: '0.0 m',   1: '1.0 m',  2: '2.5 m',  3: '4.0 m' };

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN SENSORS SCREEN (CRM backend, dark theme)
// ═════════════════════════════════════════════════════════════════════════════

type AdminFilterStatus = 'all' | 'normal' | 'alert' | 'warning' | 'critical' | 'offline';
const ADMIN_FILTER_OPTIONS: { key: AdminFilterStatus; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'normal',   label: 'Normal' },
  { key: 'alert',    label: 'Watch' },
  { key: 'warning',  label: 'Warning' },
  { key: 'critical', label: 'Critical' },
  { key: 'offline',  label: 'Offline' },
];

function filterAdminNode(node: SensorNodeDto, filter: AdminFilterStatus): boolean {
  const isDead = node.isDead ?? false;
  if (filter === 'all')      return true;
  if (filter === 'offline')  return isDead;
  if (filter === 'normal')   return !isDead && node.currentLevel === 0;
  if (filter === 'alert')    return !isDead && node.currentLevel === 1;
  if (filter === 'warning')  return !isDead && node.currentLevel === 2;
  if (filter === 'critical') return !isDead && node.currentLevel === 3;
  return true;
}

function AdminSensorsScreen() {
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const [search, setSearch] = useState(highlight ?? '');
  const [filter, setFilter] = useState<AdminFilterStatus>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-sensors'],
    queryFn: adminSensorsApi.getAll,
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const nodes = data ?? [];
    return nodes
      .filter((n) => filterAdminNode(n, filter))
      .filter((n) =>
        search.trim().length === 0 ||
        n.nodeId.toLowerCase().includes(search.toLowerCase()) ||
        n.area.toLowerCase().includes(search.toLowerCase()) ||
        n.state.toLowerCase().includes(search.toLowerCase())
      );
  }, [data, filter, search]);

  const total = data?.length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: ac.background }}>
      <ScreenHeader title="Sensors" subtitle={`${total} nodes registered`} rightAction={{ icon: 'refresh-outline', onPress: refetch }} />

      {/* Search bar */}
      <View style={{ paddingHorizontal: asp.base, paddingTop: asp.sm, paddingBottom: asp.xs }}>
        <View style={adminSensorStyles.searchBox}>
          <Ionicons name="search-outline" size={16} color={ac.textMuted} />
          <TextInput
            style={adminSensorStyles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search node ID, area, state…"
            placeholderTextColor={ac.textMuted}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={ac.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal
        data={ADMIN_FILTER_OPTIONS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: asp.base, paddingVertical: asp.sm, gap: asp.sm }}
        renderItem={({ item }) => {
          const active = filter === item.key;
          return (
            <TouchableOpacity
              style={[adminSensorStyles.filterChip, active && adminSensorStyles.filterChipActive]}
              onPress={() => setFilter(item.key)}
              activeOpacity={0.7}
            >
              <Text style={[adminSensorStyles.filterChipText, active && adminSensorStyles.filterChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {!isLoading && <Text style={{ ...aty.caption, paddingHorizontal: asp.base, marginBottom: asp.xs }}>{filtered.length} of {total} nodes</Text>}

      {isLoading ? (
        <ActivityIndicator color={ac.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NodeCard node={item} />}
          contentContainerStyle={{ padding: asp.base, paddingBottom: asp.xxl }}
          ItemSeparatorComponent={() => <View style={{ height: asp.sm }} />}
          ListEmptyComponent={<EmptyState icon="radio-outline" title="No nodes found" message={search || filter !== 'all' ? 'Try clearing your search or filter.' : 'No sensor nodes are registered yet.'} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={ac.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const adminSensorStyles = StyleSheet.create({
  searchBox:            { flexDirection: 'row', alignItems: 'center', backgroundColor: ac.card, borderRadius: ar.md, borderWidth: 1, borderColor: ac.border, paddingHorizontal: asp.sm, paddingVertical: asp.sm, gap: asp.sm },
  searchInput:          { flex: 1, ...aty.body, padding: 0 },
  filterChip:           { paddingHorizontal: asp.sm + 2, paddingVertical: asp.xs + 1, borderRadius: ar.full, borderWidth: 1, borderColor: ac.border, backgroundColor: ac.card },
  filterChipActive:     { backgroundColor: ac.primary, borderColor: ac.primary },
  filterChipText:       { ...aty.badge, color: ac.textSecondary },
  filterChipTextActive: { color: '#fff' },
});

// ═════════════════════════════════════════════════════════════════════════════
// COMMUNITY SENSORS SCREEN (community backend, light theme)
// ═════════════════════════════════════════════════════════════════════════════

type FilterKey = 'all' | 0 | 1 | 2 | 3 | 'offline';

const FILTER_OPTS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all',     label: 'All',      color: BRAND },
  { key: 0,         label: 'Normal',   color: '#22C55E' },
  { key: 1,         label: 'Watch',    color: '#3B82F6' },
  { key: 2,         label: 'Warning',  color: '#F97316' },
  { key: 3,         label: 'Critical', color: '#EF4444' },
  { key: 'offline', label: 'Offline',  color: MUTED },
];

// ── Favourite card (horizontal strip) ─────────────────────────────────────────

function FavouriteCard({ node, onNavigate, onRemove }: {
  node: FavouriteNodeDto;
  onNavigate: (n: FavouriteNodeDto) => void;
  onRemove: (id: string) => void;
}) {
  const isOffline = node.status === 'inactive';
  const color  = isOffline ? '#9CA3AF' : (LEVEL_COLOR[node.currentLevel] ?? '#22C55E');
  const label  = isOffline ? 'Offline'  : LEVEL_LABEL[node.currentLevel];
  const water  = isOffline ? '—'        : WATER_M[node.currentLevel];

  return (
    <TouchableOpacity style={favStyles.card} onPress={() => onNavigate(node)} activeOpacity={0.85}>
      {/* Accent top bar */}
      <View style={[favStyles.accentBar, { backgroundColor: color }]} />

      <View style={favStyles.body}>
        {/* Header: node ID + remove */}
        <View style={favStyles.headerRow}>
          <Text style={favStyles.nodeId} numberOfLines={1}>{node.nodeId}</Text>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onRemove(node.nodeId)}
          >
            <Ionicons name="heart" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Status badge */}
        <View style={[favStyles.badge, { backgroundColor: color + '20' }]}>
          <View style={[favStyles.dot, { backgroundColor: color }]} />
          <Text style={[favStyles.badgeText, { color }]}>{label}</Text>
        </View>

        {/* Water level — prominent metric */}
        <View style={favStyles.waterRow}>
          <Ionicons name="water" size={14} color={isOffline ? MUTED : color} />
          <Text style={[favStyles.waterLevel, { color: isOffline ? MUTED : color }]}>{water}</Text>
        </View>

        <Text style={favStyles.area} numberOfLines={1}>{node.area}</Text>

        {/* Navigate link */}
        <View style={favStyles.mapLink}>
          <Ionicons name="map-outline" size={11} color={BRAND} />
          <Text style={favStyles.mapLinkText}>View on Map</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Node row card (main list) ──────────────────────────────────────────────────

function NodeRow({ node, isFav, onToggle }: {
  node: SensorNodeDto;
  isFav: boolean;
  onToggle: (n: SensorNodeDto) => void;
}) {
  const isOffline = node.status === 'inactive';
  const color = isOffline ? '#9CA3AF' : (LEVEL_COLOR[node.currentLevel] ?? '#22C55E');
  const label = isOffline ? 'Offline'  : LEVEL_LABEL[node.currentLevel];
  const water = isOffline ? '—'        : WATER_M[node.currentLevel];
  const location = [node.area, node.state].filter(Boolean).join(' · ');

  return (
    <View style={rowStyles.card}>
      {/* Left accent stripe */}
      <View style={[rowStyles.stripe, { backgroundColor: color }]} />

      <View style={rowStyles.body}>
        {/* Top row: ID + fav toggle */}
        <View style={rowStyles.topRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={rowStyles.nodeId} numberOfLines={1}>{node.nodeId}</Text>
            {!!node.name && <Text style={rowStyles.nodeName} numberOfLines={1}>{node.name}</Text>}
          </View>
          <TouchableOpacity
            onPress={() => onToggle(node)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={rowStyles.favBtn}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={20}
              color={isFav ? '#EF4444' : MUTED}
            />
          </TouchableOpacity>
        </View>

        {/* Status + Water level */}
        <View style={rowStyles.metricsRow}>
          <View style={[rowStyles.statusBadge, { backgroundColor: color + '18' }]}>
            <View style={[rowStyles.statusDot, { backgroundColor: color }]} />
            <Text style={[rowStyles.statusText, { color }]}>{label}</Text>
          </View>
          <View style={rowStyles.waterChip}>
            <Ionicons name="water-outline" size={13} color={color} />
            <Text style={[rowStyles.waterText, { color }]}>{water}</Text>
          </View>
        </View>

        {/* Location */}
        {!!location && (
          <View style={rowStyles.locationRow}>
            <Ionicons name="location-outline" size={12} color={MUTED} />
            <Text style={rowStyles.locationText} numberOfLines={1}>{location}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

function CommunitySensorsScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data: allNodes = [], isLoading: nodesLoading, refetch: refetchNodes, isRefetching } =
    useQuery({ queryKey: ['sensors-all'], queryFn: sensorsApi.getAll, refetchInterval: 60_000 });
  const { data: favNodes = [], isLoading: favsLoading } =
    useQuery({ queryKey: ['favourites'], queryFn: favouritesApi.getAll });

  const favSet = useMemo<Set<string>>(() => new Set(favNodes.map((f) => f.nodeId)), [favNodes]);

  const addFav    = useMutation({ mutationFn: (nodeId: string) => favouritesApi.add(nodeId),    onSuccess: () => qc.invalidateQueries({ queryKey: ['favourites'] }), onError: () => Alert.alert('Error', 'Could not save favourite.') });
  const removeFav = useMutation({ mutationFn: (nodeId: string) => favouritesApi.remove(nodeId), onSuccess: () => qc.invalidateQueries({ queryKey: ['favourites'] }), onError: () => Alert.alert('Error', 'Could not remove favourite.') });

  const toggleFav = useCallback((node: SensorNodeDto) => {
    favSet.has(node.nodeId) ? removeFav.mutate(node.nodeId) : addFav.mutate(node.nodeId);
  }, [favSet, addFav, removeFav]);

  const navigateToMap = useCallback((node: FavouriteNodeDto) => {
    router.push({ pathname: '/(app)/alerts', params: { focusLat: String(node.latitude), focusLng: String(node.longitude), focusNodeId: node.nodeId } });
  }, []);

  const filteredNodes = useMemo(() => {
    let list = allNodes;
    if (filter !== 'all') list = list.filter((n) => filter === 'offline' ? n.status === 'inactive' : n.status !== 'inactive' && n.currentLevel === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((n) => n.nodeId.toLowerCase().includes(q) || n.area.toLowerCase().includes(q) || n.state.toLowerCase().includes(q));
    }
    return list;
  }, [allNodes, filter, search]);

  const isLoading  = nodesLoading || favsLoading;
  const activeFilter = FILTER_OPTS.find((f) => f.key === filter);

  const doRefresh = useCallback(() => {
    void refetchNodes();
    qc.invalidateQueries({ queryKey: ['favourites'] });
  }, [refetchNodes, qc]);

  return (
    <SafeAreaView style={commStyles.screen} edges={['top']}>
      {/* ── Header ── */}
      <View style={commStyles.header}>
        <View>
          <Text style={commStyles.headerTitle}>Sensors</Text>
          <Text style={commStyles.headerSub}>
            {allNodes.length} nodes · {favNodes.length} favourited
          </Text>
        </View>
        <TouchableOpacity style={commStyles.refreshBtn} onPress={doRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={BRAND} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={BRAND} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filteredNodes}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NodeRow node={item} isFav={favSet.has(item.nodeId)} onToggle={toggleFav} />
          )}
          contentContainerStyle={commStyles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={doRefresh} tintColor={BRAND} colors={[BRAND]} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={commStyles.empty}>
              <View style={commStyles.emptyIconWrap}>
                <Ionicons name="radio-outline" size={32} color={BRAND} />
              </View>
              <Text style={commStyles.emptyTitle}>No nodes found</Text>
              <Text style={commStyles.emptyDesc}>
                {search || filter !== 'all' ? 'Clear your search or filter.' : 'No sensor nodes are registered.'}
              </Text>
            </View>
          }
          ListHeaderComponent={
            <View>
              {/* ── Favourites strip ── */}
              {favNodes.length > 0 && (
                <View style={commStyles.favSection}>
                  <View style={commStyles.favHeader}>
                    <Ionicons name="heart" size={15} color="#EF4444" />
                    <Text style={commStyles.favTitle}>Favourites</Text>
                    <View style={commStyles.favCount}>
                      <Text style={commStyles.favCountText}>{favNodes.length}</Text>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={commStyles.favStrip}
                  >
                    {favNodes.map((f) => (
                      <FavouriteCard
                        key={f.nodeId}
                        node={f}
                        onNavigate={navigateToMap}
                        onRemove={(id) => removeFav.mutate(id)}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* ── Search box ── */}
              <View style={commStyles.searchRow}>
                <View style={commStyles.searchBox}>
                  <Ionicons name="search-outline" size={16} color={MUTED} />
                  <TextInput
                    style={commStyles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search node ID, area, state…"
                    placeholderTextColor={MUTED}
                    returnKeyType="search"
                    autoCapitalize="none"
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Ionicons name="close-circle" size={16} color={MUTED} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* ── Filter chips ── */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={commStyles.filterRow}
              >
                {FILTER_OPTS.map((f) => {
                  const active = filter === f.key;
                  return (
                    <TouchableOpacity
                      key={String(f.key)}
                      style={[
                        commStyles.chip,
                        active && { backgroundColor: f.color, borderColor: f.color },
                      ]}
                      onPress={() => setFilter(f.key)}
                      activeOpacity={0.8}
                    >
                      {active && <View style={[commStyles.chipDot, { backgroundColor: '#fff' }]} />}
                      <Text style={[commStyles.chipText, active && commStyles.chipTextActive]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ── List section header ── */}
              <View style={commStyles.listHeader}>
                <Ionicons name="radio-outline" size={15} color={MUTED} />
                <Text style={commStyles.listHeaderTitle}>
                  {activeFilter?.label === 'All' ? 'All Nodes' : `${activeFilter?.label ?? ''} Nodes`}
                </Text>
                <View style={commStyles.listCount}>
                  <Text style={commStyles.listCountText}>{filteredNodes.length}</Text>
                </View>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export default function SensorsScreen() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'admin') return <AdminSensorsScreen />;
  return <CommunitySensorsScreen />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — Community
// ─────────────────────────────────────────────────────────────────────────────

const commStyles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: BG },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: CARD, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  headerSub:   { fontSize: 12, color: MUTED, marginTop: 2 },
  refreshBtn:  { padding: 4 },

  listContent:  { paddingHorizontal: 14, paddingBottom: 32, paddingTop: 4 },

  // Favourites
  favSection:   { marginTop: 14, marginBottom: 6 },
  favHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, marginBottom: 10 },
  favTitle:     { fontSize: 14, fontWeight: '700', color: TEXT, flex: 1 },
  favCount:     { backgroundColor: '#FEE2E2', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  favCountText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  favStrip:     { paddingHorizontal: 14, paddingBottom: 6, gap: 12 },

  // Search
  searchRow:   { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT, padding: 0 },

  // Filter chips
  filterRow:      { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD },
  chipDot:        { width: 6, height: 6, borderRadius: 3 },
  chipText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  // List section label
  listHeader:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 4 },
  listHeaderTitle: { fontSize: 13, fontWeight: '700', color: TEXT, flex: 1 },
  listCount:       { backgroundColor: BRAND + '18', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  listCountText:   { fontSize: 11, fontWeight: '800', color: BRAND },

  // Empty state
  empty:         { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: BRAND + '15', alignItems: 'center', justifyContent: 'center' },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyDesc:     { fontSize: 13, color: MUTED, textAlign: 'center', paddingHorizontal: 32 },
});

const favStyles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar:  { height: 5 },
  body:       { padding: 12, gap: 6 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nodeId:     { fontSize: 14, fontWeight: '800', color: TEXT, flex: 1, marginRight: 4 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  waterRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  waterLevel: { fontSize: 20, fontWeight: '800' },
  area:       { fontSize: 11, color: MUTED },
  mapLink:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  mapLinkText:{ fontSize: 11, fontWeight: '700', color: BRAND },
});

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  stripe: { width: 5 },
  body:   { flex: 1, padding: 14, gap: 8 },

  topRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nodeId:  { fontSize: 16, fontWeight: '800', color: TEXT },
  nodeName:{ fontSize: 12, color: MUTED, marginTop: 1 },
  favBtn:  { padding: 2 },

  metricsRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusText:  { fontSize: 12, fontWeight: '700' },
  waterChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  waterText:   { fontSize: 12, fontWeight: '700' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText:{ fontSize: 12, color: MUTED, flex: 1 },
});
