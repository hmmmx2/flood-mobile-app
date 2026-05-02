/**
 * Group detail screen — group info + group-scoped post feed
 * Mirrors: flood-website-community /g/[slug]
 */
import { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { groupsApi, postsApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import type { PostDto, GroupDto, PageDto } from '@/src/api/types';
import * as Haptics from 'expo-haptics';

const BRAND = '#1d4ed8'; const BG = '#eef2ff'; const CARD = '#FFFFFF';
const BORDER = '#e2e8f0'; const TEXT = '#1e293b'; const MUTED = '#64748b';

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function initials(name: string) { return name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase(); }

export default function GroupDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [sort, setSort] = useState<'new' | 'top'>('new');

  const { data: group, isLoading: groupLoading, isError: groupError, refetch: refetchGroup } = useQuery<GroupDto>({
    queryKey: ['group', slug],
    queryFn: () => groupsApi.getBySlug(slug),
    enabled: !!slug,
  });

  const { data, isLoading, isError: postsError, fetchNextPage, hasNextPage, refetch, isRefetching, isFetchingNextPage } =
    useInfiniteQuery<PageDto<PostDto>, Error, InfiniteData<PageDto<PostDto>>, string[], number>({
      queryKey: ['group-posts', slug, sort],
      queryFn: ({ pageParam }) => postsApi.getAll(pageParam, 20, sort, slug),
      getNextPageParam: (last) => (last.number + 1) < last.totalPages ? last.number + 1 : undefined,
      initialPageParam: 0,
      enabled: !!slug,
    });

  const membershipMutation = useMutation({
    mutationFn: () => groupsApi.toggleMembership(slug),
    onSuccess: (updated) => {
      qc.setQueryData(['group', slug], updated);
      qc.invalidateQueries({ queryKey: ['groups'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onError: () => Alert.alert('Error', 'Could not update membership.'),
  });

  const posts = data?.pages.flatMap(p => p.content) ?? [];

  if (groupError) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity testID="group-detail-back" onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={TEXT} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Group</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="warning-outline" size={30} color={MUTED} />
          </View>
          <Text style={s.emptyTitle}>Could not load group</Text>
          <Text style={s.emptyDesc}>Check your connection and try again.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetchGroup()} activeOpacity={0.8}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity testID="group-detail-back" onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text testID="group-detail-title" style={s.headerTitle} numberOfLines={1}>{group?.name ?? 'Group'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} colors={[BRAND]} />}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/post/${item.id}` as any)} activeOpacity={0.97}>
            <View style={s.postCard}>
              <View style={s.authorRow}>
                <View style={s.avatar}><Text style={s.avatarText}>{initials(item.authorName)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.authorName}>{item.authorName}</Text>
                  <Text style={s.metaSub}>{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
              <Text style={s.postTitle}>{item.title}</Text>
              {!!item.content && <Text style={s.postContent} numberOfLines={2}>{item.content}</Text>}
              <View style={s.actionRow}>
                <View style={s.actionChip}><Ionicons name="heart-outline" size={13} color={MUTED} /><Text style={s.chipText}>{Math.max(0, item.likesCount)}</Text></View>
                <View style={s.actionChip}><Ionicons name="chatbubble-outline" size={13} color={MUTED} /><Text style={s.chipText}>{item.commentsCount}</Text></View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View>
            {groupLoading ? (
              <ActivityIndicator color={BRAND} style={{ marginBottom: 12 }} />
            ) : group ? (
              <View style={s.groupCard}>
                <View style={s.groupIcon}><Text style={s.groupIconLetter}>{(group.name[0] ?? 'G').toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.groupName}>{group.name}</Text>
                  <Text style={s.groupSlug}>g/{group.slug}</Text>
                  {group.description ? <Text style={s.groupDesc} numberOfLines={2}>{group.description}</Text> : null}
                  <Text style={s.groupMeta}>{group.membersCount.toLocaleString()} members · {group.postsCount.toLocaleString()} posts</Text>
                </View>
                {user && (
                  <TouchableOpacity
                    style={group.joinedByMe ? s.leaveBtn : s.joinBtn}
                    onPress={() => membershipMutation.mutate()}
                    disabled={membershipMutation.isPending}
                    activeOpacity={0.8}
                  >
                    {membershipMutation.isPending
                      ? <ActivityIndicator size="small" color={group.joinedByMe ? MUTED : '#fff'} />
                      : <Text style={group.joinedByMe ? s.leaveBtnText : s.joinBtnText}>{group.joinedByMe ? 'Leave' : 'Join'}</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
            {/* Sort tabs */}
            <View style={s.sortRow}>
              {(['new', 'top'] as const).map(sv => (
                <TouchableOpacity key={sv} style={[s.sortTab, sort === sv && s.sortTabActive]} onPress={() => setSort(sv)} activeOpacity={0.8}>
                  <Text style={[s.sortTabText, sort === sv && s.sortTabTextActive]}>{sv === 'new' ? 'New' : 'Top'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {isLoading && <ActivityIndicator color={BRAND} style={{ marginTop: 16 }} />}
            {postsError && !isLoading && (
              <View style={s.emptyState}>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="warning-outline" size={30} color={MUTED} />
                </View>
                <Text style={s.emptyTitle}>Could not load posts</Text>
                <TouchableOpacity style={s.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
                  <Text style={s.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            {!isLoading && !postsError && posts.length === 0 && (
              <View style={s.emptyState}>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="chatbubbles-outline" size={30} color={BRAND} />
                </View>
                <Text style={s.emptyTitle}>No posts yet</Text>
                <Text style={s.emptyDesc}>Be the first to post in this group!</Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={BRAND} style={{ padding: 16 }} /> : null}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT, flex: 1, textAlign: 'center' },
  list: { padding: 12, gap: 8, paddingBottom: 24 },
  groupCard: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  groupIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groupIconLetter: { fontSize: 20, fontWeight: '800', color: '#fff' },
  groupName: { fontSize: 16, fontWeight: '800', color: TEXT },
  groupSlug: { fontSize: 12, color: MUTED, marginTop: 2 },
  groupDesc: { fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 18 },
  groupMeta: { fontSize: 12, color: MUTED, marginTop: 4 },
  joinBtn: { backgroundColor: BRAND, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, minWidth: 60, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  leaveBtn: { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, minWidth: 60, alignItems: 'center' },
  leaveBtnText: { color: MUTED, fontWeight: '700', fontSize: 13 },
  sortRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  sortTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  sortTabActive: { borderColor: BRAND, backgroundColor: BRAND },
  sortTabText: { fontSize: 13, fontWeight: '600', color: MUTED },
  sortTabTextActive: { color: '#fff' },
  postCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  authorName: { fontSize: 13, fontWeight: '700', color: TEXT },
  metaSub: { fontSize: 11, color: MUTED },
  postTitle: { fontSize: 15, fontWeight: '700', color: TEXT, lineHeight: 22 },
  postContent: { fontSize: 13, color: MUTED, lineHeight: 19 },
  actionRow: { flexDirection: 'row', gap: 6 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: BG },
  chipText: { fontSize: 12, color: MUTED, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: BRAND + '15', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyDesc: { fontSize: 13, color: MUTED, textAlign: 'center' },
  retryBtn: { marginTop: 4, backgroundColor: BRAND, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
