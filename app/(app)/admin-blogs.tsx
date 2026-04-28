/**
 * Admin Blogs screen — blog CRUD for admin (hidden tab)
 * Accessible via More screen → Blog Management
 * Mirrors flood-website-crm /blogs
 *
 * Uses adminBlogsApi (community backend, port 4001) per BUG-CRM01 fix.
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal,
  TextInput, ScrollView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import ScreenHeader from '@/src/components/ui/ScreenHeader';
import EmptyState from '@/src/components/ui/EmptyState';
import { adminBlogsApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import { colors, spacing, typography, radius, shadow } from '@/src/theme/admin';
import type { BlogDto, CreateBlogDto, PageDto } from '@/src/api/types';

const CATEGORIES = ['Flood Safety', 'Preparedness', 'Community', 'Updates', 'Tips'];

// ── Blog card ─────────────────────────────────────────────────────────────────

function BlogCard({ item, onDelete }: { item: BlogDto; onDelete: (id: string) => void }) {
  return (
    <View style={bc.card}>
      <View style={bc.header}>
        <View style={bc.titleRow}>
          <Text style={bc.title} numberOfLines={2}>{item.title}</Text>
          {item.isFeatured && (
            <View style={bc.featuredBadge}>
              <Ionicons name="star" size={10} color={colors.status.watch} />
              <Text style={bc.featuredText}>Featured</Text>
            </View>
          )}
        </View>
        <View style={bc.metaRow}>
          {item.category ? (
            <View style={bc.catBadge}>
              <Text style={bc.catText}>{item.category}</Text>
            </View>
          ) : null}
          {item.readingTimeMinutes != null ? (
            <Text style={bc.readTime}>{item.readingTimeMinutes} min read</Text>
          ) : null}
        </View>
        <Text style={bc.date}>
          {new Date(item.createdAt).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>

      <TouchableOpacity
        style={bc.deleteBtn}
        onPress={() =>
          Alert.alert('Delete Blog', 'Are you sure you want to delete this article?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
          ])
        }
      >
        <Ionicons name="trash-outline" size={15} color={colors.status.critical} />
        <Text style={bc.deleteBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

const bc = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadow.light,
  },
  header: { gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary, lineHeight: 20 },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.status.watch + '20',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.full, flexShrink: 0,
  },
  featuredText: { fontSize: 9, fontWeight: '700', color: colors.status.watch },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  catText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  readTime: { ...typography.caption },
  date: { ...typography.caption },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.status.critical + '50',
    backgroundColor: colors.status.critical + '12',
  },
  deleteBtnText: { fontSize: 12, color: colors.status.critical, fontWeight: '600' },
});

// ── Compose modal ─────────────────────────────────────────────────────────────

interface ComposeProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (payload: CreateBlogDto) => Promise<void>;
  isSaving: boolean;
}

function ComposeBlogModal({ visible, onClose, onCreate, isSaving }: ComposeProps) {
  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  const [category, setCategory]     = useState('');
  const [featured, setFeatured]     = useState(false);
  const [readingTime, setReadingTime] = useState('');

  const canSave = title.trim().length > 0 && body.trim().length > 0 && !isSaving;

  const reset = () => { setTitle(''); setBody(''); setCategory(''); setFeatured(false); setReadingTime(''); };

  const handleCreate = async () => {
    if (!canSave) return;
    await onCreate({
      title: title.trim(),
      body: body.trim(),
      category: category || undefined,
      isFeatured: featured,
      readingTimeMinutes: readingTime ? parseInt(readingTime, 10) : undefined,
    });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={cm.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={cm.header}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} style={cm.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={cm.title}>New Article</Text>
          <TouchableOpacity style={[cm.saveBtn, !canSave && cm.saveBtnDisabled]} onPress={handleCreate} disabled={!canSave}>
            {isSaving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={cm.saveBtnText}>Publish</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={cm.form} keyboardShouldPersistTaps="handled">
          <Text style={cm.label}>TITLE</Text>
          <TextInput
            style={cm.input} value={title} onChangeText={setTitle}
            placeholder="Article title…" placeholderTextColor={colors.textMuted}
            maxLength={200} selectionColor={colors.primary}
          />

          <Text style={cm.label}>CATEGORY</Text>
          <View style={cm.categoryRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[cm.catChip, category === c && cm.catChipActive]}
                onPress={() => setCategory(category === c ? '' : c)}
              >
                <Text style={[cm.catChipText, category === c && cm.catChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={cm.label}>READING TIME (minutes)</Text>
          <TextInput
            style={cm.input} value={readingTime} onChangeText={setReadingTime}
            placeholder="e.g. 5" placeholderTextColor={colors.textMuted}
            keyboardType="number-pad" selectionColor={colors.primary}
          />

          <View style={cm.featureRow}>
            <Text style={cm.featureLabel}>Mark as Featured</Text>
            <Switch
              value={featured}
              onValueChange={setFeatured}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={featured ? colors.primary : colors.textMuted}
              ios_backgroundColor={colors.border}
            />
          </View>

          <Text style={cm.label}>CONTENT</Text>
          <TextInput
            style={[cm.input, cm.textArea]} value={body} onChangeText={setBody}
            placeholder="Write your article content here…" placeholderTextColor={colors.textMuted}
            multiline textAlignVertical="top" selectionColor={colors.primary}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cm = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card, paddingTop: spacing.xl,
  },
  closeBtn: { padding: 4 },
  title: { ...typography.h3, fontSize: 16 },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.base, paddingVertical: spacing.xs + 2, borderRadius: radius.md, minWidth: 72, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  form: { padding: spacing.base, gap: spacing.sm, paddingBottom: spacing.xxl },
  label: { ...typography.labelUpper, marginBottom: 2 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.sm + 2,
    ...typography.body,
  },
  textArea: { minHeight: 140, paddingTop: spacing.sm },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  catChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  catChipTextActive: { color: colors.primary },
  featureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  featureLabel: { ...typography.body, fontSize: 14 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AdminBlogsScreen() {
  const user = useAuthStore((s) => s.user);
  const [composeOpen, setComposeOpen] = useState(false);
  const queryClient = useQueryClient();

  if (user?.role !== 'admin') {
    router.replace('/(app)/');
    return null;
  }

  const {
    data, isLoading, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery<PageDto<BlogDto>, Error, InfiniteData<PageDto<BlogDto>>, string[], number>({
    queryKey: ['admin-blogs'],
    queryFn: ({ pageParam }) => adminBlogsApi.getAll(pageParam),
    getNextPageParam: (last) => (last.number + 1) < last.totalPages ? last.number + 1 : undefined,
    initialPageParam: 0,
  });

  const blogs = data?.pages.flatMap((p) => p.content) ?? [];

  const createMutation = useMutation({
    mutationFn: adminBlogsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
      setComposeOpen(false);
      Alert.alert('Published', 'Your article has been published.');
    },
    onError: () => Alert.alert('Error', 'Could not publish. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminBlogsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-blogs'] }),
    onError: () => Alert.alert('Error', 'Could not delete the article.'),
  });

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Blogs"
        subtitle={`${blogs.length} articles`}
        showBack
        rightAction={{ icon: 'refresh-outline', onPress: refetch }}
      />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={blogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BlogCard item={item} onDelete={(id) => deleteMutation.mutate(id)} />
          )}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon="newspaper-outline"
              title="No articles yet"
              message="Tap the button below to publish your first article."
            />
          }
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.base }} />
              : null
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={s.fab} onPress={() => setComposeOpen(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={s.fabText}>New Article</Text>
      </TouchableOpacity>

      <ComposeBlogModal
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        onCreate={(p) => createMutation.mutateAsync(p).then(() => undefined)}
        isSaving={createMutation.isPending}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
