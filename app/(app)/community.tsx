/**
 * Community screen — groups, emergency contacts, community rules
 * Features: search, favourites, create group modal, star/share per group row
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking, TextInput, Modal,
  Share, Pressable, KeyboardAvoidingView, Platform, RefreshControl,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { groupsApi } from '@/src/api';
import type { GroupDto } from '@/src/api/types';

const BRAND  = '#1d4ed8';
const BG     = '#F4F6F9';
const CARD   = '#FFFFFF';
const BORDER = '#DDE3ED';
const TEXT   = '#1A1A2E';
const MUTED  = '#6B7280';

const FAV_GROUPS_KEY = 'fav_groups';

// ── Static data ───────────────────────────────────────────────────────────────

const GROUP_PALETTE = [
  '#1d4ed8', '#0277BD', '#2E7D32', '#6A1B9A', '#AD1457', '#00838F', '#F57F17',
];

function groupColor(index: number) {
  return GROUP_PALETTE[index % GROUP_PALETTE.length]!;
}

const EMERGENCY_CONTACTS = [
  { name: 'Civil Defence (APM)', number: '991' },
  { name: 'Police',              number: '999' },
  { name: 'Bomba (Fire)',        number: '994' },
  { name: 'JPS Flood Hotline',   number: '1800-88-2773' },
];

const COMMUNITY_RULES = [
  'Share accurate flood information only',
  'Be respectful and supportive to everyone',
  'No misinformation or fake alerts',
  'Include your location when reporting floods',
  'Credit sources when sharing official information',
];

// ── Slug generator ────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ── Group row ─────────────────────────────────────────────────────────────────

function GroupRow({
  group,
  index,
  isFav,
  onToggleFav,
}: {
  group: GroupDto;
  index: number;
  isFav: boolean;
  onToggleFav: (id: string) => void;
}) {
  const qc    = useQueryClient();
  const color = groupColor(index);

  const joinMutation = useMutation({
    mutationFn: () => groupsApi.toggleMembership(group.slug),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['groups'] }),
    onError:    () => Alert.alert('Error', 'Could not join group. Please try again.'),
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupsApi.toggleMembership(group.slug),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['groups'] }),
    onError:    () => Alert.alert('Error', 'Could not leave group. Please try again.'),
  });

  const busy = joinMutation.isPending || leaveMutation.isPending;

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Join "${group.name}" on FloodWatch: https://floodwatch.my/g/${group.slug}`,
      });
    } catch {
      // user dismissed
    }
  }, [group.name, group.slug]);

  // BUG-C01 (community screen): stop inner button presses from bubbling to the
  // outer Pressable nav handler on Android.
  const stopProp = (e: GestureResponderEvent) => e.stopPropagation();

  return (
    <Pressable
      style={styles.groupRow}
      onPress={() => router.push(`/(app)/g/${group.slug}` as any)}
      android_ripple={{ color: 'rgba(0,0,0,0.04)', borderless: false }}
    >
      <View style={[styles.groupIcon, { backgroundColor: color }]}>
        <Text style={styles.groupIconLetter}>
          {(group.name[0] ?? 'G').toUpperCase()}
        </Text>
      </View>

      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>g/{group.slug}</Text>
        <Text style={styles.groupMembers}>
          {group.membersCount.toLocaleString()} members
        </Text>
      </View>

      {/* Star / Fav */}
      <TouchableOpacity
        onPress={(e) => { stopProp(e); onToggleFav(group.id); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
        style={styles.iconBtn}
      >
        <Ionicons
          name={isFav ? 'star' : 'star-outline'}
          size={18}
          color={isFav ? '#F59E0B' : MUTED}
        />
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity
        onPress={(e) => { stopProp(e); void handleShare(); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
        style={styles.iconBtn}
      >
        <Ionicons name="share-outline" size={18} color={MUTED} />
      </TouchableOpacity>

      {/* Join / Leave */}
      {group.joinedByMe ? (
        <TouchableOpacity
          style={[styles.leaveBtn, busy && styles.btnBusy]}
          onPress={(e) => {
            stopProp(e);
            Alert.alert(
              'Leave Group',
              'Are you sure you want to leave this group?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
              ],
            );
          }}
          disabled={busy}
          activeOpacity={0.8}
        >
          {busy
            ? <ActivityIndicator size="small" color={MUTED} />
            : <Text style={styles.leaveBtnText}>Leave</Text>
          }
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.joinBtn, busy && styles.btnBusy]}
          onPress={(e) => { stopProp(e); joinMutation.mutate(); }}
          disabled={busy}
          activeOpacity={0.8}
        >
          {busy
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.joinBtnText}>Join</Text>
          }
        </TouchableOpacity>
      )}
    </Pressable>
  );
}

// ── Create Group Modal ────────────────────────────────────────────────────────

function CreateGroupModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const [name, setName]        = useState('');
  const [slug, setSlug]        = useState('');
  const [desc, setDesc]        = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => groupsApi.create({ name: name.trim(), slug: slug.trim(), description: desc.trim() || undefined }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      handleClose();
    },
    onError: () => Alert.alert('Error', 'Could not create group. Please try again.'),
  });

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(slugify(val));
  };

  const handleSlugChange = (val: string) => {
    setSlugEdited(true);
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleClose = () => {
    setName('');
    setSlug('');
    setDesc('');
    setSlugEdited(false);
    onClose();
  };

  const canSubmit = name.trim().length > 0 && slug.trim().length > 0 && !createMutation.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={handleClose} />
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Create Group</Text>
          <Text style={styles.modalSubtitle}>Start a new community group for FloodWatch members.</Text>

          {/* Name */}
          <Text style={styles.inputLabel}>Group Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={handleNameChange}
            placeholder="e.g. Kuala Lumpur Flood Watch"
            placeholderTextColor={MUTED}
            maxLength={60}
            returnKeyType="next"
          />

          {/* Slug */}
          <Text style={styles.inputLabel}>Slug <Text style={styles.required}>*</Text></Text>
          <View style={styles.slugInputWrap}>
            <Text style={styles.slugPrefix}>g/</Text>
            <TextInput
              style={[styles.textInput, styles.slugInput]}
              value={slug}
              onChangeText={handleSlugChange}
              placeholder="kl-flood-watch"
              placeholderTextColor={MUTED}
              maxLength={40}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Description */}
          <Text style={styles.inputLabel}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={desc}
            onChangeText={setDesc}
            placeholder="What is this group about?"
            placeholderTextColor={MUTED}
            maxLength={200}
            multiline
            numberOfLines={3}
            returnKeyType="done"
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={() => createMutation.mutate()}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {createMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.submitBtnText}>Create Group</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const [searchQuery, setSearchQuery]   = useState('');
  const [createOpen, setCreateOpen]     = useState(false);
  const [favGroups, setFavGroups]       = useState<string[]>([]);

  const { data: groups = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['groups'],
    queryFn:  groupsApi.getAll,
  });

  // Load favourites from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(FAV_GROUPS_KEY).then((raw) => {
      if (raw) {
        try { setFavGroups(JSON.parse(raw)); } catch { /* ignore */ }
      }
    });
  }, []);

  const toggleFav = useCallback(async (id: string) => {
    setFavGroups((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      AsyncStorage.setItem(FAV_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Filter groups by search query
  const filteredGroups = groups.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.name.toLowerCase().includes(q) || g.slug.toLowerCase().includes(q);
  });

  const favouriteGroups = filteredGroups.filter((g) => favGroups.includes(g.id));
  const allGroups       = filteredGroups;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
      >
        {/* Hero banner */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="location" size={22} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>FloodWatch Community</Text>
          <Text style={styles.heroDesc}>
            A space for Malaysians to share real-time flood updates, safety tips,
            and support one another during floods.
          </Text>
        </View>

        {/* ── Favourites section ── */}
        {favouriteGroups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Favourites</Text>
              <Ionicons name="star" size={14} color="#F59E0B" />
            </View>
            <View style={styles.card}>
              {favouriteGroups.map((group, i) => (
                <View key={group.id}>
                  <GroupRow
                    group={group}
                    index={groups.indexOf(group)}
                    isFav={true}
                    onToggleFav={toggleFav}
                  />
                  {i < favouriteGroups.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Communities ── */}
        <View style={styles.section}>
          {/* Section header with "New Group" button */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Communities</Text>
              {groups.length > 0 && (
                <Text style={styles.sectionCount}>{groups.length} groups</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.newGroupBtn}
              onPress={() => setCreateOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.newGroupBtnText}>New Group</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={MUTED} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search groups..."
              placeholderTextColor={MUTED}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && Platform.OS === 'android' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={16} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            {isLoading ? (
              <ActivityIndicator color={BRAND} style={{ padding: 24 }} />
            ) : isError ? (
              <TouchableOpacity style={styles.emptyCard} onPress={() => refetch()} activeOpacity={0.7}>
                <Text style={styles.emptyIcon}>⚠️</Text>
                <Text style={[styles.emptyText, { color: BRAND }]}>Connection error. Tap to retry</Text>
              </TouchableOpacity>
            ) : allGroups.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No groups match your search' : 'No groups available yet'}
                </Text>
              </View>
            ) : (
              allGroups.map((group, i) => (
                <View key={group.id}>
                  <GroupRow
                    group={group}
                    index={i}
                    isFav={favGroups.includes(group.id)}
                    onToggleFav={toggleFav}
                  />
                  {i < allGroups.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))
            )}
          </View>
        </View>

        {/* ── Emergency Contacts ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <View style={styles.card}>
            {EMERGENCY_CONTACTS.map((c, i) => (
              <View key={c.name}>
                <View style={styles.contactRow}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${c.number}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.contactNumber}>{c.number}</Text>
                  </TouchableOpacity>
                </View>
                {i < EMERGENCY_CONTACTS.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ── Community Rules ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Rules</Text>
          <View style={styles.card}>
            {COMMUNITY_RULES.map((rule, i) => (
              <View key={i} style={styles.ruleRow}>
                <View style={styles.ruleNumBadge}>
                  <Text style={styles.ruleNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Create Group Modal */}
      <CreateGroupModal visible={createOpen} onClose={() => setCreateOpen(false)} />
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

  scroll: { padding: 16, paddingBottom: 36, gap: 16 },

  // Hero
  hero: {
    backgroundColor: BRAND,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  heroIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 20 },

  // Section
  section: { gap: 10 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  sectionCount: { fontSize: 12, color: MUTED },

  // New Group button
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newGroupBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    padding: 0,
    margin: 0,
  },

  // Card shell
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  // Group row
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  groupIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  groupIconLetter: { fontSize: 16, fontWeight: '800', color: '#fff' },
  groupInfo:    { flex: 1, gap: 2 },
  groupName:    { fontSize: 14, fontWeight: '700', color: TEXT },
  groupMembers: { fontSize: 12, color: MUTED },

  iconBtn: { padding: 4 },

  joinBtn: {
    backgroundColor: BRAND,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 56,
    alignItems: 'center',
  },
  joinBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  leaveBtn: {
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 56,
    alignItems: 'center',
  },
  leaveBtnText: { fontSize: 12, fontWeight: '700', color: MUTED },
  btnBusy: { opacity: 0.5 },

  // Contact row
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
  },
  contactName:   { fontSize: 14, color: TEXT, flex: 1 },
  contactNumber: { fontSize: 14, fontWeight: '700', color: BRAND },

  // Rule row
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12,
    gap: 12,
  },
  ruleNumBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  ruleNumText: { fontSize: 11, fontWeight: '800', color: BRAND },
  ruleText:    { flex: 1, fontSize: 14, color: TEXT, lineHeight: 21 },

  // Shared
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 14 },

  emptyCard: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 14, color: MUTED },

  // Modal
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
  required: { color: BRAND },
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
  textArea: {
    height: 80,
    paddingTop: 10,
  },
  slugInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingLeft: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  slugPrefix: { fontSize: 14, color: MUTED, fontWeight: '600' },
  slugInput: {
    flex: 1,
    margin: 0,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    marginBottom: 0,
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
