/**
 * Reports screen — admin incident reports management (hidden tab)
 * Accessible via More screen → Incident Reports
 * Mirrors flood-website-crm /reports
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import ScreenHeader from '@/src/components/ui/ScreenHeader';
import EmptyState from '@/src/components/ui/EmptyState';
import { reportsApi } from '@/src/api';
import { colors, spacing, typography, radius, shadow } from '@/src/theme/admin';
import type { IncidentReportDto, ReportStatus, AlertSeverity } from '@/src/api/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityColor(s: AlertSeverity): string {
  return s === 'critical' ? colors.status.critical
    : s === 'warning'  ? colors.status.warning
    : s === 'watch'    ? colors.status.watch
    : colors.status.normal;
}

function statusColor(s: ReportStatus): string {
  return s === 'resolved' ? colors.status.normal
    : s === 'reviewed' ? colors.status.watch
    : colors.status.warning;
}

function relativeTime(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (d < 1)  return 'just now';
  if (d < 60) return `${d}m ago`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({
  item, onUpdateStatus, isUpdating,
}: {
  item: IncidentReportDto;
  onUpdateStatus: (id: string, status: 'reviewed' | 'resolved') => void;
  isUpdating: boolean;
}) {
  const sevColor = severityColor(item.severity);
  const stColor  = statusColor(item.status);

  return (
    <View style={rc.card}>
      <View style={rc.header}>
        <View style={[rc.severityDot, { backgroundColor: sevColor }]} />
        <View style={rc.headerInfo}>
          <TouchableOpacity
          onPress={() => Linking.openURL(`https://maps.google.com/?q=${item.latitude},${item.longitude}`)}
          activeOpacity={0.7}
        >
          <Text style={[rc.location, rc.locationLink]}>
            {item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°  📍
          </Text>
        </TouchableOpacity>
          <Text style={rc.time}>{relativeTime(item.submittedAt)}</Text>
        </View>
        <View style={[rc.statusPill, { backgroundColor: stColor + '20', borderColor: stColor + '50' }]}>
          <Text style={[rc.statusText, { color: stColor }]}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      {item.description
        ? <Text style={rc.desc} numberOfLines={3}>{item.description}</Text>
        : <Text style={rc.noDesc}>No description provided</Text>
      }

      <View style={rc.metaRow}>
        <View style={[rc.sevBadge, { backgroundColor: sevColor + '20' }]}>
          <Ionicons name="warning-outline" size={11} color={sevColor} />
          <Text style={[rc.sevText, { color: sevColor }]}>{item.severity.toUpperCase()}</Text>
        </View>
        <Text style={rc.uid} numberOfLines={1}>ID: {item.id.slice(0, 8)}…</Text>
      </View>

      {item.status === 'pending' && (
        <View style={rc.actions}>
          <TouchableOpacity
            style={[rc.actionBtn, { borderColor: colors.status.watch }]}
            onPress={() => onUpdateStatus(item.id, 'reviewed')}
            disabled={isUpdating}
          >
            {isUpdating
              ? <ActivityIndicator size="small" color={colors.status.watch} />
              : <Text style={[rc.actionBtnText, { color: colors.status.watch }]}>Mark Reviewed</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[rc.actionBtn, { borderColor: colors.status.normal }]}
            onPress={() => onUpdateStatus(item.id, 'resolved')}
            disabled={isUpdating}
          >
            {isUpdating
              ? <ActivityIndicator size="small" color={colors.status.normal} />
              : <Text style={[rc.actionBtnText, { color: colors.status.normal }]}>Mark Resolved</Text>
            }
          </TouchableOpacity>
        </View>
      )}
      {item.status === 'reviewed' && (
        <View style={rc.actions}>
          <TouchableOpacity
            style={[rc.actionBtn, { borderColor: colors.status.normal }]}
            onPress={() => onUpdateStatus(item.id, 'resolved')}
            disabled={isUpdating}
          >
            <Text style={[rc.actionBtnText, { color: colors.status.normal }]}>Mark Resolved</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const rc = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadow.light,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  severityDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  headerInfo: { flex: 1 },
  location:     { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  locationLink: { color: colors.primary, textDecorationLine: 'underline' },
  time: { ...typography.caption },
  statusPill: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  desc: { ...typography.bodySmall, lineHeight: 18 },
  noDesc: { ...typography.caption, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sevBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  sevText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  uid: { ...typography.caption, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: 7, alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'reviewed' | 'resolved';

export default function ReportsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter]       = useState<StatusFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.getAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'reviewed' | 'resolved' }) =>
      reportsApi.updateStatus(id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
    onError: () => Alert.alert('Error', 'Failed to update report status.'),
    onSettled: () => setUpdatingId(null),
  });

  const displayed = (data ?? []).filter((r) => filter === 'all' || r.status === filter);
  const pending   = data?.filter((r) => r.status === 'pending').length ?? 0;

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'pending',  label: 'Pending' },
    { key: 'reviewed', label: 'Reviewed' },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Reports"
        subtitle={`${data?.length ?? 0} reports · ${pending} pending`}
        showBack
        rightAction={{ icon: 'refresh-outline', onPress: refetch }}
      />

      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterTab, filter === f.key && s.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReportCard
              item={item}
              onUpdateStatus={(id, status) => updateMutation.mutate({ id, status })}
              isUpdating={updatingId === item.id}
            />
          )}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No reports"
              message={filter === 'all' ? 'No incident reports submitted yet.' : `No ${filter} reports.`}
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filterRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  filterTab: { flex: 1, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center' },
  filterTabActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  filterText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  filterTextActive: { color: colors.primary },
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing.xxl },
});
