/**
 * Broadcasts screen — admin emergency mass alerts
 * Admin-only tab. Mirrors flood-website-crm /broadcasts.
 */

import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import ScreenHeader from '@/src/components/ui/ScreenHeader';
import StatusBadge from '@/src/components/ui/StatusBadge';
import EmptyState from '@/src/components/ui/EmptyState';
import { broadcastsApi, zonesApi } from '@/src/api';
import { colors, spacing, typography, radius, shadow } from '@/src/theme/admin';
import type { BroadcastDto, CreateBroadcastDto, FloodZoneDto } from '@/src/api/types';

// ── Broadcast card ────────────────────────────────────────────────────────────

function BroadcastCard({ item }: { item: BroadcastDto }) {
  const severityToVariant = {
    normal: 'normal' as const,
    watch: 'watch' as const,
    warning: 'warning' as const,
    critical: 'critical' as const,
  };

  const timestamp = item.sentAt ? new Date(item.sentAt) : null;

  return (
    <View style={card.container}>
      <View style={card.header}>
        <View style={card.titleRow}>
          <Text style={card.title} numberOfLines={2}>{item.title}</Text>
          <StatusBadge variant={severityToVariant[item.severity]} />
        </View>
        <Text style={card.meta}>
          Zone: {item.targetZone} · {item.recipientCount} recipients
        </Text>
      </View>
      <Text style={card.body} numberOfLines={3}>{item.body}</Text>
      <View style={card.footer}>
        <Ionicons name="person-outline" size={11} color={colors.textMuted} />
        <Text style={card.footerText}>{item.sentBy}</Text>
        <Text style={card.footerSep}>·</Text>
        <Ionicons name="time-outline" size={11} color={colors.textMuted} />
        <Text style={card.footerText}>
          {timestamp
            ? `${timestamp.toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })} ${timestamp.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}`
            : 'Pending'
          }
        </Text>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadow.light,
  },
  header: { gap: 4 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: { ...typography.body, fontWeight: '700', flex: 1 },
  meta: { ...typography.caption },
  body: { ...typography.bodySmall, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: { ...typography.caption },
  footerSep: { ...typography.caption, marginHorizontal: 2 },
});

// ── Compose modal ─────────────────────────────────────────────────────────────

type Severity = 'normal' | 'watch' | 'warning' | 'critical';

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'normal',   label: 'Normal',   color: colors.status.normal },
  { value: 'watch',    label: 'Alert',    color: colors.status.watch },
  { value: 'warning',  label: 'Warning',  color: colors.status.warning },
  { value: 'critical', label: 'Critical', color: colors.status.critical },
];

function zoneRiskColor(riskLevel: FloodZoneDto['riskLevel']): string {
  switch (riskLevel) {
    case 'extreme': return colors.status.critical;
    case 'high':    return colors.status.warning;
    case 'medium':  return colors.status.watch;
    default:        return colors.status.normal;
  }
}

interface ComposeModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (payload: CreateBroadcastDto) => Promise<void>;
  isSending: boolean;
  zones: FloodZoneDto[];
  zonesLoading?: boolean;
}

function ComposeModal({ visible, onClose, onSend, isSending, zones, zonesLoading }: ComposeModalProps) {
  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  // BUG-BCAST01: default to 'all' so the field is always pre-filled
  const [targetZone, setTargetZone] = useState('all');
  const [severity, setSeverity]     = useState<Severity>('warning');

  const canSend = title.trim() && body.trim() && targetZone && !isSending;

  const handleSend = () => {
    if (!canSend) return;
    Alert.alert(
      'Send Broadcast',
      'This will send an alert to all registered users in the target zone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            await onSend({ title: title.trim(), body: body.trim(), targetZone, severity });
            setTitle(''); setBody(''); setTargetZone('all'); setSeverity('warning');
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={compose.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={compose.header}>
          <TouchableOpacity onPress={onClose} style={compose.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={compose.headerTitle}>New Broadcast</Text>
          <TouchableOpacity
            style={[compose.sendBtn, !canSend && compose.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
          >
            {isSending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={compose.sendBtnText}>Send</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={compose.form} keyboardShouldPersistTaps="handled">
          {/* Severity picker */}
          <View style={compose.field}>
            <Text style={compose.fieldLabel}>SEVERITY</Text>
            <View style={compose.severityRow}>
              {SEVERITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    compose.severityChip,
                    severity === opt.value && { backgroundColor: opt.color + '20', borderColor: opt.color },
                  ]}
                  onPress={() => setSeverity(opt.value)}
                >
                  <View style={[compose.severityDot, { backgroundColor: opt.color }]} />
                  <Text style={[compose.severityLabel, severity === opt.value && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Title */}
          <View style={compose.field}>
            <Text style={compose.fieldLabel}>TITLE</Text>
            <TextInput
              style={compose.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Flash Flood Warning — Kuching"
              placeholderTextColor={colors.textMuted}
              maxLength={120}
            />
          </View>

          {/* BUG-BCAST01: Target zone — zone picker from /api/zones */}
          <View style={compose.field}>
            <Text style={compose.fieldLabel}>TARGET ZONE</Text>
            {zonesLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={compose.zoneRow}>
                {/* "All Zones" always first */}
                <TouchableOpacity
                  style={[compose.zoneChip, targetZone === 'all' && compose.zoneChipActive]}
                  onPress={() => setTargetZone('all')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="globe-outline" size={12} color={targetZone === 'all' ? '#fff' : colors.textSecondary} />
                  <Text style={[compose.zoneChipText, targetZone === 'all' && compose.zoneChipTextActive]}>
                    All Zones
                  </Text>
                </TouchableOpacity>

                {/* Individual zones from API */}
                {zones.map((zone) => {
                  const accentColor = zoneRiskColor(zone.riskLevel);
                  const isSelected  = targetZone === zone.name;
                  return (
                    <TouchableOpacity
                      key={zone.id}
                      style={[
                        compose.zoneChip,
                        isSelected && { backgroundColor: accentColor + '20', borderColor: accentColor },
                      ]}
                      onPress={() => setTargetZone(zone.name)}
                      activeOpacity={0.75}
                    >
                      <View style={[compose.zoneDot, { backgroundColor: accentColor }]} />
                      <Text style={[compose.zoneChipText, isSelected && { color: accentColor, fontWeight: '700' }]}>
                        {zone.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Fallback: TextInput if API returned no zones */}
                {zones.length === 0 && (
                  <TextInput
                    style={[compose.input, { minWidth: 200 }]}
                    value={targetZone === 'all' ? '' : targetZone}
                    onChangeText={(v) => setTargetZone(v.trim() || 'all')}
                    placeholder="e.g. Kuching, Sarawak"
                    placeholderTextColor={colors.textMuted}
                  />
                )}
              </ScrollView>
            )}
            <Text style={compose.zoneSelectedLabel}>
              Selected: <Text style={{ fontWeight: '700' }}>{targetZone}</Text>
            </Text>
          </View>

          {/* Body */}
          <View style={compose.field}>
            <Text style={compose.fieldLabel}>MESSAGE</Text>
            <TextInput
              style={[compose.input, compose.textArea]}
              value={body}
              onChangeText={setBody}
              placeholder="Describe the emergency situation and recommended actions…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Warning banner */}
          <View style={compose.warningBanner}>
            <Ionicons name="warning-outline" size={14} color={colors.status.warning} />
            <Text style={compose.warningText}>
              This message will be sent to all registered users in the target zone. Verify before sending.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const compose = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    paddingTop: spacing.xl,
  },
  closeBtn: { padding: 4 },
  headerTitle: { ...typography.h3, fontSize: 16 },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    minWidth: 64,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  form: { padding: spacing.base, gap: spacing.base, paddingBottom: spacing.xxl },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.labelUpper },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    ...typography.body,
  },
  textArea: { minHeight: 100, paddingTop: spacing.sm },
  severityRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  severityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  severityDot: { width: 7, height: 7, borderRadius: 4 },
  severityLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  warningBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.status.warning + '15',
    borderWidth: 1,
    borderColor: colors.status.warning + '40',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  warningText: { ...typography.bodySmall, flex: 1, lineHeight: 18 },
  zoneRow: { gap: spacing.sm, paddingVertical: 4 },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  zoneChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  zoneChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  zoneChipTextActive: { color: colors.primary, fontWeight: '700' },
  zoneDot: { width: 7, height: 7, borderRadius: 4 },
  zoneSelectedLabel: { ...typography.caption, marginTop: 4, color: colors.textMuted },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BroadcastsScreen() {
  const [composeOpen, setComposeOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: broadcastsApi.getAll,
  });

  // BUG-BCAST01: fetch zones for the zone picker in ComposeModal
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const sendMutation = useMutation({
    mutationFn: broadcastsApi.send,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      setComposeOpen(false);
      Alert.alert('Broadcast sent', 'The emergency broadcast has been delivered successfully.');
    },
    onError: () => {
      Alert.alert('Failed to send', 'Something went wrong. Please try again.');
    },
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Broadcasts" subtitle="Emergency mass alerts" />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BroadcastCard item={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon="megaphone-outline"
              title="No broadcasts yet"
              message="Tap the button below to send an emergency broadcast."
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setComposeOpen(true)} activeOpacity={0.8}>
        <Ionicons name="megaphone" size={20} color="#fff" />
        <Text style={styles.fabText}>New Broadcast</Text>
      </TouchableOpacity>

      <ComposeModal
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={(payload) => sendMutation.mutateAsync(payload).then(() => undefined)}
        isSending={sendMutation.isPending}
        zones={zones}
        zonesLoading={zonesLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: 60 },
  list: { padding: spacing.base, paddingBottom: 100 },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.base,
    left: spacing.base,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
    ...shadow.card,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
