/**
 * Users screen — admin user management (hidden tab)
 * Accessible via More screen → User Management
 * Mirrors flood-website-crm /users
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import ScreenHeader from '@/src/components/ui/ScreenHeader';
import EmptyState from '@/src/components/ui/EmptyState';
import { usersApi } from '@/src/api';
import { colors, spacing, typography, radius, shadow } from '@/src/theme/admin';
import type { UserSummaryDto } from '@/src/api/types';

// ── User card ─────────────────────────────────────────────────────────────────

function UserCard({ item }: { item: UserSummaryDto }) {
  const initials = `${item.firstName?.[0] ?? ''}${item.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const isAdmin  = item.role === 'admin';

  return (
    <View style={uc.card} testID="user-card">
      <View style={[uc.avatar, isAdmin && uc.avatarAdmin]}>
        <Text style={uc.initials}>{initials}</Text>
      </View>
      <View style={uc.info}>
        <Text style={uc.name} testID="user-card-name">{item.firstName} {item.lastName}</Text>
        <Text style={uc.email} numberOfLines={1}>{item.email}</Text>
        <Text style={uc.joined}>
          Joined {new Date(item.createdAt).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <View style={[uc.rolePill, isAdmin ? uc.adminPill : uc.userPill]}>
        <Text style={[uc.roleText, isAdmin ? uc.adminText : uc.userText]} testID="user-card-role">
          {item.role.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const uc = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    ...shadow.light,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.cardAlt,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarAdmin: { backgroundColor: colors.primary },
  initials: { fontSize: 15, fontWeight: '700', color: '#fff' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  email: { ...typography.caption },
  joined: { ...typography.caption },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  adminPill: { backgroundColor: colors.primary + '20' },
  userPill: { backgroundColor: colors.cardAlt },
  roleText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  adminText: { color: colors.primary },
  userText: { color: colors.textMuted },
});

// ── Main screen ───────────────────────────────────────────────────────────────

type FilterRole = 'all' | 'admin' | 'user';

export default function UsersScreen() {
  const [filter, setFilter] = useState<FilterRole>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const displayed = useMemo(() => {
    let list = data ?? [];
    if (filter === 'user') {
      list = list.filter((u) => u.role === 'user' || u.role === 'customer');
    } else if (filter !== 'all') {
      list = list.filter((u) => u.role === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) =>
        u.email.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, filter, search]);

  const adminCount = data?.filter((u) => u.role === 'admin').length ?? 0;
  const userCount  = data?.filter((u) => u.role !== 'admin').length ?? 0;

  const FILTERS: { key: FilterRole; label: string }[] = [
    { key: 'all',   label: `All (${data?.length ?? 0})` },
    { key: 'admin', label: `Admin (${adminCount})` },
    { key: 'user',  label: `User (${userCount})` },
  ];

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Users"
        subtitle={`${data?.length ?? 0} registered accounts`}
        showBack
        rightAction={{ icon: 'refresh-outline', onPress: refetch }}
      />

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          testID="users-search-input"
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or email…"
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterTab, filter === f.key && s.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          testID="users-list"
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserCard item={item} />}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No users found"
              message="No users match the current filter."
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  filterRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.base, marginTop: spacing.sm, marginBottom: spacing.xs },
  filterTab: { flex: 1, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center' },
  filterTabActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  filterText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  filterTextActive: { color: colors.primary },
  list: { padding: spacing.base, paddingBottom: spacing.xxl },
});
