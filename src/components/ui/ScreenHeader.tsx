/**
 * ScreenHeader — admin/CRM top header bar.
 * Uses the dark admin theme. Imported by all admin screens.
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/src/theme/admin';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    badge?: number;
  };
  style?: ViewStyle;
}

export default function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  rightAction,
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.sm },
        style,
      ]}
    >
      {/* Left: back button or brand dot */}
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brandDot} />
        )}
      </View>

      {/* Centre: title + subtitle */}
      <View style={styles.centre}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      {/* Right: optional action button */}
      <View style={styles.right}>
        {rightAction && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={rightAction.onPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={rightAction.icon} size={20} color={colors.textPrimary} />
            {rightAction.badge !== undefined && rightAction.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {rightAction.badge > 99 ? '99+' : rightAction.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    gap: spacing.sm,
  },
  left: { width: 36, alignItems: 'flex-start' },
  backBtn: { padding: 2 },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  centre: { flex: 1, alignItems: 'center' },
  title: { ...typography.h3, fontSize: 16 },
  subtitle: { ...typography.caption, marginTop: 1 },
  right: { width: 36, alignItems: 'flex-end' },
  actionBtn: { padding: 2, position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
