/**
 * Admin Community screen — community moderation panel (hidden tab)
 * Accessible via More screen → Community Moderation
 * Mirrors flood-website-crm /community-mod
 *
 * Uses communityModApi (community backend, port 4001) per BUG-CRM01 fix.
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import ScreenHeader from '@/src/components/ui/ScreenHeader';
import EmptyState from '@/src/components/ui/EmptyState';
import { communityModApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import { colors, spacing, typography, radius, shadow } from '@/src/theme/admin';
import type { AdminPostDto, AdminGroupDto } from '@/src/api/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (d < 1) return 'just now';
  if (d < 60) return `${d}m ago`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ item, onDelete }: { item: AdminPostDto; onDelete: (id: string) => void }) {
  const initials = (item.authorName?.[0] ?? 'U').toUpperCase();

  return (
    <View style={pc.card}>
      <View style={pc.authorRow}>
        <View style={pc.avatar}>
          <Text style={pc.avatarText}>{initials}</Text>
        </View>
        <View style={pc.authorInfo}>
          <Text style={pc.authorName}>{item.authorName}</Text>
          <Text style={pc.meta}>
            {relativeTime(item.createdAt)}{item.groupSlug ? ` · g/${item.groupSlug}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={pc.deleteBtn}
          onPress={() =>
            Alert.alert('Delete Post', 'Remove this post from the platform?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
            ])
          }
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={16} color={colors.status.critical} />
        </TouchableOpacity>
      </View>

      {item.title ? <Text style={pc.title} numberOfLines={2}>{item.title}</Text> : null}
      <Text style={pc.content} numberOfLines={3}>{item.content}</Text>

      <View style={pc.stats}>
        <Ionicons name="heart-outline" size={12} color={colors.textMuted} />
        <Text style={pc.statText}>{Math.max(0, item.likesCount)}</Text>
        <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} />
        <Text style={pc.statText}>{item.commentsCount}</Text>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.base, gap: spacing.sm,
    ...shadow.light,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  meta: { ...typography.caption },
  deleteBtn: { padding: 4 },
  title: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, lineHeight: 20 },
  content: { ...typography.bodySmall, lineHeight: 18 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { ...typography.caption, marginRight: 8 },
});

// ── Group card ────────────────────────────────────────────────────────────────

function GroupCard({ item, onDelete }: { item: AdminGroupDto; onDelete: (id: string) => void }) {
  const letter = (item.name?.[0] ?? 'G').toUpperCase();

  return (
    <View style={gc.card}>
      <View style={gc.iconWrap}>
        <Text style={gc.iconLetter}>{letter}</Text>
      </View>
      <View style={gc.info}>
        <Text style={gc.name}>g/{item.slug}</Text>
        <Text style={gc.desc} numberOfLines={1}>{item.description ?? 'No description'}</Text>
        <Text style={gc.meta}>{item.membersCount} members · Created {relativeTime(item.createdAt)}</Text>
      </View>
      <TouchableOpacity
        style={gc.deleteBtn}
        onPress={() =>
          Alert.alert(
            'Delete Group',
            `Remove g/${item.slug} and all its content?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
            ]
          )
        }
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={16} color={colors.status.critical} />
      </TouchableOpacity>
    </View>
  );
}

const gc = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    ...shadow.light,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconLetter: { fontSize: 18, fontWeight: '800', color: '#fff' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  desc: { ...typography.caption, marginTop: 2 },
  meta: { ...typography.caption, marginTop: 2 },
  deleteBtn: { padding: 4 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

type Tab = 'posts' | 'groups';

export default function AdminCommunityScreen() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('posts');
  const queryClient   = useQueryClient();

  if (user?.role !== 'admin') {
    router.replace('/(app)/');
    return null;
  }

  const {
    data: postsPage, isLoading: postsLoading,
    refetch: refetchPosts, isRefetching: postsRefetching,
  } = useQuery({
    queryKey: ['mod-posts'],
    queryFn: () => communityModApi.getPosts(0, 50),
    enabled: tab === 'posts',
  });
  const posts = postsPage?.content ?? [];

  const {
    data: groups, isLoading: groupsLoading,
    refetch: refetchGroups, isRefetching: groupsRefetching,
  } = useQuery({
    queryKey: ['mod-groups'],
    queryFn: communityModApi.getGroups,
    enabled: tab === 'groups',
  });

  const deletePostMutation = useMutation({
    mutationFn: communityModApi.deletePost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mod-posts'] }),
    onError: () => Alert.alert('Error', 'Could not delete post.'),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: communityModApi.deleteGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mod-groups'] }),
    onError: () => Alert.alert('Error', 'Could not delete group.'),
  });

  const isLoading    = tab === 'posts' ? postsLoading    : groupsLoading;
  const isRefetching = tab === 'posts' ? postsRefetching : groupsRefetching;
  const onRefresh    = tab === 'posts' ? refetchPosts    : refetchGroups;

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Community"
        subtitle="Moderation Panel"
        showBack
        rightAction={{ icon: 'refresh-outline', onPress: onRefresh }}
      />

      {/* Tab bar */}
      <View style={s.tabRow}>
        {(['posts', 'groups'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'posts'
                ? `Posts${posts.length > 0 ? ` (${posts.length})` : ''}`
                : `Groups${(groups?.length ?? 0) > 0 ? ` (${groups!.length})` : ''}`
              }
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : tab === 'posts' ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard item={item} onDelete={(id) => deletePostMutation.mutate(id)} />
          )}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState icon="chatbubbles-outline" title="No posts" message="No community posts found." />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={groups ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GroupCard item={item} onDelete={(id) => deleteGroupMutation.mutate(id)} />
          )}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState icon="people-circle-outline" title="No groups" message="No community groups found." />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.sm, gap: spacing.sm },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center' },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  list: { padding: spacing.base, paddingBottom: spacing.xxl },
});
