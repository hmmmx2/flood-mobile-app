/**
 * More screen — admin account hub, analytics snapshot, settings & logout
 * Admin-only tab. Mirrors flood-website-crm /analytics + /settings.
 *
 * Key change from CRM original:
 *   - useAuthStore uses `user`/`setUser` (not `admin`/`setAdmin`)
 *   - `client` is used for change-password (not the old `authClient`)
 *   - `crmFeedApi` used for recent events (CRM feed, not community feed)
 *   - Hidden screen routes corrected to admin-blogs / admin-community
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Switch, ActivityIndicator, Alert, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Pressable, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import ScreenHeader from '@/src/components/ui/ScreenHeader';
import { analyticsApi, crmFeedApi, profileApi, settingsApi } from '@/src/api';
import { client } from '@/src/api/client';
import { useAuthStore } from '@/src/store/authStore';
import { colors, spacing, typography, radius, shadow } from '@/src/theme/admin';
import type { FeedItemDto } from '@/src/api/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string): string {
  return `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}`;
}

function severityColor(severity: FeedItemDto['severity']): string {
  switch (severity) {
    case 'critical': return colors.status.critical;
    case 'warning':  return colors.status.warning;
    case 'watch':    return colors.status.watch;
    default:         return colors.status.normal;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return <Text style={sh.text}>{title}</Text>;
}

const sh = StyleSheet.create({
  text: {
    ...typography.labelUpper,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
});

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({
  firstName, lastName, email, onEditPress,
}: {
  firstName?: string; lastName?: string; email?: string;
  onEditPress: () => void;
}) {
  const initials = getInitials(firstName, lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Admin User';

  return (
    <View style={pc.card}>
      <View style={pc.avatar}>
        <Text style={pc.initials}>{initials || '?'}</Text>
      </View>
      <View style={pc.info}>
        <Text style={pc.name} testID="more-username">{fullName}</Text>
        <Text style={pc.email}>{email ?? '—'}</Text>
        <View style={pc.rolePill}>
          <Text style={pc.roleText}>ADMIN</Text>
        </View>
      </View>
      <TouchableOpacity style={pc.editBtn} onPress={onEditPress} activeOpacity={0.7}>
        <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const pc = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.base,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    ...shadow.light,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  initials: { color: '#fff', fontSize: 18, fontWeight: '700' },
  info: { flex: 1, gap: 3 },
  name: { ...typography.body, fontWeight: '700' },
  email: { ...typography.bodySmall },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 2,
  },
  roleText: { fontSize: 9, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  editBtn: { padding: spacing.xs },
});

// ── Edit Profile Modal ────────────────────────────────────────────────────────

function EditProfileModal({
  visible, initialFirst, initialLast, onClose, onSave,
}: {
  visible: boolean;
  initialFirst: string;
  initialLast: string;
  onClose: () => void;
  onSave: (firstName: string, lastName: string) => Promise<void>;
}) {
  const [editFirst, setEditFirst]     = useState(initialFirst);
  const [editLast, setEditLast]       = useState(initialLast);
  const [editLoading, setEditLoading] = useState(false);

  const handleShow = () => { setEditFirst(initialFirst); setEditLast(initialLast); };

  const handleSave = async () => {
    const firstName = editFirst.trim();
    const lastName  = editLast.trim();
    if (!firstName || !lastName) {
      Alert.alert('Validation', 'First and last name are required.');
      return;
    }
    setEditLoading(true);
    try { await onSave(firstName, lastName); }
    finally { setEditLoading(false); }
  };

  const canSave = editFirst.trim().length > 0 && editLast.trim().length > 0 && !editLoading;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={handleShow}>
      <Pressable style={em.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={em.sheet}>
        <View style={em.handle} />
        <Text style={em.title}>Edit Profile</Text>
        <Text style={em.subtitle}>Update your admin account name.</Text>

        <Text style={em.label}>First Name</Text>
        <TextInput
          style={em.input}
          value={editFirst}
          onChangeText={setEditFirst}
          placeholder="First name"
          placeholderTextColor={colors.textMuted}
          returnKeyType="next"
          autoCapitalize="words"
          selectionColor={colors.primary}
        />

        <Text style={em.label}>Last Name</Text>
        <TextInput
          style={em.input}
          value={editLast}
          onChangeText={setEditLast}
          placeholder="Last name"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          autoCapitalize="words"
          selectionColor={colors.primary}
        />

        <TouchableOpacity
          style={[em.saveBtn, !canSave && em.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {editLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={em.saveBtnText}>Save Changes</Text>
          }
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const em = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.base + 4,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 22, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

// ── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm;
  const canSave  = current.trim().length > 0 && next.trim().length >= 8 && next === confirm && !loading;
  const reset    = () => { setCurrent(''); setNext(''); setConfirm(''); };

  const handleChange = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      await client.post('/auth/change-password', {
        currentPassword: current.trim(),
        newPassword: next.trim(),
      });
      Alert.alert('Password updated', 'Your password has been changed successfully.');
      reset();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to change password. Check your current password and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <Pressable style={cpw.backdrop} onPress={() => { reset(); onClose(); }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={cpw.sheet}>
        <View style={cpw.handle} />
        <Text style={cpw.title}>Change Password</Text>
        <Text style={cpw.subtitle}>Enter your current password and choose a new one (min 8 characters).</Text>

        <Text style={cpw.label}>Current Password</Text>
        <TextInput style={cpw.input} value={current} onChangeText={setCurrent} placeholder="Current password" placeholderTextColor={colors.textMuted} secureTextEntry returnKeyType="next" selectionColor={colors.primary} />

        <Text style={cpw.label}>New Password</Text>
        <TextInput style={cpw.input} value={next} onChangeText={setNext} placeholder="Min 8 characters" placeholderTextColor={colors.textMuted} secureTextEntry returnKeyType="next" selectionColor={colors.primary} />

        <Text style={cpw.label}>Confirm New Password</Text>
        <TextInput style={[cpw.input, mismatch && cpw.inputError]} value={confirm} onChangeText={setConfirm} placeholder="Repeat new password" placeholderTextColor={colors.textMuted} secureTextEntry returnKeyType="done" selectionColor={colors.primary} />
        {mismatch && <Text style={cpw.errorText}>Passwords do not match</Text>}

        <TouchableOpacity style={[cpw.saveBtn, !canSave && cpw.saveBtnDisabled]} onPress={handleChange} disabled={!canSave} activeOpacity={0.85}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={cpw.saveBtnText}>Update Password</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cpw = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.base + 4,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 22, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: colors.cardAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 14, color: colors.textPrimary, marginBottom: 14,
  },
  inputError: { borderColor: colors.status.critical },
  errorText: { fontSize: 12, color: colors.status.critical, marginTop: -10, marginBottom: 10 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

// ── KPI stat strip ────────────────────────────────────────────────────────────

function KpiStrip({ stats }: { stats: { label: string; value: string | number }[] }) {
  return (
    <View style={kpi.container}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          <View style={kpi.item}>
            <Text style={kpi.value}>{s.value}</Text>
            <Text style={kpi.label}>{s.label}</Text>
          </View>
          {i < stats.length - 1 && <View style={kpi.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const kpi = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow.light,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: spacing.base, gap: 4 },
  value: { fontSize: 22, fontWeight: '800', color: colors.primary },
  label: { ...typography.caption, textAlign: 'center' },
  divider: { width: 1, height: 36, backgroundColor: colors.border },
});

// ── Recent event row ──────────────────────────────────────────────────────────

function RecentEventRow({ item }: { item: FeedItemDto }) {
  const color      = severityColor(item.severity);
  const isCritical = item.severity === 'critical' || item.severity === 'warning';
  return (
    <View style={ev.row}>
      <View style={[ev.dot, { backgroundColor: color }]} />
      <View style={ev.body}>
        <Text style={[ev.title, isCritical && { color }]} numberOfLines={1}>{item.title}</Text>
        <Text style={ev.meta}>{item.sensorId} · {relativeTime(item.createdAt)}</Text>
      </View>
      <View style={[ev.badge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
        <Text style={[ev.badgeText, { color }]}>{item.severity.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const ev = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  body: { flex: 1, gap: 2 },
  title: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },
  meta:  { ...typography.caption },
  badge: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.xs + 2, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
});

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  icon, label, description, value, onChange,
}: {
  icon: string; label: string; description?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={tog.row}>
      <View style={tog.iconWrap}>
        <Ionicons name={icon as any} size={18} color={colors.textSecondary} />
      </View>
      <View style={tog.text}>
        <Text style={tog.label}>{label}</Text>
        {description && <Text style={tog.desc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary + '60' }}
        thumbColor={value ? colors.primary : colors.textMuted}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const tog = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  label: { ...typography.body, fontSize: 14 },
  desc:  { ...typography.caption },
});

// ── Menu row ──────────────────────────────────────────────────────────────────

function MenuRow({
  icon, label, onPress, destructive, testID,
}: {
  icon: string; label: string; onPress: () => void; destructive?: boolean; testID?: string;
}) {
  const tint = destructive ? colors.status.critical : colors.textSecondary;
  return (
    <TouchableOpacity style={mr.row} onPress={onPress} activeOpacity={0.7} testID={testID}>
      <View style={[mr.iconWrap, destructive && { backgroundColor: colors.status.critical + '15' }]}>
        <Ionicons name={icon as any} size={18} color={tint} />
      </View>
      <Text style={[mr.label, destructive && { color: colors.status.critical }]}>{label}</Text>
      {!destructive && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

const mr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, ...typography.body, fontSize: 14 },
});

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return <View style={cw.card}>{children}</View>;
}

const cw = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.base,
    paddingHorizontal: spacing.base,
    ...shadow.light,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MoreScreen() {
  // Unified auth store — uses `user` not `admin`
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout  = useAuthStore((s) => s.logout);

  const [editOpen, setEditOpen]               = useState(false);
  const [changePassOpen, setChangePassOpen]   = useState(false);
  const [pushEnabled, setPushEnabled]         = useState(true);
  const [emailEnabled, setEmailEnabled]       = useState(true);
  const [dailyDigest, setDailyDigest]         = useState(false);
  const [criticalOnly, setCriticalOnly]       = useState(false);
  const [soundAlerts, setSoundAlerts]         = useState(true);
  const [settingsDirty, setSettingsDirty]     = useState(false);
  const [settingsSaving, setSettingsSaving]   = useState(false);

  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
    isRefetching,
  } = useQuery({
    queryKey: ['analytics'],
    queryFn: analyticsApi.get,
    staleTime: 60_000,
  });

  // Use CRM feed for recent events (admin view)
  const { data: feedPage } = useQuery({
    queryKey: ['crm-feed-recent'],
    queryFn: () => crmFeedApi.getPage(undefined),
    staleTime: 30_000,
  });
  const recentItems: FeedItemDto[] = (feedPage?.items ?? []).slice(0, 5);

  const handleOpenEdit = useCallback(() => setEditOpen(true), []);

  const handleSaveProfile = useCallback(async (firstName: string, lastName: string) => {
    try {
      const updated = await profileApi.update({ firstName, lastName });
      if (user) {
        setUser({ ...user, firstName: updated.firstName, lastName: updated.lastName });
      }
      setEditOpen(false);
    } catch {
      Alert.alert('Error', 'Could not update profile. Please try again.');
    }
  }, [user, setUser]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => { await logout(); router.replace('/(auth)/login'); },
        },
      ],
    );
  }, [logout]);

  const handleSaveSettings = useCallback(async () => {
    setSettingsSaving(true);
    try {
      await Promise.all([
        settingsApi.update({ key: 'push_notifications', enabled: pushEnabled }),
        settingsApi.update({ key: 'email_notifications', enabled: emailEnabled }),
        settingsApi.update({ key: 'daily_digest',        enabled: dailyDigest }),
        settingsApi.update({ key: 'critical_only',       enabled: criticalOnly }),
        settingsApi.update({ key: 'sound_alerts',        enabled: soundAlerts }),
      ]);
      setSettingsDirty(false);
      Alert.alert('Saved', 'Notification preferences updated.');
    } catch {
      Alert.alert('Error', 'Could not save settings. Please try again.');
    } finally {
      setSettingsSaving(false);
    }
  }, [pushEnabled, emailEnabled, dailyDigest, criticalOnly, soundAlerts]);

  const kpiStats = analytics?.stats?.slice(0, 3).map((s) => ({ label: s.label, value: s.value })) ?? [];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="More"
        subtitle="Preferences & Account"
        rightAction={{ icon: 'refresh-outline', onPress: refetchAnalytics }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetchAnalytics} tintColor={colors.primary} />
        }
      >
        {/* ── Profile ─────────────────────────────────────────────────── */}
        <SectionHeading title="Account" />
        <ProfileCard
          firstName={user?.firstName}
          lastName={user?.lastName}
          email={user?.email}
          onEditPress={handleOpenEdit}
        />

        <Card>
          <View style={styles.lastMenuRow}>
            <MenuRow icon="key-outline" label="Change Password" onPress={() => setChangePassOpen(true)} testID="more-change-password-item" />
          </View>
        </Card>

        {/* ── Analytics KPIs ──────────────────────────────────────────── */}
        <SectionHeading title="Analytics Overview" />
        {analyticsLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : kpiStats.length > 0 ? (
          <KpiStrip stats={kpiStats} />
        ) : (
          <View style={styles.emptyKpi}>
            <Text style={styles.emptyKpiText}>No analytics data available</Text>
          </View>
        )}

        {/* ── Recent Events ────────────────────────────────────────────── */}
        {recentItems.length > 0 && (
          <>
            <SectionHeading title="Recent Events" />
            <Card>
              {recentItems.map((item, i) => (
                <RecentEventRow key={item.id ?? i} item={item} />
              ))}
              <TouchableOpacity style={styles.viewAllRow} onPress={() => router.push('/(app)/alerts')} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View all alerts</Text>
                <Ionicons name="arrow-forward" size={13} color={colors.primary} />
              </TouchableOpacity>
            </Card>
          </>
        )}

        {/* ── General Settings ─────────────────────────────────────────── */}
        <SectionHeading title="General Settings" />
        <Card>
          <ToggleRow icon="notifications-outline" label="Push Notifications" description="In-app alerts for flood events" value={pushEnabled} onChange={(v) => { setPushEnabled(v); setSettingsDirty(true); }} />
          <ToggleRow icon="mail-outline" label="Email Notifications" description="Receive alerts via email" value={emailEnabled} onChange={(v) => { setEmailEnabled(v); setSettingsDirty(true); }} />
          <ToggleRow icon="document-text-outline" label="Daily Digest" description="Summary email every morning" value={dailyDigest} onChange={(v) => { setDailyDigest(v); setSettingsDirty(true); }} />
          <ToggleRow icon="flame-outline" label="Critical Alerts Only" description="Only notify for danger-level events" value={criticalOnly} onChange={(v) => { setCriticalOnly(v); setSettingsDirty(true); }} />
          <View style={styles.lastToggle}>
            <ToggleRow icon="volume-high-outline" label="Sound Alerts" description="Play sound for incoming alerts" value={soundAlerts} onChange={(v) => { setSoundAlerts(v); setSettingsDirty(true); }} />
          </View>
          {settingsDirty && (
            <TouchableOpacity
              style={[styles.saveSettingsBtn, settingsSaving && { opacity: 0.6 }]}
              onPress={handleSaveSettings}
              disabled={settingsSaving}
              activeOpacity={0.8}
            >
              {settingsSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveSettingsBtnText}>Save Preferences</Text>
              }
            </TouchableOpacity>
          )}
        </Card>

        {/* ── Operations ───────────────────────────────────────────────── */}
        <SectionHeading title="Operations" />
        <Card>
          <MenuRow icon="radio-outline"        label="All Sensor Nodes" onPress={() => router.push('/(app)/sensors')} />
          <MenuRow icon="alert-circle-outline" label="Alert Feed"       onPress={() => router.push('/(app)/alerts')} />
          <MenuRow icon="megaphone-outline"  label="Broadcasts"       onPress={() => router.push('/(app)/broadcasts' as any)} />
          <View style={styles.lastMenuRow}>
            <MenuRow icon="shield-checkmark-outline" label="Safety Tips" onPress={() => router.push('/(app)/safety' as any)} />
          </View>
        </Card>

        {/* ── Management ───────────────────────────────────────────────── */}
        <SectionHeading title="Management" />
        <Card>
          <MenuRow icon="bar-chart-outline"     label="Analytics"             onPress={() => router.push('/(app)/analytics' as any)} testID="more-analytics-item" />
          <MenuRow icon="document-text-outline" label="Incident Reports"      onPress={() => router.push('/(app)/reports' as any)} testID="more-reports-item" />
          <MenuRow icon="people-outline"        label="User Management"       onPress={() => router.push('/(app)/users' as any)} testID="more-users-item" />
          <MenuRow icon="newspaper-outline"     label="Blog Management"       onPress={() => router.push('/(app)/admin-blogs' as any)} testID="more-admin-blogs-item" />
          <View style={styles.lastMenuRow}>
            <MenuRow icon="chatbubbles-outline" label="Community Moderation"  onPress={() => router.push('/(app)/admin-community' as any)} testID="more-admin-community-item" />
          </View>
        </Card>

        {/* ── About ────────────────────────────────────────────────────── */}
        <SectionHeading title="About" />
        <Card>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>FloodWatch Unified</Text>
          </View>
          <View style={[styles.infoRow, styles.lastInfoRow]}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>CRM Admin</Text>
          </View>
        </Card>

        {/* ── Sign Out ─────────────────────────────────────────────────── */}
        <SectionHeading title="Session" />
        <Card>
          <View style={styles.lastMenuRow}>
            <MenuRow icon="log-out-outline" label="Sign Out" onPress={handleLogout} destructive testID="more-logout-item" />
          </View>
        </Card>

        <View style={styles.footer}>
          <View style={styles.footerDot} />
          <Text style={styles.footerText}>FloodWatch — Admin Console</Text>
          <View style={styles.footerDot} />
        </View>
      </ScrollView>

      <EditProfileModal
        visible={editOpen}
        initialFirst={user?.firstName ?? ''}
        initialLast={user?.lastName ?? ''}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveProfile}
      />

      <ChangePasswordModal visible={changePassOpen} onClose={() => setChangePassOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingTop: spacing.xs, paddingBottom: spacing.xxl + spacing.xl },
  loader: { marginVertical: spacing.base },
  emptyKpi: {
    marginHorizontal: spacing.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    alignItems: 'center',
  },
  emptyKpiText: { ...typography.bodySmall },
  viewAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2 },
  viewAllText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  lastToggle: {},
  lastMenuRow: {},
  saveSettingsBtn: { backgroundColor: colors.primary, borderRadius: spacing.sm, paddingVertical: spacing.sm + 2, alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },
  saveSettingsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastInfoRow: { borderBottomWidth: 0 },
  infoLabel: { ...typography.bodySmall, color: colors.textSecondary },
  infoValue: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm },
  footerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  footerText: { ...typography.caption, color: colors.textMuted, letterSpacing: 0.5 },
});
