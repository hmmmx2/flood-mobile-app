/**
 * Blog detail screen — full article view with rich HTML rendering
 * Mirrors: flood-website-community /blog/[id]
 */
import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import RenderHtml, { type MixedStyleDeclaration } from 'react-native-render-html';
import { blogsApi } from '@/src/api';

const BRAND  = '#1d4ed8';
const BG     = '#eef2ff';
const CARD   = '#FFFFFF';
const BORDER = '#e2e8f0';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';

const CAT_STYLES: Record<string, { bg: string; fg: string }> = {
  'Flood Alert':   { bg: '#FFF3E0', fg: '#E65100' },
  'Safety Tips':   { bg: '#E3F2FD', fg: '#1565C0' },
  'Community':     { bg: '#F3E5F5', fg: '#6A1B9A' },
  'Updates':       { bg: '#E8F5E9', fg: '#2E7D32' },
  'Research':      { bg: '#FCE4EC', fg: '#AD1457' },
  'General':       { bg: '#F5F5F5', fg: '#616161' },
  'Emergency':     { bg: '#FFEBEE', fg: '#C62828' },
  'Preparedness':  { bg: '#E8EAF6', fg: '#283593' },
  'Flood Safety':  { bg: '#FFF3E0', fg: '#E65100' },
  'Tips':          { bg: '#E3F2FD', fg: '#1565C0' },
};

// Custom tag styles passed to RenderHtml
const HTML_TAGSLIST_STYLES: Record<string, MixedStyleDeclaration> = {
  body: {
    fontSize: 15,
    lineHeight: 26,
    color: TEXT,
  },
  p: { marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: '800' as const, color: TEXT, marginBottom: 8, marginTop: 16 },
  h2: { fontSize: 20, fontWeight: '700' as const, color: TEXT, marginBottom: 8, marginTop: 14 },
  h3: { fontSize: 18, fontWeight: '700' as const, color: TEXT, marginBottom: 6, marginTop: 12 },
  h4: { fontSize: 16, fontWeight: '700' as const, color: TEXT, marginBottom: 6, marginTop: 10 },
  ul: { paddingLeft: 16, marginBottom: 12 },
  ol: { paddingLeft: 16, marginBottom: 12 },
  li: { marginBottom: 6 },
  strong: { fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const },
  a: { color: BRAND, textDecorationLine: 'underline' as const },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: BRAND,
    paddingLeft: 12,
    marginLeft: 0,
    marginBottom: 12,
    color: MUTED,
  },
  code: {
    fontFamily: 'monospace' as const,
    backgroundColor: BG,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 13,
  },
  pre: {
    backgroundColor: BG,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
};

export default function BlogDetailScreen() {
  const { id }       = useLocalSearchParams<{ id: string }>();
  const { width }    = useWindowDimensions();

  const { data: blog, isLoading, isError, refetch } = useQuery({
    queryKey: ['blog', id],
    queryFn:  () => blogsApi.getById(id),
    enabled:  !!id,
  });

  const cs = CAT_STYLES[blog?.category ?? ''] ?? { bg: BG, fg: MUTED };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Article</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
      ) : isError || !blog ? (
        <View style={s.errorState}>
          <Ionicons name="document-text-outline" size={44} color={MUTED} />
          <Text style={s.errorTitle}>Article not found</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Hero banner */}
          <View style={s.banner}>
            <Ionicons name="newspaper" size={48} color="rgba(255,255,255,0.5)" />
            {blog.isFeatured && (
              <View style={s.featuredBadge}>
                <Ionicons name="star" size={11} color={BRAND} />
                <Text style={s.featuredBadgeText}>Featured</Text>
              </View>
            )}
          </View>

          <View style={s.body}>
            {/* Meta row */}
            <View style={s.metaRow}>
              {blog.category && (
                <View style={[s.catBadge, { backgroundColor: cs.bg }]}>
                  <Text style={[s.catText, { color: cs.fg }]}>{blog.category}</Text>
                </View>
              )}
              {blog.readingTimeMinutes != null && (
                <View style={s.readTimePill}>
                  <Ionicons name="time-outline" size={12} color={MUTED} />
                  <Text style={s.readTimeText}>{blog.readingTimeMinutes} min read</Text>
                </View>
              )}
            </View>

            <Text style={s.title}>{blog.title}</Text>
            <Text style={s.date}>
              {new Date(blog.createdAt).toLocaleDateString('en-MY', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>

            <View style={s.divider} />

            {/* Rich HTML body */}
            <RenderHtml
              contentWidth={width - 40}
              source={{ html: blog.body }}
              tagsStyles={HTML_TAGSLIST_STYLES}
              enableExperimentalBRCollapsing
              enableExperimentalGhostLinesPrevention
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: BG },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:         { width: 40 },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: TEXT },
  content:         { paddingBottom: 40 },
  banner:          { height: 180, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  featuredBadge:   { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  featuredBadgeText: { fontSize: 11, fontWeight: '700', color: BRAND },
  body:            { padding: 20, gap: 12 },
  metaRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  catText:         { fontSize: 12, fontWeight: '700' },
  readTimePill:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  readTimeText:    { fontSize: 12, color: MUTED },
  title:           { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 30 },
  date:            { fontSize: 13, color: MUTED },
  divider:         { height: 1, backgroundColor: BORDER },
  errorState:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  errorTitle:      { fontSize: 16, fontWeight: '700', color: TEXT },
  retryBtn:        { backgroundColor: BRAND, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  retryBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});
