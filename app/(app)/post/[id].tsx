/**
 * Post detail screen — shows full post + comment thread
 * Mirrors: flood-website-community /post/[id]
 */
import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, KeyboardAvoidingView,
  Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import type { CommentDto } from '@/src/api/types';
import * as Haptics from 'expo-haptics';

const BRAND = '#1d4ed8';
const BG    = '#eef2ff';
const CARD  = '#FFFFFF';
const BORDER = '#e2e8f0';
const TEXT  = '#1e293b';
const MUTED = '#64748b';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function CommentItem({ comment, currentUserId, onDelete }: {
  comment: CommentDto;
  currentUserId?: string;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={s.commentRow}>
      <View style={s.commentAvatar}>
        <Text style={s.commentAvatarText}>{getInitials(comment.authorName)}</Text>
      </View>
      <View style={s.commentBody}>
        <View style={s.commentHeader}>
          <Text style={s.commentAuthor}>{comment.authorName}</Text>
          <Text style={s.commentTime}>{timeAgo(comment.createdAt)}</Text>
          {comment.authorId === currentUserId && (
            <TouchableOpacity onPress={() => onDelete(comment.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={14} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={s.commentText}>{comment.content}</Text>
      </View>
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data: post, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getById(id),
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: () => postsApi.toggleLike(id),
    onSuccess: (data) => {
      qc.setQueryData(['post', id], (old: any) =>
        old ? { ...old, likedByMe: data.liked, likesCount: data.likesCount } : old
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onError: () => Alert.alert('Error', 'Could not like post.'),
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => postsApi.addComment(id, content),
    onSuccess: (newComment) => {
      setCommentText('');
      qc.setQueryData(['post', id], (old: any) =>
        old ? { ...old, comments: [...(old.comments ?? []), newComment], commentsCount: (old.commentsCount ?? 0) + 1 } : old
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => Alert.alert('Error', 'Could not add comment.'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => postsApi.deleteComment(id, commentId),
    onSuccess: (_, commentId) => {
      qc.setQueryData(['post', id], (old: any) =>
        old ? { ...old, comments: (old.comments ?? []).filter((c: CommentDto) => c.id !== commentId), commentsCount: Math.max(0, (old.commentsCount ?? 0) - 1) } : old
      );
    },
    onError: () => Alert.alert('Error', 'Could not delete comment.'),
  });

  const handleDelete = useCallback((commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCommentMutation.mutate(commentId) },
    ]);
  }, [deleteCommentMutation]);

  const handleSubmitComment = () => {
    if (!user) { Alert.alert('Sign in', 'Please sign in to comment.'); return; }
    const trimmed = commentText.trim();
    if (!trimmed) return;
    addCommentMutation.mutate(trimmed);
  };

  const handleDeletePost = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await postsApi.delete(id);
            qc.invalidateQueries({ queryKey: ['posts'] });
            router.back();
          } catch { Alert.alert('Error', 'Could not delete post.'); }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={TEXT} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Post</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (isError || !post) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={TEXT} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Post</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.errorState}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorTitle}>Post not found</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const comments: CommentDto[] = post.comments ?? [];
  const isOwner = user?.id === post.authorId;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Post</Text>
        {isOwner ? (
          <TouchableOpacity onPress={handleDeletePost} hitSlop={8} style={{ width: 40, alignItems: 'flex-end' }}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} colors={[BRAND]} />}
          renderItem={({ item }) => (
            <CommentItem comment={item} currentUserId={user?.id} onDelete={handleDelete} />
          )}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={
            <View>
              {/* Post card */}
              <View style={s.postCard}>
                <View style={s.authorRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{getInitials(post.authorName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.authorName}>{post.authorName}</Text>
                    <Text style={s.metaSub}>
                      {post.groupName ? `g/${post.groupName}  ·  ` : ''}
                      {timeAgo(post.createdAt)}
                    </Text>
                  </View>
                </View>
                <Text style={s.postTitle}>{post.title}</Text>
                {!!post.content && <Text style={s.postContent}>{post.content}</Text>}
                {/* Actions */}
                <View style={s.actionRow}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => likeMutation.mutate()} activeOpacity={0.7}>
                    <Ionicons name={post.likedByMe ? 'heart' : 'heart-outline'} size={16} color={post.likedByMe ? BRAND : MUTED} />
                    <Text style={[s.actionText, post.likedByMe && { color: BRAND }]}>{post.likesCount}</Text>
                  </TouchableOpacity>
                  <View style={s.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={16} color={MUTED} />
                    <Text style={s.actionText}>{post.commentsCount}</Text>
                  </View>
                </View>
              </View>
              {/* Comments heading */}
              {comments.length > 0 && (
                <Text style={s.commentsHeading}>
                  {`${comments.length} Comment${comments.length !== 1 ? 's' : ''}`}
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyComments}>
              <Text style={s.emptyCommentsText}>Be the first to comment!</Text>
            </View>
          }
        />
        {/* Comment input */}
        {user && (
          <View style={s.commentInput}>
            <TextInput
              style={s.inputField}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment…"
              placeholderTextColor={MUTED}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.sendBtn, !commentText.trim() && s.sendBtnDisabled]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || addCommentMutation.isPending}
              activeOpacity={0.8}
            >
              {addCommentMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  listContent: { padding: 12, paddingBottom: 8, gap: 8 },
  postCard: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 10, marginBottom: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  authorName: { fontSize: 14, fontWeight: '700', color: TEXT },
  metaSub: { fontSize: 12, color: MUTED, marginTop: 1 },
  postTitle: { fontSize: 17, fontWeight: '700', color: TEXT, lineHeight: 24 },
  postContent: { fontSize: 14, color: MUTED, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
  actionText: { fontSize: 12, fontWeight: '600', color: MUTED },
  commentsHeading: { fontSize: 13, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4, paddingHorizontal: 4 },
  emptyComments: { alignItems: 'center', paddingVertical: 24 },
  emptyCommentsText: { fontSize: 14, color: MUTED },
  commentRow: { flexDirection: 'row', gap: 10, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentAvatarText: { fontSize: 11, fontWeight: '700', color: BRAND },
  commentBody: { flex: 1, gap: 4 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: TEXT, flex: 1 },
  commentTime: { fontSize: 11, color: MUTED },
  commentText: { fontSize: 13, color: TEXT, lineHeight: 19 },
  commentInput: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER },
  inputField: { flex: 1, backgroundColor: BG, borderRadius: 20, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: TEXT, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: MUTED },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  errorIcon: { fontSize: 40 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  retryBtn: { backgroundColor: BRAND, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
