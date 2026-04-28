/**
 * StatusBadge — coloured dot + label on a tinted background.
 * Used in admin screens (dark theme).
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, getLevelColor, getLevelDim, getLevelLabel } from '@/src/theme/admin';

type StatusVariant = 'normal' | 'watch' | 'warning' | 'critical' | 'offline' | 'online';

interface StatusBadgeProps {
  variant?: StatusVariant;
  level?: number;
  label?: string;
  style?: ViewStyle;
}

function resolveVariant(variant?: StatusVariant, level?: number) {
  if (level !== undefined) {
    return {
      color: getLevelColor(level),
      dimColor: getLevelDim(level),
      label: getLevelLabel(level),
    };
  }
  switch (variant) {
    case 'normal':
      return { color: colors.status.normal, dimColor: colors.statusDim.normal, label: 'Normal' };
    case 'watch':
      return { color: colors.status.watch, dimColor: colors.statusDim.watch, label: 'Alert' };
    case 'warning':
      return { color: colors.status.warning, dimColor: colors.statusDim.warning, label: 'Warning' };
    case 'critical':
      return { color: colors.status.critical, dimColor: colors.statusDim.critical, label: 'Critical' };
    case 'online':
      return { color: colors.status.normal, dimColor: colors.statusDim.normal, label: 'Online' };
    case 'offline':
    default:
      return { color: colors.status.offline, dimColor: colors.statusDim.offline, label: 'Offline' };
  }
}

export default function StatusBadge({ variant, level, label, style }: StatusBadgeProps) {
  const resolved = resolveVariant(variant, level);
  const displayLabel = label ?? resolved.label;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: resolved.dimColor, borderColor: resolved.color + '40' },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: resolved.color }]} />
      <Text style={[styles.label, { color: resolved.color }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
