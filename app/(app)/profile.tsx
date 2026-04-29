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
import Constants from 'expo-constants';
import { settingsApi, profileApi, pushApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import type { UpdateSettingDto } from '@/src/api/types';
import { client } from '@/src/api/client';

const BRAND  = '#1d4ed8';
const BG     = '#eef2ff';
const CARD   = '#FFFFFF';
const BORDER = '#e2e8f0';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(first = '', last = ''): string {
  return [first[0] ?? '', last[0] ?? '']
    .join('')
    .toUpperCase();
}

// ── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (next.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (next !== confirm) { setError('Passwords do not match.'); return; }
    setError(null);
    mutation.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={pwStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={pwStyles.sheet}>
          <View style={pwStyles.header}>
            <Text style={pwStyles.title}>Change Password</Text>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={TEXT} /></Pressable>
          </View>
          <Text style={pwStyles.label}>Current Password</Text>
          <View style={pwStyles.inputWrap}>
            <TextInput style={pwStyles.input} value={current} onChangeText={setCurrent} secureTextEntry={!showCurrent} placeholder="Current password" placeholderTextColor={MUTED} />
            <Pressable onPress={() => setShowCurrent(v => !v)} hitSlop={8}><Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} /></Pressable>
          </View>
          <Text style={pwStyles.label}>New Password</Text>
          <View style={pwStyles.inputWrap}>
            <TextInput style={pwStyles.input} value={next} onChangeText={setNext} secureTextEntry={!showNext} placeholder="New password (min 8 chars)" placeholderTextColor={MUTED} />
            <Pressable onPress={() => setShowNext(v => !v)} hitSlop={8}><Ionicons name={showNext ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} /></Pressable>
          </View>
          <Text style={pwStyles.label}>Confirm New Password</Text>
          <View style={pwStyles.inputWrap}>
            <TextInput style={pwStyles.input} value={confirm} onChangeText={setConfirm} secureTextEntry={!showConfirm} placeholder="Confirm new password" placeholderTextColor={MUTED} />
            <Pressable onPress={() => setShowConfirm(v => !v)} hitSlop={8}><Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} /></Pressable>
          </View>
          {error ? <Text style={pwStyles.error}>{error}</Text> : null}
          <TouchableOpacity style={[pwStyles.saveBtn, mutation.isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={mutation.isPending} activeOpacity={0.8}>
            {mutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={pwStyles.saveBtnText}>Change Password</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const pwStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: TEXT },
  label: { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: BG, marginBottom: 14, gap: 8 },
  input: { flex: 1, fontSize: 14, color: TEXT },
  error: { fontSize: 13, color: '#EF4444', marginBottom: 10 },
  saveBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Edit Profile Modal ────────────────────────────────────────────────────────

function EditProfileModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user, setUser } = useAuthStore();

  const [firstName, setFirstName]   = useState(user?.firstName ?? '');
  const [lastName, setLastName]     = useState(user?.lastName ?? '');
  const [phone, setPhone]           = useState(user?.phone ?? '');
  const [location, setLocation]     = useState(user?.locationLabel ?? '');
  // FEAT-S4-01: avatar URL field so users can set a profile photo
  const [avatarUrl, setAvatarUrl]   = useState(user?.avatarUrl ?? '');

  // Keep form in sync when modal opens with fresh user data
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
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        phone:     phone.trim() || undefined,
        locationLabel: location.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      }),
    onSuccess: (updatedUser) => {
      if (user) {
        setUser({
          ...user,
          firstName: updatedUser.firstName,
          lastName:  updatedUser.lastName,
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalSheet}
      >
        {/* Handle */}
        <View style={styles.modalHandle} />

        <Text style={styles.modalTitle}>Edit Profile</Text>
        <Text style={styles.modalSubtitle}>Update your account information.</Text>

        {/* First Name */}
        <Text style={styles.inputLabel}>First Name</Text>
        <TextInput
          style={styles.textInput}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          placeholderTextColor={MUTED}
          returnKeyType="next"
          autoCapitalize="words"
        />

        {/* Last Name */}
        <Text style={styles.inputLabel}>Last Name</Text>
        <TextInput
          style={styles.textInput}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          placeholderTextColor={MUTED}
          returnKeyType="next"
          autoCapitalize="words"
        />

        {/* Phone */}
        <Text style={styles.inputLabel}>Phone <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.textInput}
          value={phone}
          onChangeText={setPhone}
          placeholder="+60 12-345 6789"
          placeholderTextColor={MUTED}
          keyboardType="phone-pad"
          returnKeyType="next"
        />

        {/* Location */}
        <Text style={styles.inputLabel}>Location <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.textInput}
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Kuala Lumpur"
          placeholderTextColor={MUTED}
          returnKeyType="next"
          autoCapitalize="words"
        />

        {/* Profile Photo URL with preview */}
        <Text style={styles.inputLabel}>Profile Photo URL <Text style={styles.optional}>(optional)</Text></Text>
        {!!avatarUrl && (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 64, height: 64, borderRadius: 32, alignSelf: 'center', marginBottom: 10, backgroundColor: BORDER }}
            resizeMode="cover"
          />
        )}
        <TextInput
          style={styles.textInput}
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://example.com/photo.jpg"
          placeholderTextColor={MUTED}
          keyboardType="url"
          autoCapitalize="none"
          returnKeyType="done"
        />
        <Text style={{ fontSize: 11, color: MUTED, marginTop: -10, marginBottom: 14 }}>
          Enter a direct image URL for your profile photo
        </Text>

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={() => updateMutation.mutate()}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {updateMutation.isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitBtnText}>Save Changes</Text>
          }
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const qc               = useQueryClient();
  const [editOpen, setEditOpen]       = useState(false);
  const [pwModalVisible, setPwModalVisible] = useState(false);

  // UX-S4-01: expose refetch so RefreshControl can trigger it
  const {
    data: settings = [],
    isLoading: settingsLoading,
    refetch: refetchSettings,
    isRefetching: isRefetchingSettings,
  } = useQuery({
    queryKey: ['settings'],
    queryFn:  settingsApi.get,
  });

  const updateSetting = useMutation({
    mutationFn: (payload: UpdateSettingDto) => settingsApi.update(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['settings'] }),
    onError:    () =>
      Alert.alert('Error', 'Could not update setting. Please try again.'),
  });

  const registerPushToken = useCallback(async () => {
    if (!Device.isDevice) return; // simulators don't support push
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Push notifications were not enabled. You can enable them in your device Settings.');
      return;
    }
    try {
      const projectId =
        (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? '';
      const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      await pushApi.registerToken({ token: tokenData.data, platform: Platform.OS as 'android' | 'ios' });
    } catch (e) {
      console.error('Push registration failed', e);
    }
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  if (!user) return null;

  const initials = getInitials(user.firstName, user.lastName);
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingSettings}
            onRefresh={refetchSettings}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
      >
        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          {/* BUG-S4-04: show avatar photo if available, fallback to initials */}
          {user.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatarImg}
              onError={() => {/* fall through to initials via parent conditional */}}
            />
          ) : (
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {!!user.locationLabel && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={MUTED} />
              <Text style={styles.locationText}>{user.locationLabel}</Text>
            </View>
          )}
          <View style={styles.rolePill}>
            <Ionicons
              name={user.role === 'admin' ? 'shield-checkmark' : 'people'}
              size={12}
              color={BRAND}
            />
            <Text style={styles.roleText}>
              {user.role === 'admin' ? 'Administrator' : 'Community Member'}
            </Text>
          </View>
        </View>

        {/* ── Notification settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            {settingsLoading ? (
              <ActivityIndicator color={BRAND} style={{ padding: 24 }} />
            ) : settings.length === 0 ? (
              <View style={styles.emptySettings}>
                <Text style={styles.emptySettingsText}>
                  No notification settings available.
                </Text>
              </View>
            ) : (
              settings.map((setting, i) => (
                <View key={setting.key}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>{setting.label}</Text>
                    </View>
                    <Switch
                      value={setting.enabled}
                      onValueChange={(enabled) => {
                        updateSetting.mutate({ key: setting.key, enabled });
                        if (enabled && setting.key === 'push_notifications') {
                          registerPushToken();
                        }
                      }}
                      trackColor={{ false: BORDER, true: BRAND }}
                      thumbColor="#fff"
                      ios_backgroundColor={BORDER}
                      disabled={updateSetting.isPending}
                    />
                  </View>
                  {i < settings.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))
            )}
          </View>
        </View>

        {/* ── Account actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            {/* Edit Profile — opens modal */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => setEditOpen(true)}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name="person-outline" size={18} color={MUTED} />
                </View>
                <Text style={styles.menuLabel}>Edit Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={BORDER} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Change Password */}
            <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => setPwModalVisible(true)}>
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#4F46E5" />
                </View>
                <Text style={styles.menuLabel}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={BORDER} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Privacy & Security */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Privacy & Security', 'Your data is securely stored and never shared with third parties. FloodWatch collects location data only when you submit an incident report.')}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={MUTED} />
                </View>
                <Text style={styles.menuLabel}>Privacy & Security</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={BORDER} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Safety Tips */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Safety Tips"
              onPress={() => router.push('/(app)/safety' as any)}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={MUTED} />
                </View>
                <Text style={styles.menuLabel}>Safety Tips</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={BORDER} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Help & Support */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Help & Support', 'For assistance, contact us at support@floodwatch.my or visit community.floodwatch.my/help')}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name="help-circle-outline" size={18} color={MUTED} />
                </View>
                <Text style={styles.menuLabel}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={BORDER} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* About FloodWatch */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => Alert.alert('About FloodWatch', 'FloodWatch Community v1.0.0\n\nA real-time flood monitoring and community platform built for Malaysians.\n\n© 2026 FloodWatch. All rights reserved.')}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name="information-circle-outline" size={18} color={MUTED} />
                </View>
                <Text style={styles.menuLabel}>About FloodWatch</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={BORDER} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.appVersion}>FloodWatch Community v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal visible={editOpen} onClose={() => setEditOpen(false)} />

      {/* Change Password Modal */}
      <ChangePasswordModal visible={pwModalVisible} onClose={() => setPwModalVisible(false)} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: CARD,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: TEXT },

  scroll: { padding: 16, paddingBottom: 44, gap: 16 },

  // Profile card
  profileCard: {
    backgroundColor: CARD,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    padding: 24, alignItems: 'center', gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 3,
  },
  avatarWrap: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  // BUG-S4-04: avatar photo style — same dimensions as initials circle
  avatarImg: {
    width: 76, height: 76, borderRadius: 38,
    marginBottom: 10,
    backgroundColor: BORDER,
  },
  avatarText:   { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName:     { fontSize: 20, fontWeight: '800', color: TEXT },
  userEmail:    { fontSize: 14, color: MUTED },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 13, color: MUTED },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    marginTop: 8,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: BRAND },

  // Sections
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 1, textTransform: 'uppercase',
    marginHorizontal: 2,
  },

  // Card shell
  card: {
    backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
    elevation: 1,
  },

  // Settings row
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  settingInfo:  { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: TEXT },

  // Menu row
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 15, gap: 12,
  },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  menuLabel: { fontSize: 14, fontWeight: '500', color: TEXT },

  // Shared
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 14 },

  emptySettings: { padding: 20, alignItems: 'center' },
  emptySettingsText: { fontSize: 13, color: MUTED },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    backgroundColor: CARD,
    borderRadius: 14, borderWidth: 1, borderColor: '#EF444440',
    paddingVertical: 15,
    marginTop: 4,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  appVersion: {
    textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 4,
  },

  // Edit Profile Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 19 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6 },
  optional: { color: MUTED, fontWeight: '400' },

  textInput: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14,
    color: TEXT,
    marginBottom: 14,
  },

  submitBtn: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
