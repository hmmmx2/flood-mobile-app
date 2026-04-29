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
const LEVEL_LABEL: Record<number, string> = { 0: 'Normal', 1: 'Watch', 2: 'Warning', 3: 'Critical' };
const WATER_M: Record<number, string>     = { 0: '0.0 m', 1: '1.0 m', 2: '2.5 m', 3: '4.0 m' };

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
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: ac.card, borderRadius: ar.md, borderWidth: 1, borderColor: ac.border, paddingHorizontal: asp.sm, paddingVertical: asp.sm, gap: asp.sm },
  searchInput: { flex: 1, ...aty.body, padding: 0 },
  filterChip: { paddingHorizontal: asp.sm + 2, paddingVertical: asp.xs + 1, borderRadius: ar.full, borderWidth: 1, borderColor: ac.border, backgroundColor: ac.card },
  filterChipActive: { backgroundColor: ac.primary, borderColor: ac.primary },
  filterChipText: { ...aty.badge, color: ac.textSecondary },
  filterChipTextActive: { color: '#fff' },
});

// ═════════════════════════════════════════════════════════════════════════════
// COMMUNITY SENSORS SCREEN (community backend, light theme)
// ═════════════════════════════════════════════════════════════════════════════

type FilterKey = 'all' | 0 | 1 | 2 | 3 | 'offline';
const FILTER_OPTS: { key: FilterKey; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 0,         label: '🟢 Dry' },
  { key: 1,         label: '🔵 Normal' },
  { key: 2,         label: '🟠 Warning' },
  { key: 3,         label: '🔴 Critical' },
  { key: 'offline', label: '⚫ Offline' },
];

function FavouriteCard({ node, onNavigate, onRemove }: { node: FavouriteNodeDto; onNavigate: (n: FavouriteNodeDto) => void; onRemove: (id: string) => void }) {
  const color = node.status === 'inactive' ? '#9CA3AF' : (LEVEL_COLOR[node.currentLevel] ?? '#22C55E');
  const label = node.status === 'inactive' ? 'Offline' : LEVEL_LABEL[node.currentLevel];
  const water = node.status === 'inactive' ? '—' : WATER_M[node.currentLevel];
  return (
    <TouchableOpacity style={favStyles.card} onPress={() => onNavigate(node)} activeOpacity={0.85}>
      <View style={[favStyles.topBar, { backgroundColor: color }]} />
      <View style={favStyles.body}>
        <View style={favStyles.row}>
          <Text style={favStyles.nodeId} numberOfLines={1}>{node.nodeId}</Text>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => onRemove(node.nodeId)}>
            <Ionicons name="heart" size={18} color={BRAND} />
          </TouchableOpacity>
        </View>
        <View style={[favStyles.badge, { backgroundColor: color + '22' }]}>
          <View style={[favStyles.dot, { backgroundColor: color }]} />
          <Text style={[favStyles.badgeText, { color }]}>{label}</Text>
        </View>
        <Text style={favStyles.water}>{water}</Text>
        <Text style={favStyles.area} numberOfLines={1}>{node.area}</Text>
        <View style={favStyles.navRow}>
          <Ionicons name="navigate-outline" size={11} color={BRAND} />
          <Text style={favStyles.navText}>View on Map</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function NodeRow({ node, isFav, onToggle }: { node: SensorNodeDto; isFav: boolean; onToggle: (n: SensorNodeDto) => void }) {
  const color = node.status === 'inactive' ? '#9CA3AF' : (LEVEL_COLOR[node.currentLevel] ?? '#22C55E');
  const label = node.status === 'inactive' ? 'Offline' : LEVEL_LABEL[node.currentLevel];
  const water = node.status === 'inactive' ? '—' : WATER_M[node.currentLevel];
  return (
    <View style={rowStyles.card}>
      <View style={[rowStyles.stripe, { backgroundColor: color }]} />
      <View style={rowStyles.body}>
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.nodeId} numberOfLines={1}>{node.nodeId}</Text>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => onToggle(node)} activeOpacity={0.7}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? BRAND : MUTED} />
          </TouchableOpacity>
        </View>
        <View style={rowStyles.metaRow}>
          <View style={[rowStyles.badge, { backgroundColor: color + '22' }]}>
            <View style={[rowStyles.dot, { backgroundColor: color }]} />
            <Text style={[rowStyles.badgeText, { color }]}>{label}</Text>
          </View>
          <View style={rowStyles.waterChip}>
            <Ionicons name="water-outline" size={11} color={MUTED} />
            <Text style={rowStyles.waterText}>{water}</Text>
          </View>
        </View>
        <View style={rowStyles.locationRow}>
          <Ionicons name="location-outline" size={11} color={MUTED} />
          <Text style={rowStyles.locationText} numberOfLines={1}>{[node.location, node.area, node.state].filter(Boolean).join(' · ')}</Text>
        </View>
        <Text style={rowStyles.coords}>{node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}</Text>
      </View>
    </View>
  );
}

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
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((n) => n.nodeId.toLowerCase().includes(q) || n.area.toLowerCase().includes(q) || n.state.toLowerCase().includes(q)); }
    return list;
  }, [allNodes, filter, search]);

  const isLoading = nodesLoading || favsLoading;

  return (
    <SafeAreaView style={commStyles.screen} edges={['top']}>
      <View style={commStyles.header}>
        <View>
          <Text style={commStyles.headerTitle}>Sensors</Text>
          <Text style={commStyles.headerSub}>{allNodes.length} nodes · {favNodes.length} favourites</Text>
        </View>
        <TouchableOpacity style={commStyles.refreshBtn} onPress={() => { void refetchNodes(); qc.invalidateQueries({ queryKey: ['favourites'] }); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={BRAND} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={BRAND} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filteredNodes}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NodeRow node={item} isFav={favSet.has(item.nodeId)} onToggle={toggleFav} />}
          contentContainerStyle={commStyles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetchNodes(); qc.invalidateQueries({ queryKey: ['favourites'] }); }} tintColor={BRAND} colors={[BRAND]} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={commStyles.empty}>
              <Text style={commStyles.emptyIcon}>📡</Text>
              <Text style={commStyles.emptyTitle}>No nodes found</Text>
              <Text style={commStyles.emptyDesc}>{search || filter !== 'all' ? 'Clear your search or filter.' : 'No sensor nodes are registered.'}</Text>
            </View>
          }
          ListHeaderComponent={
            <>
              {favNodes.length > 0 && (
                <View style={commStyles.favSection}>
                  <View style={commStyles.sectionHeader}>
                    <Ionicons name="heart" size={16} color={BRAND} />
                    <Text style={commStyles.sectionTitle}>Your Favourites</Text>
                    <Text style={commStyles.sectionCount}>{favNodes.length}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={commStyles.favStrip}>
                    {favNodes.map((f) => <FavouriteCard key={f.nodeId} node={f} onNavigate={navigateToMap} onRemove={(id) => removeFav.mutate(id)} />)}
                  </ScrollView>
                </View>
              )}
              <View style={commStyles.searchRow}>
                <View style={commStyles.searchBox}>
                  <Ionicons name="search-outline" size={16} color={MUTED} />
                  <TextInput style={commStyles.searchInput} value={search} onChangeText={setSearch} placeholder="Search node ID, area, state…" placeholderTextColor={MUTED} returnKeyType="search" autoCapitalize="none" />
                  {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity>}
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={commStyles.filterBar}>
                {FILTER_OPTS.map((f) => (
                  <TouchableOpacity key={String(f.key)} style={[commStyles.chip, filter === f.key && commStyles.chipActive]} onPress={() => setFilter(f.key)} activeOpacity={0.8}>
                    <Text style={[commStyles.chipText, filter === f.key && commStyles.chipTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={commStyles.sectionHeader}>
                <Ionicons name="radio-outline" size={16} color={MUTED} />
                <Text style={commStyles.sectionTitle}>{filter === 'all' ? 'All Nodes' : FILTER_OPTS.find((f) => f.key === filter)?.label ?? 'Nodes'}</Text>
                <Text style={commStyles.sectionCount}>{filteredNodes.length}</Text>
              </View>
            </>
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
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const commStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: CARD, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  headerSub: { fontSize: 13, color: MUTED, marginTop: 2 },
  refreshBtn: { padding: 4 },
  listContent: { paddingHorizontal: 12, paddingBottom: 28 },
  favSection: { marginTop: 12, marginBottom: 4 },
  favStrip: { paddingHorizontal: 12, gap: 10, paddingBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: TEXT, flex: 1 },
  sectionCount: { fontSize: 11, fontWeight: '700', color: CARD, backgroundColor: MUTED, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  searchRow: { paddingHorizontal: 12, paddingVertical: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 9, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT, padding: 0 },
  filterBar: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, fontWeight: '600', color: MUTED },
  chipTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 56, gap: 8 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyDesc: { fontSize: 13, color: MUTED, textAlign: 'center', paddingHorizontal: 24 },
});

const favStyles = StyleSheet.create({
  card: { width: 148, borderRadius: 14, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  topBar: { height: 4 },
  body: { padding: 10, gap: 5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nodeId: { fontSize: 13, fontWeight: '800', color: TEXT, flex: 1, marginRight: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  water: { fontSize: 17, fontWeight: '800', color: TEXT },
  area: { fontSize: 11, color: MUTED },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  navText: { fontSize: 11, fontWeight: '700', color: BRAND },
});

const rowStyles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  stripe: { width: 4 },
  body: { flex: 1, padding: 12, gap: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nodeId: { fontSize: 15, fontWeight: '800', color: TEXT, flex: 1, marginRight: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  waterChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  waterText: { fontSize: 11, color: MUTED },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 11, color: MUTED, flex: 1 },
  coords: { fontSize: 10, color: MUTED + '99' },
});
