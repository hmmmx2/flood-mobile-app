/**
 * StatCard — mobile port of the website's OverviewCard.
 * Used on the admin Dashboard screen.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, typography, spacing } from '@/src/theme/admin';

export interface StatCardProps {
  title: string;
  value: string | number;
  helper?: string;
  subLabel?: string;
  trend?: {
    label: string;
    direction: 'up' | 'down' | 'flat';
  };
  accentColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export default function StatCard({
  title,
  value,
  helper,
  subLabel,
  trend,
  accentColor,
  icon,
  style,
}: StatCardProps) {
  const trendColor =
    trend?.direction === 'down'
      ? colors.status.critical
      : trend?.direction === 'flat'
      ? colors.textMuted
      : colors.status.normal;

  const trendIcon =
    trend?.direction === 'up'
      ? 'trending-up'
      : trend?.direction === 'down'
      ? 'trending-down'
      : 'remove';

  const accent = accentColor ?? colors.primary;

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title.toUpperCase()}</Text>
          {icon && (
            <View style={[styles.iconBg, { backgroundColor: accent + '20' }]}>
              <Ionicons name={icon} size={14} color={accent} />
            </View>
          )}
        </View>
        <Text style={[styles.value, accentColor ? { color: accentColor } : {}]}>
          {value}
        </Text>
        {helper && <Text style={styles.helper}>{helper}</Text>}
        {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
        {trend && (
          <View style={styles.trendRow}>
            <Ionicons name={trendIcon as any} size={12} color={trendColor} />
            <Text style={[styles.trendLabel, { color: trendColor }]}>{trend.label}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  accent: { height: 3, width: '100%' },
  body: { padding: spacing.base, gap: 4 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { ...typography.labelUpper, flex: 1 },
  iconBg: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { ...typography.value },
  helper: { ...typography.caption, marginTop: 2 },
  subLabel: { fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  trendLabel: { fontSize: 11, fontWeight: '600' },
});
