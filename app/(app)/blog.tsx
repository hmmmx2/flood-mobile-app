/**
 * Blog screen — flood safety articles and community updates
 * Features: save/heart toggle per card, share per card, 'Saved' filter chip
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Share,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blogsApi } from '@/src/api';
import type { BlogDto } from '@/src/api/types';

const BRAND  = '#1d4ed8';
const BG     = '#F4F6F9';
const CARD   = '#FFFFFF';
const BORDER = '#DDE3ED';
const TEXT   = '#1A1A2E';
const MUTED  = '#6B7280';

const FAV_BLOGS_KEY = 'fav_blogs';

// ── Category config ───────────────────────────────────────────────────────────

// Canonical category list — must match website (flood-website-community) and backend enum
const CATEGORIES = ['All', 'Saved', 'Flood Alert', 'Safety Tips', 'Community', 'Updates', 'Research'];

type CatStyle = { bg: string; fg: string };

const CAT_STYLES: Record<string, CatStyle> = {
  'Flood Alert':   { bg: '#FFF3E0', fg: '#E65100' },
  'Safety Tips':   { bg: '#E3F2FD', fg: '#1565C0' },
  'Community':     { bg: '#F3E5F5', fg: '#6A1B9A' },
  'Updates':       { bg: '#E8F5E9', fg: '#2E7D32' },
  'Research':      { bg: '#FCE4EC', fg: '#AD1457' },
  'General':       { bg: '#F5F5F5', fg: '#616161' },
  'Emergency':     { bg: '#FFEBEE', fg: '#C62828' },
  'Preparedness':  { bg: '#E8EAF6', fg: '#283593' },
  'Saved':         { bg: '#FEF3C7', fg: '#D97706' },
};

function catStyle(category?: string): CatStyle {
  return CAT_STYLES[category ?? ''] ?? { bg: BG, fg: MUTED };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Blog Card ─────────────────────────────────────────────────────────────────

interface BlogCardProps {
  blog: BlogDto;
  featured?: boolean;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
}

function BlogCard({ blog, featured = false, isSaved, onToggleSave }: BlogCardProps) {
  const cs = catStyle(blog.category);

  // BUG-C01 (blog screen): stop inner action button presses from bubbling to
  // the outer TouchableOpacity card navigator on Android.
  const stopProp = (e: GestureResponderEvent) => e.stopPropagation();

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `"${blog.title}" — Read on FloodWatch: https://community.floodwatch.my/blog/${blog.id}`,
      });
    } catch {
      // user dismissed
    }
  }, [blog.title, blog.id]);

  return (
    <View style={[styles.card, featured && styles.featuredCard]}>
      {/* Placeholder image */}
      <View style={[styles.cardBanner, featured && styles.featuredBanner]}>
        <Ionicons
          name="newspaper"
          size={featured ? 44 : 30}
          color="rgba(255,255,255,0.55)"
        />
        {blog.isFeatured && (
          <View style={styles.starBadge}>
            <Ionicons name="star" size={10} color={BRAND} />
            <Text style={styles.starBadgeText}>Featured</Text>
          </View>
        )}

        {/* Save + Share actions — top right */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={(e) => { stopProp(e); void handleShare(); }}
            style={styles.cardActionBtn}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Share article"
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(e) => { stopProp(e); onToggleSave(blog.id); }}
            style={styles.cardActionBtn}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save article'}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={16}
              color={isSaved ? '#EF4444' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        {/* Top row */}
        <View style={styles.cardTopRow}>
          {blog.category && (
            <View style={[styles.catBadge, { backgroundColor: cs.bg }]}>
              <Text style={[styles.catText, { color: cs.fg }]}>
                {blog.category}
              </Text>
            </View>
          )}
          {/* Prefer server-provided readingTimeMinutes; fall back to word-count estimate */}
          {(() => {
            const mins = blog.readingTimeMinutes
              || Math.max(1, Math.round(stripHtml(blog.body ?? '').split(/\s+/).length / 200));
            return (
              <View style={styles.readTimePill}>
                <Ionicons name="time-outline" size={11} color={MUTED} />
                <Text style={styles.readTimeText}>{mins} min read</Text>
              </View>
            );
          })()}
        </View>

        {/* Title */}
        <Text
          style={[styles.cardTitle, featured && styles.featuredTitle]}
          numberOfLines={2}
        >
          {blog.title}
        </Text>

        {/* Excerpt */}
        {!!blog.body && (
          <Text style={styles.cardExcerpt} numberOfLines={featured ? 3 : 2}>
            {stripHtml(blog.body)}
          </Text>
        )}

        {/* Footer */}
        <Text style={styles.cardDate}>{formatDate(blog.createdAt)}</Text>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BlogScreen() {
  const [selectedCat, setSelectedCat] = useState('All');
  const [favBlogs, setFavBlogs]       = useState<string[]>([]);

  // Load saved blogs from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(FAV_BLOGS_KEY).then((raw) => {
      if (raw) {
        try { setFavBlogs(JSON.parse(raw)); } catch { /* ignore */ }
      }
    });
  }, []);

  const toggleSave = useCallback((id: string) => {
    setFavBlogs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      AsyncStorage.setItem(FAV_BLOGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['blogs'],
    queryFn:  () => blogsApi.getAll(),
  });

  const allBlogs = data?.content ?? [];
  const featured = allBlogs.find((b) => b.isFeatured);

  const filtered: BlogDto[] = (() => {
    if (selectedCat === 'All')   return allBlogs;
    if (selectedCat === 'Saved') return allBlogs.filter((b) => favBlogs.includes(b.id));
    return allBlogs.filter((b) => b.category === selectedCat);
  })();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Blog</Text>
        <Text style={styles.headerSub}>Safety tips & flood updates</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/blog/${item.id}` as any)} activeOpacity={0.97}>
            <BlogCard
              blog={item}
              isSaved={favBlogs.includes(item.id)}
              onToggleSave={toggleSave}
            />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        ListHeaderComponent={
          <>
            {/* Featured article */}
            {featured && (
              <View style={styles.featuredSection}>
                <Text style={styles.sectionLabel}>FEATURED</Text>
                <TouchableOpacity onPress={() => router.push(`/(app)/blog/${featured.id}` as any)} activeOpacity={0.97}>
                  <BlogCard
                    blog={featured}
                    featured
                    isSaved={favBlogs.includes(featured.id)}
                    onToggleSave={toggleSave}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Category filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    selectedCat === cat && styles.filterChipActive,
                    cat === 'Saved' && styles.filterChipSaved,
                    cat === 'Saved' && selectedCat === cat && styles.filterChipSavedActive,
                  ]}
                  onPress={() => setSelectedCat(cat)}
                  activeOpacity={0.8}
                >
                  {cat === 'Saved' && (
                    <Ionicons
                      name="heart"
                      size={11}
                      color={selectedCat === cat ? '#fff' : '#D97706'}
                      style={{ marginRight: 3 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.filterText,
                      selectedCat === cat && styles.filterTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Loading */}
            {isLoading && (
              <ActivityIndicator
                size="large"
                color={BRAND}
                style={{ marginTop: 40, marginBottom: 20 }}
              />
            )}

            {/* Error */}
            {!isLoading && isError && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>⚠️</Text>
                <Text style={styles.emptyTitle}>Failed to load articles</Text>
                <Text style={styles.emptyDesc}>Check your connection and try again.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Empty */}
            {!isLoading && !isError && filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>{selectedCat === 'Saved' ? '🤍' : '📰'}</Text>
                <Text style={styles.emptyTitle}>
                  {selectedCat === 'Saved' ? 'No saved articles' : 'No articles'}
                </Text>
                <Text style={styles.emptyDesc}>
                  {selectedCat === 'All'
                    ? 'Blog posts will appear here.'
                    : selectedCat === 'Saved'
                    ? 'Tap the heart on any article to save it.'
                    : `No "${selectedCat}" articles yet.`}
                </Text>
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  headerSub:   { fontSize: 13, color: MUTED, marginTop: 2 },

  listContent: { padding: 12, paddingBottom: 28, gap: 12 },

  // Featured section
  featuredSection: { gap: 8, marginBottom: 4 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 1, textTransform: 'uppercase',
    marginHorizontal: 2,
  },

  // Filter row
  filterRow: {
    paddingVertical: 6, gap: 8,
    marginBottom: 6, marginHorizontal: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    backgroundColor: CARD,
  },
  filterChipActive:      { backgroundColor: BRAND, borderColor: BRAND },
  filterChipSaved:       { borderColor: '#D97706', backgroundColor: '#FEF3C7' },
  filterChipSavedActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  filterText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  filterTextActive: { color: '#fff' },

  // Blog card
  card: {
    backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
    elevation: 1,
  },
  featuredCard: { borderColor: BRAND + '50' },

  cardBanner: {
    height: 90,
    backgroundColor: MUTED + '28',
    alignItems: 'center', justifyContent: 'center',
  },
  featuredBanner: { height: 130, backgroundColor: BRAND + '20' },

  // Card action buttons overlay (top-right of banner)
  cardActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  cardActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  starBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  starBadgeText: { fontSize: 10, fontWeight: '700', color: BRAND },

  cardBody: { padding: 14, gap: 8 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  catBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  catText: { fontSize: 11, fontWeight: '700' },

  readTimePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readTimeText: { fontSize: 11, color: MUTED },

  cardTitle:    { fontSize: 15, fontWeight: '700', color: TEXT, lineHeight: 21 },
  featuredTitle:{ fontSize: 17 },
  cardExcerpt:  { fontSize: 13, color: MUTED, lineHeight: 19 },
  cardDate:     { fontSize: 12, color: MUTED },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 56, gap: 8 },
  emptyIcon:  { fontSize: 44 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyDesc:  { fontSize: 13, color: MUTED, textAlign: 'center' },
  retryBtn:   { marginTop: 4, backgroundColor: BRAND, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
