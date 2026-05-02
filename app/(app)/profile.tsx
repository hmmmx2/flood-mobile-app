/**
 * Profile screen — user info, notification settings, account actions
 * Features: Edit Profile bottom-sheet modal with real API call,
 *           Change Password modal, Push Notification registration
 */
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Switch, ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, Pressable, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { settingsApi, profileApi, pushApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import type { UpdateSettingDto } from '@/src/api/types';
import { client } from '@/src/api/client';

const BRAND   = '#1d4ed8';
const BG      = '#eef2ff';
const CARD    = '#FFFFFF';
const BORDER  = '#e2e8f0';
const TEXT    = '#1e293b';
const MUTED   = '#64748b';
const SUCCESS = '#16a34a';
const DANGER  = '#EF4444';

// ── Notification setting helpers ──────────────────────────────────────────────

type NotifInfo = { icon: keyof typeof Ionicons.glyphMap; label: string; desc: string; color: string };
const NOTIF_MAP: Record<string, NotifInfo> = {
  push_notifications: { icon: 'notifications-outline',   label: 'Push Notifications', desc: 'Real-time alerts on your device',      color: BRAND },
  email_alerts:       { icon: 'mail-outline',            label: 'Email Alerts',        desc: 'Summaries delivered to your inbox',    color: '#0891b2' },
  flood_alerts:       { icon: 'warning-outline',         label: 'Flood Alerts',        desc: 'Critical flood level warnings',        color: '#ea580c' },
  critical_alerts:    { icon: 'alert-circle-outline',    label: 'Critical Alerts',     desc: 'Highest severity notifications only',  color: DANGER },
  community_updates:  { icon: 'people-outline',          label: 'Community Updates',   desc: 'Posts and news from members',          color: SUCCESS },
  sms_alerts:         { icon: 'chatbox-outline',         label: 'SMS Alerts',          desc: 'Text alerts to your phone number',     color: '#7c3aed' },
};

function resolveNotif(key: string, apiLabel: string): NotifInfo {
  const map = NOTIF_MAP[key];
  const fallbackLabel = apiLabel?.trim()
    || map?.label
    || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    icon:  map?.icon  ?? 'settings-outline',
    label: fallbackLabel,
    desc:  map?.desc  ?? 'Manage this notification type',
    color: map?.color ?? MUTED,
  };
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function getInitials(first = '', last = ''): string {
  return [first[0] ?? '', last[0] ?? ''].join('').toUpperCase();
}

// ── Change Password Modal ──────────────────────────────────────────────────────

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [current, setCurrent]       = useState('');
  const [next, setNext]             = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      client.post('/auth/change-password', { currentPassword: current, newPassword: next }),
    onSuccess: () => {
      Alert.alert('Success', 'Password changed successfully.');
      setCurrent(''); setNext(''); setConfirm(''); setError(null);
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to change password.'),
  });

  const handleSubmit = () => {
    if (!current || !next || !confirm) { setError('All fields are required.'); return; }
    if (next.length < 8)               { setError('New password must be at least 8 characters.'); return; }
    if (next !== confirm)              { setError('Passwords do not match.'); return; }
    setError(null);
    mutation.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={pwStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={pwStyles.sheet}>
          <View style={pwStyles.handle} />
          <View style={pwStyles.header}>
            <View style={pwStyles.headerIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={pwStyles.title}>Change Password</Text>
              <Text style={pwStyles.subtitle}>Choose a strong new password</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={pwStyles.closeBtn}>
              <Ionicons name="close" size={20} color={MUTED} />
            </Pressable>
          </View>
          {(['Current Password', 'New Password', 'Confirm New Password'] as const).map((lbl, idx) => {
            const value    = [current, next, confirm][idx];
            const setValue = [setCurrent, setNext, setConfirm][idx];
            const show     = [showCurrent, showNext, showConfirm][idx];
            const setShow  = [setShowCurrent, setShowNext, setShowConfirm][idx];
            const placeholder = ['Enter current password', 'Min. 8 characters', 'Re-enter new password'][idx];
            return (
              <View key={lbl} style={{ marginBottom: 14 }}>
                <Text style={pwStyles.label}>{lbl}</Text>
                <View style={pwStyles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
                  <TextInput
                    style={pwStyles.input}
                    value={value}
                    onChangeText={setValue}
                    secureTextEntry={!show}
                    placeholder={placeholder}
                    placeholderTextColor={MUTED}
                  />
                  <Pressable onPress={() => setShow(v => !v)} hitSlop={8}>
                    <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} />
                  </Pressable>
                </View>
              </View>
            );
          })}
          {error ? (
            <View style={pwStyles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={DANGER} />
              <Text style={pwStyles.error}>{error}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[pwStyles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            {mutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={pwStyles.saveBtnText}>Change Password</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const pwStyles = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:      { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 28 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: BRAND + '15', alignItems: 'center', justifyContent: 'center' },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 17, fontWeight: '700', color: TEXT },
  subtitle:   { fontSize: 12, color: MUTED, marginTop: 1 },
  label:      { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: BG, gap: 10 },
  input:      { flex: 1, fontSize: 14, color: TEXT },
  errorBox:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 },
  error:      { fontSize: 13, color: DANGER, flex: 1 },
  saveBtn:    { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Edit Profile Modal ─────────────────────────────────────────────────────────

function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, setUser } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName]   = useState(user?.lastName ?? '');
  const [phone, setPhone]         = useState(user?.phone ?? '');
  const [location, setLocation]   = useState(user?.locationLabel ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');

  const handleOpen = () => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
    setLocation(user?.locationLabel ?? '');
    setAvatarUrl(user?.avatarUrl ?? '');
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      profileApi.update({
        firstName:     firstName.trim(),
        lastName:      lastName.trim(),
        phone:         phone.trim() || undefined,
        locationLabel: location.trim() || undefined,
        avatarUrl:     avatarUrl.trim() || undefined,
      }),
    onSuccess: (updatedUser) => {
      if (user) {
        setUser({
          ...user,
          firstName:     updatedUser.firstName,
          lastName:      updatedUser.lastName,
          phone:         updatedUser.phone         ?? undefined,
          locationLabel: updatedUser.locationLabel ?? undefined,
          avatarUrl:     updatedUser.avatarUrl     ?? undefined,
        });
      }
      onClose();
    },
    onError: () => Alert.alert('Error', 'Could not update profile. Please try again.'),
  });

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0 && !updateMutation.isPending;

  const fields: Array<{ label: string; placeholder: string; value: string; set: (v: string) => void; optional?: boolean; keyboard?: any; capitalize?: any; testID?: string }> = [
    { label: 'First Name',  placeholder: 'First name',          value: firstName, set: setFirstName, capitalize: 'words', testID: 'edit-first-name-input' },
    { label: 'Last Name',   placeholder: 'Last name',           value: lastName,  set: setLastName,  capitalize: 'words', testID: 'edit-last-name-input' },
    { label: 'Phone',       placeholder: '+60 12-345 6789',     value: phone,     set: setPhone,     optional: true, keyboard: 'phone-pad' },
    { label: 'Location',    placeholder: 'e.g. Kuala Lumpur',   value: location,  set: setLocation,  optional: true, capitalize: 'words' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={handleOpen}>
      <Pressable style={epStyles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={epStyles.sheet}>
        <View style={epStyles.handle} />
        <View style={epStyles.header}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={epStyles.previewAvatar} />
          ) : (
            <View style={epStyles.previewAvatarFallback}>
              <Text style={epStyles.previewAvatarText}>
                {[firstName[0] ?? '', lastName[0] ?? ''].join('').toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={epStyles.title}>Edit Profile</Text>
            <Text style={epStyles.subtitle}>Update your account information</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={epStyles.closeBtn}>
            <Ionicons name="close" size={20} color={MUTED} />
          </Pressable>
        </View>
        {fields.map((f) => (
          <View key={f.label} style={{ marginBottom: 14 }}>
            <Text style={epStyles.label}>
              {f.label}
              {f.optional && <Text style={epStyles.optional}> (optional)</Text>}
            </Text>
            <TextInput
              testID={f.testID}
              style={epStyles.input}
              value={f.value}
              onChangeText={f.set}
              placeholder={f.placeholder}
              placeholderTextColor={MUTED}
              keyboardType={f.keyboard ?? 'default'}
              autoCapitalize={f.capitalize ?? 'none'}
              returnKeyType="next"
            />
          </View>
        ))}
        <View style={{ marginBottom: 14 }}>
          <Text style={epStyles.label}>Profile Photo URL <Text style={epStyles.optional}>(optional)</Text></Text>
          <TextInput
            style={epStyles.input}
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="https://example.com/photo.jpg"
            placeholderTextColor={MUTED}
            keyboardType="url"
            autoCapitalize="none"
            returnKeyType="done"
          />
        </View>
        <TouchableOpacity
          testID="edit-save-button"
          style={[epStyles.submitBtn, !canSubmit && epStyles.submitBtnDisabled]}
          onPress={() => updateMutation.mutate()}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {updateMutation.isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={epStyles.submitBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const epStyles = StyleSheet.create({
  backdrop:             { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:                { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: 12 },
  handle:               { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  header:               { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  previewAvatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: BORDER },
  previewAvatarFallback:{ width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  previewAvatarText:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  closeBtn:             { width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  title:                { fontSize: 17, fontWeight: '700', color: TEXT },
  subtitle:             { fontSize: 12, color: MUTED, marginTop: 1 },
  label:                { fontSize: 12, fontWeight: '600', color: TEXT, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  optional:             { color: MUTED, fontWeight: '400', textTransform: 'none' },
  input:                { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14, color: TEXT },
  submitBtn:            { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  submitBtnDisabled:    { opacity: 0.5 },
  submitBtnText:        { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  bg: string;
  fg: string;
  onPress: () => void;
};

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const qc               = useQueryClient();
  const [editOpen, setEditOpen]             = useState(false);
  const [pwModalVisible, setPwModalVisible] = useState(false);

  const {
    data: settings = [],
    isLoading: settingsLoading,
    refetch: refetchSettings,
    isRefetching: isRefetchingSettings,
  } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  const updateSetting = useMutation({
    mutationFn: (payload: UpdateSettingDto) => settingsApi.update(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['settings'] }),
    onError:    () => Alert.alert('Error', 'Could not update setting. Please try again.'),
  });

  const registerPushToken = useCallback(async () => {
    if (!Device.isDevice) return;
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      Alert.alert('Push notifications unavailable', 'Use a development build to receive push notifications.');
      return;
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Enable push notifications in your device Settings.');
      return;
    }
    try {
      const projectId = (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? '';
      const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      await pushApi.registerToken({ token: tokenData.data, platform: Platform.OS as 'android' | 'ios' });
    } catch (e) {
      console.error('Push registration failed', e);
    }
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  if (!user) return null;

  const initials = getInitials(user.firstName, user.lastName);
  const fullName = `${user.firstName} ${user.lastName}`;

  const menuItems: MenuItem[] = [
    { icon: 'person-outline',            label: 'Edit Profile',       bg: BRAND + '15', fg: BRAND,    onPress: () => setEditOpen(true) },
    { icon: 'lock-closed-outline',       label: 'Change Password',    bg: '#EEF2FF',    fg: '#4F46E5', onPress: () => setPwModalVisible(true) },
    { icon: 'shield-checkmark-outline',  label: 'Privacy & Security', bg: '#ECFDF5',    fg: SUCCESS,  onPress: () => Alert.alert('Privacy & Security', 'Your data is securely stored and never shared with third parties. FloodWatch collects location data only when you submit an incident report.') },
    { icon: 'help-buoy-outline',          label: 'Safety Tips',        bg: '#FFF7ED',    fg: '#EA580C', onPress: () => router.push('/(app)/safety' as any) },
    { icon: 'help-circle-outline',       label: 'Help & Support',     bg: '#F5F3FF',    fg: '#7C3AED', onPress: () => Alert.alert('Help & Support', 'For assistance, contact us at support@floodwatch.my or visit community.floodwatch.my/help') },
    { icon: 'information-circle-outline',label: 'About FloodWatch',   bg: BG,           fg: MUTED,    onPress: () => Alert.alert('About FloodWatch', 'FloodWatch Community v1.0.0\n\nA real-time flood monitoring and community platform built for Malaysians.\n\n© 2026 FloodWatch. All rights reserved.') },
  ];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetchingSettings} onRefresh={refetchSettings} tintColor={BRAND} colors={[BRAND]} />
        }
      >
        {/* ── Hero profile card ─────────────────────────────────────────── */}
        <View style={s.heroCard}>
          {/* Blue banner */}
          <View style={s.heroBanner} />

          {/* Avatar */}
          <View style={s.avatarContainer}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarWrap}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity testID="edit-profile-button" style={s.avatarEditBtn} onPress={() => setEditOpen(true)} activeOpacity={0.8}>
              <Ionicons name="pencil" size={12} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Identity */}
          <Text testID="profile-name" style={s.heroName}>{fullName}</Text>
          <Text testID="profile-email" style={s.heroEmail}>{user.email}</Text>

          {/* Role badge */}
          <View style={[s.roleBadge, user.role === 'admin' && s.roleBadgeAdmin]}>
            <Ionicons
              name={user.role === 'admin' ? 'shield-checkmark' : 'people'}
              size={13}
              color={user.role === 'admin' ? '#7C3AED' : BRAND}
            />
            <Text style={[s.roleText, user.role === 'admin' && s.roleTextAdmin]}>
              {user.role === 'admin' ? 'Administrator' : 'Community Member'}
            </Text>
          </View>

          {/* Optional meta chips */}
          <View style={s.metaChips}>
            {!!user.phone && (
              <View style={s.metaChip}>
                <Ionicons name="call-outline" size={12} color={MUTED} />
                <Text style={s.metaChipText}>{user.phone}</Text>
              </View>
            )}
            {!!user.locationLabel && (
              <View style={s.metaChip}>
                <Ionicons name="location-outline" size={12} color={MUTED} />
                <Text style={s.metaChipText}>{user.locationLabel}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Notifications ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Notifications</Text>
          <View style={s.card}>
            {settingsLoading ? (
              <ActivityIndicator color={BRAND} style={{ padding: 28 }} />
            ) : settings.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="notifications-off-outline" size={28} color={MUTED} />
                <Text style={s.emptyText}>No notification settings available.</Text>
              </View>
            ) : (
              settings.map((setting, i) => {
                const { icon, label, desc, color } = resolveNotif(setting.key, setting.label ?? '');
                return (
                  <View key={setting.key}>
                    <View style={s.settingRow}>
                      <View style={[s.notifIcon, { backgroundColor: color + '18' }]}>
                        <Ionicons name={icon} size={18} color={color} />
                      </View>
                      <View style={s.settingInfo}>
                        <Text style={s.settingLabel}>{label}</Text>
                        <Text style={s.settingDesc}>{desc}</Text>
                      </View>
                      <Switch
                        value={setting.enabled}
                        onValueChange={(enabled) => {
                          updateSetting.mutate({ key: setting.key, enabled });
                          if (enabled && setting.key === 'push_notifications') registerPushToken();
                        }}
                        trackColor={{ false: BORDER, true: BRAND }}
                        thumbColor="#fff"
                        ios_backgroundColor={BORDER}
                        disabled={updateSetting.isPending}
                      />
                    </View>
                    {i < settings.length - 1 && <View style={s.divider} />}
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* ── Account ────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Account</Text>
          <View style={s.card}>
            {menuItems.map((item, i) => (
              <View key={item.label}>
                <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={item.onPress}>
                  <View style={[s.menuIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={18} color={item.fg} />
                  </View>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={BORDER} />
                </TouchableOpacity>
                {i < menuItems.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* ── Sign out ───────────────────────────────────────────────────── */}
        <TouchableOpacity testID="logout-button" style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={DANGER} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>FloodWatch Community v1.0.0</Text>
      </ScrollView>

      <EditProfileModal    visible={editOpen}         onClose={() => setEditOpen(false)} />
      <ChangePasswordModal visible={pwModalVisible}   onClose={() => setPwModalVisible(false)} />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 48, gap: 16 },

  // Hero card
  heroCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 12,
  },
  heroBanner: {
    width: '100%',
    height: 90,
    backgroundColor: BRAND,
  },
  avatarContainer: {
    marginTop: -44,
    marginBottom: 12,
    position: 'relative',
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: CARD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: CARD,
  },
  avatarText:    { fontSize: 30, fontWeight: '800', color: '#fff' },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BRAND,
    borderWidth: 2,
    borderColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName:  { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  heroEmail: { fontSize: 13, color: MUTED, marginTop: 2, marginBottom: 10 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND + '15',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  roleBadgeAdmin: { backgroundColor: '#F5F3FF' },
  roleText:       { fontSize: 13, fontWeight: '700', color: BRAND },
  roleTextAdmin:  { color: '#7C3AED' },
  metaChips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingHorizontal: 16 },
  metaChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BG, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  metaChipText: { fontSize: 12, color: MUTED },

  // Section
  section:      { gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: TEXT, marginLeft: 4 },

  // Card shell
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  // Notification row
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  notifIcon:  { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingInfo:  { flex: 1, gap: 2 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: TEXT },
  settingDesc:  { fontSize: 12, color: MUTED },

  // Menu row
  menuRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon:   { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuLabel:  { fontSize: 14, fontWeight: '500', color: TEXT, flex: 1 },

  // Shared
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },
  emptyBox:  { alignItems: 'center', padding: 28, gap: 8 },
  emptyText: { fontSize: 13, color: MUTED, textAlign: 'center' },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DANGER + '30',
    paddingVertical: 15,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: DANGER },
  version:     { textAlign: 'center', fontSize: 12, color: MUTED },
});
