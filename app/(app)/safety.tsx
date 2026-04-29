/**
 * Safety screen — flood safety tips and advisories
 * Community screen accessible from the Profile tab via the More menu
 */
import { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { safetyApi } from '@/src/api';
import type { SafetyContentDto } from '@/src/api/types';

const BRAND  = '#1d4ed8';
const BG     = '#eef2ff';
const CARD   = '#FFFFFF';
const BORDER = '#e2e8f0';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';

const SECTION_ICONS: Record<string, string> = {
  'Evacuation':      'exit-outline',
  'Preparedness':    'checkmark-circle-outline',
  'During Flood':    'water-outline',
  'After Flood':     'sunny-outline',
  'Emergency':       'alert-circle-outline',
  'Communication':   'call-outline',
};

function SafetyCard({ item }: { item: SafetyContentDto }) {
  const [expanded, setExpanded] = useState(false);
  const icon = (SECTION_ICONS[item.section] ?? 'shield-checkmark-outline') as any;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.section} safety tip, tap to ${expanded ? 'collapse' : 'expand'}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={BRAND} />
        </View>
        <Text style={styles.sectionTitle}>{item.section}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
      </View>
      {expanded && (
        <Text style={styles.content}>{item.content}</Text>
      )}
      <Text style={styles.updatedAt}>
        Updated {new Date(item.updatedAt).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })}
      </Text>
    </TouchableOpacity>
  );
}

export default function SafetyScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['safety'],
    queryFn: () => safetyApi.getAll(),
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Safety Tips</Text>
          <Text style={styles.headerSub}>Flood safety guidelines</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={BRAND} style={{ marginTop: 60 }} />
      ) : isError ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={44} color={MUTED} />
          <Text style={styles.emptyTitle}>Failed to load safety tips</Text>
          <Text style={styles.emptyDesc}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SafetyCard item={item} />}
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
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={30} color={BRAND} />
              </View>
              <Text style={styles.emptyTitle}>No safety tips yet</Text>
              <Text style={styles.emptyDesc}>Safety guidelines will appear here.</Text>
            </View>
          }
          initialNumToRender={10}
          windowSize={5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 40 },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  headerSub: { fontSize: 12, color: MUTED, marginTop: 2 },

  listContent: { padding: 12, paddingBottom: 28 },

  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT },
  content: { fontSize: 14, color: MUTED, lineHeight: 21 },
  updatedAt: { fontSize: 11, color: MUTED + '80', alignSelf: 'flex-end' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: BRAND + '15', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyDesc: { fontSize: 13, color: MUTED, textAlign: 'center' },
  retryBtn: { marginTop: 4, backgroundColor: BRAND, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
