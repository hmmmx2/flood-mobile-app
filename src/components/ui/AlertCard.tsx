/**
 * AlertCard — alert card for admin alerts list.
 * Dark admin theme.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { colors, radius, shadow, spacing, typography, getLevelColor, getLevelDim } from '@/src/theme/admin';
import type { FeedItemDto } from '@/src/api/types';

const severityToVariant = {
  normal: 'normal',
  watch: 'watch',
  warning: 'warning',
  critical: 'critical',
} as const;

const severityToType = {
  normal: 'NORMAL',
  watch: 'ALERT',
  warning: 'WARNING',
  critical: 'DANGER',
} as const;

const severityToIcon = {
  normal: 'checkmark-circle-outline',
  watch: 'warning-outline',
  warning: 'alert-circle-outline',
  critical: 'flame-outline',
} as const;

interface AlertCardProps {
  alert: FeedItemDto;
  style?: ViewStyle;
}

function AlertCard({ alert, style }: AlertCardProps) {
  const variant = severityToVariant[alert.severity] ?? 'normal';
  const accentColor = getLevelColor(
    alert.severity === 'critical' ? 3
    : alert.severity === 'warning' ? 2
    : alert.severity === 'watch' ? 1 : 0
  );
  const dimColor = getLevelDim(
    alert.severity === 'critical' ? 3
    : alert.severity === 'warning' ? 2
    : alert.severity === 'watch' ? 1 : 0
  );

  const timestamp = new Date(alert.createdAt);
  const timeStr = timestamp.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
  const dateStr = timestamp.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.card, { borderLeftColor: accentColor, borderLeftWidth: 3 }, style]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: dimColor }]}>
          <Ionicons
            name={severityToIcon[alert.severity] as any}
            size={16}
            color={accentColor}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>{alert.title}</Text>
          <Text style={styles.nodeId}>{alert.sensorName || alert.sensorId}</Text>
        </View>
        <StatusBadge variant={variant} label={severityToType[alert.severity]} />
      </View>
      {alert.summary && (
        <Text style={styles.message} numberOfLines={2}>{alert.summary}</Text>
      )}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="water-outline" size={11} color={colors.textMuted} />
          <Text style={styles.footerText}>{alert.waterLevelMeters?.toFixed(1) ?? '—'} m</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="time-outline" size={11} color={colors.textMuted} />
          <Text style={styles.footerText}>{dateStr} · {timeStr}</Text>
        </View>
      </View>
    </View>
  );
}

export default React.memo(AlertCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadow.light,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconWrap: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerText: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: '600', lineHeight: 20 },
  nodeId: { ...typography.caption },
  message: { ...typography.bodySmall, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: spacing.base, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { ...typography.caption },
});
