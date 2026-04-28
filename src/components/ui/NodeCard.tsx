/**
 * NodeCard — sensor node card for admin sensor list.
 * Dark admin theme.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { colors, radius, shadow, spacing, typography, getLevelColor } from '@/src/theme/admin';
import type { SensorNodeDto } from '@/src/api/types';

interface NodeCardProps {
  node: SensorNodeDto;
  onPress?: () => void;
  style?: ViewStyle;
}

function NodeCard({ node, onPress, style }: NodeCardProps) {
  const isDead = node.isDead ?? false;
  const levelColor = isDead ? colors.status.offline : getLevelColor(node.currentLevel);

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.stripe, { backgroundColor: levelColor }]} />
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.nodeId}>{node.nodeId}</Text>
            <Text style={styles.area}>{node.area} · {node.state}</Text>
          </View>
          <View style={styles.headerRight}>
            <StatusBadge
              variant={isDead ? 'offline' : undefined}
              level={isDead ? undefined : node.currentLevel}
            />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metricLabel}>Location</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Ionicons name="water-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metricLabel}>Level</Text>
            <Text style={[styles.metricValue, { color: levelColor }]}>
              {isDead ? '—' : `${node.currentLevel}m`}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metricLabel}>Updated</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {node.lastUpdated
                ? new Date(node.lastUpdated).toLocaleTimeString('en-MY', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </Text>
          </View>
        </View>
      </View>
      {onPress && (
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default React.memo(NodeCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  stripe: { width: 4 },
  body: { flex: 1, padding: spacing.base, gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1, gap: 2 },
  headerRight: { marginLeft: spacing.sm },
  nodeId: { ...typography.h3, fontSize: 15 },
  area: { ...typography.caption },
  divider: { height: 1, backgroundColor: colors.border },
  metrics: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, gap: 2, alignItems: 'center' },
  metricDivider: { width: 1, height: 32, backgroundColor: colors.border, marginHorizontal: spacing.xs },
  metricLabel: { ...typography.caption, textAlign: 'center' },
  metricValue: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600', textAlign: 'center' },
  chevron: { justifyContent: 'center', paddingRight: spacing.sm },
});
