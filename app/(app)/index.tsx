/**
 * Unified index screen — routes by role:
 *   customer → FeedScreen   (community posts, orange theme)
 *   admin    → AdminDashboardScreen (CRM live stats, dark theme)
 */

// ─── Community Feed (customer) ───────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity, TextInput, Modal, KeyboardAvoidingView,
  Platform, Alert, Pressable, ScrollView, GestureResponderEvent, Share, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useInfiniteQuery, useMutation, useQueryClient, useQuery,
  type InfiniteData,
} from '@tanstack/react-query';
import { postsApi, groupsApi, dashboardApi, analyticsApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import type { PostDto, PageDto, DashboardNodeRowDto, FloodLevel } from '@/src/api/types';

// ── Admin UI components (dark theme) ─────────────────────────────────────────
import ScreenHeader from '@/src/components/ui/ScreenHeader';
import StatCard from '@/src/components/ui/StatCard';
import NodeCard from '@/src/components/ui/NodeCard';
import EmptyState from '@/src/components/ui/EmptyState';
import {
  colors as ac,
  spacing as asp,
  typography as aty,
  radius as ar,
  shadow as ash,
} from '@/src/theme/admin';

// ── Community colours ─────────────────────────────────────────────────────────
const BRAND  = '#1d4ed8';
const BG     = '#eef2ff';
const CARD   = '#FFFFFF';
const BORDER = '#e2e8f0';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';

// ═════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase();
}

const AVATAR_PALETTE = ['#1d4ed8', '#0277BD', '#2E7D32', '#6A1B9A', '#AD1457', '#00838F', '#F57F17'];
function nameToColor(name: string): string {
  const code = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length]!;
}

function getGreeting(firstName?: string | null): string {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return firstName ? `${time}, ${firstName}` : 'FloodWatch';
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD SCREEN
// ═════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { AppState, type AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';

function mapRowToNode(row: DashboardNodeRowDto) {
  const levelMap: Record<string, number> = { Normal: 0, Watch: 1, Alert: 1, Warning: 2, Critical: 3 };
  return {
    id: row.id,
    nodeId: row.nodeId,
    name: row.name,
    area: row.area,
    location: '',
    state: '',
    latitude: 0,
    longitude: 0,
    currentLevel: (levelMap[row.status] ?? 0) as FloodLevel,
    status: (row.status === 'Offline' ? 'inactive' : row.status === 'Normal' ? 'active' : 'warning') as 'active' | 'warning' | 'inactive',
    isDead: row.status === 'Offline',
    lastUpdated: row.timestamp,
  };
}

function SummaryBar({ nodes }: { nodes: DashboardNodeRowDto[] }) {
  const counts = {
    normal:   nodes.filter((n) => n.status === 'Normal').length,
    watch:    nodes.filter((n) => n.status === 'Watch').length,
    warning:  nodes.filter((n) => n.status === 'Warning').length,
    critical: nodes.filter((n) => n.status === 'Critical').length,
    offline:  nodes.filter((n) => n.status === 'Offline').length,
  };
  const items = [
    { label: 'Normal',   count: counts.normal,   color: ac.status.normal },
    { label: 'Alert',    count: counts.watch,    color: ac.status.watch },
    { label: 'Warning',  count: counts.warning,  color: ac.status.warning },
    { label: 'Critical', count: counts.critical, color: ac.status.critical },
    { label: 'Offline',  count: counts.offline,  color: ac.status.offline },
  ];
  return (
    <View style={adminBar.container}>
      {items.map((item) => (
        <View key={item.label} style={adminBar.item}>
          <Text style={[adminBar.count, { color: item.color }]}>{item.count}</Text>
          <Text style={adminBar.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const adminBar = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: ac.card,
    borderRadius: ar.lg,
    borderWidth: 1,
    borderColor: ac.border,
    marginHorizontal: asp.base,
    marginBottom: asp.base,
    ...ash.light,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: asp.sm + 2, gap: 2 },
  count: { fontSize: 18, fontWeight: '800' },
  label: { ...aty.caption },
});

function AdminDashboardScreen() {
  const [showAll, setShowAll] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [isActive, setIsActive] = useState(true);
  const refetchRef = useRef<() => void>(() => {});

  const { data: nodes, isLoading, isError: nodesError, refetch, isRefetching, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-nodes'],
    queryFn: dashboardApi.getNodes,
    refetchInterval: isActive ? 1_000 : false,
  });

  React.useEffect(() => {
    if (dataUpdatedAt) setLastFetchTime(new Date(dataUpdatedAt).toLocaleTimeString('en-MY'));
  }, [dataUpdatedAt]);

  refetchRef.current = refetch;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appState.current !== 'active';
      appState.current = nextState;
      const nowActive = nextState === 'active';
      setIsActive(nowActive);
      if (wasBackground && nowActive) refetchRef.current();
    });
    return () => sub.remove();
  }, []);

  useQuery({ queryKey: ['analytics'], queryFn: analyticsApi.get, staleTime: 60_000 });

  const total    = nodes?.length ?? 0;
  const critical = nodes?.filter((n) => n.status === 'Critical').length ?? 0;
  const offline  = nodes?.filter((n) => n.status === 'Offline').length ?? 0;
  const online   = total - offline;
  const displayed = showAll ? (nodes ?? []) : (nodes ?? []).slice(0, 6);

  return (
    <View style={{ flex: 1, backgroundColor: ac.background }}>
      <ScreenHeader title="Dashboard" subtitle="Live sensor overview" rightAction={{ icon: 'refresh-outline', onPress: refetch }} />
      <ScrollView
        testID="dashboard-view"
        contentContainerStyle={{ paddingTop: asp.base, paddingBottom: asp.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={ac.primary} />}
      >
        {/* Stat grid */}
        <View style={adminStyles.statsGrid}>
          <StatCard title="Total Nodes" value={total} helper="Registered nodes" icon="radio-outline" style={adminStyles.statHalf} />
          <StatCard title="Online" value={online} helper="Active & reporting" icon="checkmark-circle-outline" accentColor={ac.status.normal} style={adminStyles.statHalf} />
          <StatCard title="Critical" value={critical} helper={critical > 0 ? 'Action needed' : 'No criticals'} icon="flame-outline" accentColor={critical > 0 ? ac.status.critical : ac.textMuted} style={adminStyles.statHalf} />
          <StatCard title="Offline" value={offline} helper={offline > 0 ? 'Not responding' : 'All reporting'} icon="wifi-outline" accentColor={offline > 0 ? ac.status.offline : ac.textMuted} style={adminStyles.statHalf} />
        </View>

        {nodes && nodes.length > 0 && <SummaryBar nodes={nodes} />}

        {/* Node list */}
        <View style={{ paddingHorizontal: asp.base }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: asp.sm }}>
            <Text style={{ ...aty.h3, fontSize: 15 }}>Sensor Nodes</Text>
            {(nodes?.length ?? 0) > 6 && (
              <TouchableOpacity onPress={() => setShowAll((v) => !v)}>
                <Text style={{ fontSize: 13, color: ac.primary, fontWeight: '600' }}>{showAll ? 'Show less' : `See all (${total})`}</Text>
              </TouchableOpacity>
            )}
          </View>
          {isLoading ? (
            <ActivityIndicator color={ac.primary} style={{ marginTop: asp.xl }} />
          ) : nodesError ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <EmptyState icon="cloud-offline-outline" title="Could not load nodes" message="Check your connection." />
              <TouchableOpacity
                style={{ backgroundColor: ac.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 }}
                onPress={() => refetch()}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : displayed.length === 0 ? (
            <EmptyState icon="radio-outline" title="No nodes found" message="No sensor nodes are registered yet." />
          ) : (
            <View style={{ gap: asp.sm }}>
              {displayed.map((row) => (
                <NodeCard key={row.id} node={mapRowToNode(row)} onPress={() => router.push({ pathname: '/(app)/sensors', params: { highlight: row.nodeId } })} />
              ))}
            </View>
          )}
        </View>

        <Text style={{ ...aty.caption, textAlign: 'center', marginTop: asp.xl, marginBottom: asp.sm }}>
          Auto-refreshes every 1s · Last fetch: {lastFetchTime ?? '—'}
        </Text>
      </ScrollView>
    </View>
  );
}

const adminStyles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: asp.base, gap: asp.sm, marginBottom: asp.base },
  statHalf: { width: '47.5%' },
});

// ═════════════════════════════════════════════════════════════════════════════
// CUSTOMER FEED SCREEN
// ═════════════════════════════════════════════════════════════════════════════

interface PostCardProps {
  post: PostDto;
  onLike: (id: string) => void;
  onPress: () => void;
}

const PostCard = React.memo(function PostCard({ post, onLike, onPress }: PostCardProps) {
  const stopProp = (e: GestureResponderEvent) => e.stopPropagation();

  const handleShare = async (e: GestureResponderEvent) => {
    stopProp(e);
    try {
      await Share.share({
        message: `Check out this post on FloodWatch: ${post.title || ''}`,
        url: `https://floodwatch.my/post/${post.id}`,
      });
    } catch (_) { /* ignore dismissals */ }
  };

  const avatarColor = nameToColor(post.authorName);

  return (
    <View style={feedStyles.card} testID="post-card">
      <Pressable onPress={onPress} android_ripple={{ color: 'rgba(0,0,0,0.04)', borderless: false }} style={{ gap: 10 }}>
        <View style={feedStyles.cardHeader}>
          <View style={[feedStyles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={feedStyles.avatarText}>{getInitials(post.authorName)}</Text>
          </View>
          <View style={feedStyles.cardMeta}>
            <Text style={feedStyles.authorName}>{post.authorName}</Text>
            <View style={feedStyles.metaSubRow}>
              {!!post.groupName && (
                <View style={[feedStyles.groupPill, { backgroundColor: nameToColor(post.groupName) + '20' }]}>
                  <Text style={[feedStyles.groupPillText, { color: nameToColor(post.groupName) }]}>
                    g/{post.groupName}
                  </Text>
                </View>
              )}
              <Text style={feedStyles.metaSub}>
                {!post.groupName ? 'FloodWatch  ·  ' : '  ·  '}{timeAgo(post.createdAt)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={feedStyles.cardTitle}>{post.title}</Text>
        {!!post.content && <Text style={feedStyles.cardContent} numberOfLines={3}>{post.content}</Text>}
      </Pressable>
      <View style={feedStyles.cardActions}>
        <TouchableOpacity style={feedStyles.actionBtn} onPress={(e) => { stopProp(e); onLike(post.id); }} activeOpacity={0.7}>
          <Ionicons name={post.likedByMe ? 'heart' : 'heart-outline'} size={15} color={post.likedByMe ? BRAND : MUTED} />
          <Text style={[feedStyles.actionText, post.likedByMe && { color: BRAND }]}>{Math.max(0, post.likesCount)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={feedStyles.actionBtn} onPress={(e) => { stopProp(e); router.push(`/(app)/post/${post.id}` as any); }} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={15} color={MUTED} />
          <Text style={feedStyles.actionText}>{post.commentsCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={feedStyles.actionBtn} onPress={handleShare} activeOpacity={0.7} accessibilityLabel="Share post" accessibilityRole="button">
          <Ionicons name="share-social-outline" size={15} color={MUTED} />
          <Text style={feedStyles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

function CustomerFeedScreen() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const listRef  = useRef<FlatList<PostDto>>(null);
  const navigation = useNavigation();
  const [createVisible, setCreateVisible] = useState(false);
  const [postTitle, setPostTitle]   = useState('');
  const [postContent, setPostContent] = useState('');
  const [sort, setSort]             = useState<'new' | 'top'>('new');
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch, isRefetching, isError } =
    useInfiniteQuery<PageDto<PostDto>, Error, InfiniteData<PageDto<PostDto>>, string[], number>({
      queryKey: ['posts', sort],
      queryFn: ({ pageParam }) => postsApi.getAll(pageParam as number, 20, sort),
      getNextPageParam: (last) => (last.number + 1) < last.totalPages ? last.number + 1 : undefined,
      initialPageParam: 0,
    });

  const { data: groups } = useQuery({ queryKey: ['groups'], queryFn: groupsApi.getAll });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => postsApi.toggleLike(postId),
    onMutate: async (postId) => {
      const activeSort = sort;
      await qc.cancelQueries({ queryKey: ['posts', activeSort] });
      const prev = qc.getQueryData<InfiniteData<PageDto<PostDto>>>(['posts', activeSort]);
      qc.setQueryData<InfiniteData<PageDto<PostDto>>>(['posts', activeSort], (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((page) => ({ ...page, content: page.content.map((p) =>
          p.id === postId ? { ...p, likedByMe: !p.likedByMe, likesCount: Math.max(0, p.likedByMe ? p.likesCount - 1 : p.likesCount + 1) } : p
        ) })) };
      });
      return { prev, sort: activeSort };
    },
    onError: (_err, _id, ctx) => { if (ctx?.prev) qc.setQueryData(['posts', ctx.sort], ctx.prev); Alert.alert('Error', 'Could not like post.'); },
    onSettled: (_data, _error, _id, ctx) => qc.invalidateQueries({ queryKey: ['posts', ctx?.sort ?? sort] }),
  });

  const createMutation = useMutation({
    mutationFn: () => postsApi.create({ title: postTitle.trim(), content: postContent.trim(), ...(selectedGroup ? { groupSlug: selectedGroup } : {}) }),
    onSuccess: () => { setCreateVisible(false); setPostTitle(''); setPostContent(''); setSelectedGroup(undefined); qc.invalidateQueries({ queryKey: ['posts'] }); },
    onError: () => Alert.alert('Error', 'Could not create post. Please try again.'),
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress' as any, () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

  const posts = data?.pages.flatMap((p) => p.content ?? []) ?? [];
  const handleLike = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likeMutation.mutate(id);
  }, [likeMutation]);
  const handleCreate = () => { if (!postTitle.trim()) { Alert.alert('Required', 'Please enter a title.'); return; } createMutation.mutate(); };
  const userInitials = user ? getInitials(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'User') : '?';

  return (
    <SafeAreaView style={feedStyles.screen} edges={['top']}>
      <View style={feedStyles.topBar}>
        <View style={feedStyles.topLogo}>
          <Image source={require('@/assets/images/icon.png')} style={{ width: 30, height: 30, borderRadius: 6 }} resizeMode="contain" />
          <View>
            <Text style={feedStyles.logoText}>{getGreeting(user?.firstName)}</Text>
            <Text style={feedStyles.logoSub}>Stay informed, stay safe.</Text>
          </View>
        </View>
        <TouchableOpacity style={feedStyles.topBtn} onPress={() => router.push('/(app)/alerts')} activeOpacity={0.75}>
          <Ionicons name="notifications-outline" size={22} color={TEXT} />
        </TouchableOpacity>
      </View>

      <FlatList
        testID="post-feed"
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} onLike={handleLike} onPress={() => router.push(`/(app)/post/${item.id}` as any)} />}
        contentContainerStyle={feedStyles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} colors={[BRAND]} />}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        initialNumToRender={10}
        windowSize={5}
        ListHeaderComponent={
          <View>
            <TouchableOpacity testID="create-post-bar" style={feedStyles.createBar} onPress={() => user && setCreateVisible(true)} activeOpacity={0.85}>
              <View style={feedStyles.createAvatar}><Text style={feedStyles.createAvatarText}>{userInitials}</Text></View>
              <View style={feedStyles.createInputFake}>
                <Text style={feedStyles.createPlaceholder}>{user ? 'Share a flood update…' : 'Sign in to share updates'}</Text>
              </View>
            </TouchableOpacity>

            <View style={feedStyles.sortRow}>
              {(['new', 'top'] as const).map(s => (
                <TouchableOpacity key={s} style={[feedStyles.sortTab, sort === s && feedStyles.sortTabActive]} onPress={() => setSort(s)} activeOpacity={0.8}>
                  <Ionicons name={s === 'new' ? 'time-outline' : 'trending-up-outline'} size={13} color={sort === s ? BRAND : MUTED} />
                  <Text style={[feedStyles.sortTabText, sort === s && feedStyles.sortTabTextActive]}>{s === 'new' ? 'New' : 'Top'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={feedStyles.sectionLabel}>Latest Posts</Text>

            {isLoading && <ActivityIndicator size="large" color={BRAND} style={{ marginTop: 40, marginBottom: 20 }} />}
            {!isLoading && isError && (
              <View style={feedStyles.emptyState}>
                <Ionicons name="cloud-offline-outline" size={44} color={MUTED} />
                <Text style={feedStyles.emptyTitle}>Could not load posts</Text>
                <Text style={feedStyles.emptyDesc}>Check your connection and try again.</Text>
                <TouchableOpacity style={feedStyles.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
                  <Text style={feedStyles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            {!isLoading && !isError && posts.length === 0 && (
              <View style={feedStyles.emptyState}>
                <Ionicons name="water-outline" size={44} color={BRAND} />
                <Text style={feedStyles.emptyTitle}>No posts yet</Text>
                <Text style={feedStyles.emptyDesc}>Be the first to share a flood update!</Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={BRAND} style={{ padding: 16 }} /> : null}
      />

      {/* Create post modal */}
      <Modal visible={createVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={feedStyles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={feedStyles.modalBackdrop} onPress={() => setCreateVisible(false)} />
          <View style={feedStyles.modalSheet}>
            <View style={feedStyles.modalHandle} />
            <View style={feedStyles.modalHeader}>
              <Text style={feedStyles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => setCreateVisible(false)}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
            </View>
            <TextInput style={feedStyles.modalTitleInput} value={postTitle} onChangeText={setPostTitle} placeholder="Post title" placeholderTextColor={MUTED} maxLength={120} />
            {(groups ?? []).length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 2 }}>
                  <TouchableOpacity style={[feedStyles.groupChip, !selectedGroup && feedStyles.groupChipActive]} onPress={() => setSelectedGroup(undefined)} activeOpacity={0.8}>
                    <Text style={[feedStyles.groupChipText, !selectedGroup && feedStyles.groupChipTextActive]}>No group</Text>
                  </TouchableOpacity>
                  {(groups ?? []).map(g => (
                    <TouchableOpacity key={g.slug} style={[feedStyles.groupChip, selectedGroup === g.slug && feedStyles.groupChipActive]} onPress={() => setSelectedGroup(g.slug)} activeOpacity={0.8}>
                      <Text style={[feedStyles.groupChipText, selectedGroup === g.slug && feedStyles.groupChipTextActive]}>g/{g.slug}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
            <TextInput style={feedStyles.modalBodyInput} value={postContent} onChangeText={setPostContent} placeholder="Share your flood update, observations, or safety tips…" placeholderTextColor={MUTED} multiline numberOfLines={5} textAlignVertical="top" />
            <TouchableOpacity style={[feedStyles.modalBtn, createMutation.isPending && { opacity: 0.5 }]} onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.85}>
              {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={feedStyles.modalBtnText}>Post</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT — role switcher
// ═════════════════════════════════════════════════════════════════════════════

export default function IndexScreen() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'admin') return <AdminDashboardScreen />;
  return <CustomerFeedScreen />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed styles (community light theme)
// ─────────────────────────────────────────────────────────────────────────────
const feedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: BORDER },
  topLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: BRAND },
  logoText: { fontSize: 15, fontWeight: '700', color: TEXT },
  logoSub: { fontSize: 11, color: MUTED, marginTop: 1 },
  topBtn: { padding: 4 },
  listContent: { padding: 12, paddingBottom: 24, gap: 10 },
  createBar: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  createAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  createAvatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  createInputFake: { flex: 1, backgroundColor: BG, borderRadius: 20, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 9 },
  createPlaceholder: { fontSize: 14, color: MUTED },
  createImgBtn: { padding: 6, backgroundColor: BG, borderRadius: 8, borderWidth: 1, borderColor: BORDER },
  sortRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  sortTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  sortTabActive: { borderColor: BRAND, backgroundColor: BRAND },
  sortTabText: { fontSize: 13, fontWeight: '600', color: MUTED },
  sortTabTextActive: { color: '#fff' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginHorizontal: 2 },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  cardMeta: { flex: 1, gap: 3 },
  authorName: { fontSize: 14, fontWeight: '700', color: TEXT },
  metaSubRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  groupPill: { borderRadius: 9999, paddingHorizontal: 7, paddingVertical: 2 },
  groupPillText: { fontSize: 11, fontWeight: '600' },
  metaSub: { fontSize: 12, color: MUTED },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT, lineHeight: 22 },
  cardContent: { fontSize: 13, color: MUTED, lineHeight: 19 },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: BG },
  actionText: { fontSize: 12, fontWeight: '600', color: MUTED },
  emptyState: { alignItems: 'center', paddingVertical: 56, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyDesc: { fontSize: 13, color: MUTED, textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: BRAND, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 14 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  modalTitleInput: { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: TEXT, fontWeight: '600' },
  modalBodyInput: { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT, minHeight: 110 },
  modalBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  groupChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: BG },
  groupChipActive: { borderColor: BRAND, backgroundColor: BRAND + '15' },
  groupChipText: { fontSize: 12, color: MUTED, fontWeight: '600' },
  groupChipTextActive: { color: BRAND },
});
