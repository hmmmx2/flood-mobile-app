/**
 * FloodAlertBanner
 *
 * Full-screen takeover alert modelled on Japan's Earthquake Early Warning.
 * Appears instantly when a flood threshold push notification is received.
 *
 * - WATCH    → yellow banner, auto-dismisses after 15s
 * - WARNING  → orange banner, requires manual dismiss
 * - CRITICAL → red banner, pulsing animation, requires manual dismiss
 *
 * Usage:
 *   const [alert, setAlert] = useState<FloodAlertPayload | null>(null);
 *   <FloodAlertBanner alert={alert} onDismiss={() => setAlert(null)} />
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { dismissFloodAlarm, type FloodAlertPayload, type FloodSeverity } from '@/src/services/floodAlarm';

interface Props {
  alert: FloodAlertPayload | null;
  onDismiss: () => void;
}

const SEVERITY_CONFIG: Record<FloodSeverity, {
  bg: string; border: string; icon: string; label: string; autoDismissMs?: number;
}> = {
  WATCH: {
    bg: '#fef9c3',
    border: '#eab308',
    icon: 'warning-outline',
    label: '⚠️ FLOOD WATCH',
    autoDismissMs: 15_000,
  },
  WARNING: {
    bg: '#fff7ed',
    border: '#f97316',
    icon: 'alert-circle-outline',
    label: '🚨 FLOOD WARNING',
  },
  CRITICAL: {
    bg: '#fef2f2',
    border: '#ef4444',
    icon: 'flame-outline',
    label: '🔴 CRITICAL FLOOD ALERT',
  },
};

const ACTION_TEXT: Record<FloodSeverity, string> = {
  WATCH:    'Monitor conditions. Prepare your emergency kit and stay informed.',
  WARNING:  'Move valuables to higher ground. Prepare to evacuate your area now.',
  CRITICAL: 'EVACUATE IMMEDIATELY. Do not wait. Call Civil Defence: 991.',
};

export default function FloodAlertBanner({ alert, onDismiss }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!alert) return;

    const cfg = SEVERITY_CONFIG[alert.severity];

    // Auto-dismiss for WATCH after 15s
    if (cfg.autoDismissMs) {
      autoDismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, cfg.autoDismissMs);
    }

    // Pulsing animation for CRITICAL
    if (alert.severity === 'CRITICAL') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.85, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => {
        pulse.stop();
        if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
      };
    }

    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert?.nodeId, alert?.severity]);

  if (!alert) return null;

  const cfg = SEVERITY_CONFIG[alert.severity];
  const isCritical = alert.severity === 'CRITICAL';

  function handleDismiss() {
    dismissFloodAlarm();
    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    onDismiss();
  }

  function handleViewMap() {
    handleDismiss();
    router.push('/(app)/alerts');
  }

  function handleCallDefence() {
    void Linking.openURL('tel:991');
  }

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: cfg.bg, borderColor: cfg.border },
          isCritical && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: cfg.border }]}>
          <View style={styles.headerLeft}>
            <Ionicons name={cfg.icon as any} size={28} color={cfg.border} />
            <Text style={[styles.severityLabel, { color: cfg.border }]}>{cfg.label}</Text>
          </View>
          {!isCritical && (
            <TouchableOpacity onPress={handleDismiss} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={26} color={cfg.border} />
            </TouchableOpacity>
          )}
        </View>

        {/* Details */}
        <View style={styles.body}>
          <View style={styles.detailRow}>
            <Ionicons name="radio-outline" size={16} color="#374151" />
            <Text style={styles.detailLabel}>Node</Text>
            <Text style={styles.detailValue}>{alert.nodeName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="water-outline" size={16} color="#374151" />
            <Text style={styles.detailLabel}>Water Level</Text>
            <Text style={[styles.detailValue, { color: cfg.border, fontWeight: '800' }]}>
              {alert.waterLevelFeet.toFixed(2)} ft
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#374151" />
            <Text style={styles.detailLabel}>Zone</Text>
            <Text style={styles.detailValue}>{alert.zone}</Text>
          </View>
        </View>

        {/* Action message */}
        <View style={[styles.actionBox, { borderColor: cfg.border, backgroundColor: cfg.border + '18' }]}>
          <Text style={[styles.actionText, { color: isCritical ? '#991b1b' : '#78350f' }]}>
            {ACTION_TEXT[alert.severity]}
          </Text>
        </View>

        {/* Emergency contacts strip */}
        <View style={styles.contacts}>
          <Text style={styles.contactsLabel}>Emergency contacts:</Text>
          <View style={styles.contactsRow}>
            {[
              { label: 'Civil Defence', num: '991' },
              { label: 'Police', num: '999' },
              { label: 'Fire', num: '994' },
            ].map((c) => (
              <TouchableOpacity
                key={c.num}
                style={[styles.contactBtn, { borderColor: cfg.border }]}
                onPress={() => void Linking.openURL(`tel:${c.num}`)}
                activeOpacity={0.75}
              >
                <Ionicons name="call-outline" size={13} color={cfg.border} />
                <Text style={[styles.contactBtnText, { color: cfg.border }]}>{c.label} {c.num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CTA buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.mapBtn} onPress={handleViewMap} activeOpacity={0.85}>
            <Ionicons name="map-outline" size={15} color="#fff" />
            <Text style={styles.mapBtnText}>View Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dismissBtn, { borderColor: cfg.border }]}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            <Text style={[styles.dismissBtnText, { color: cfg.border }]}>
              {isCritical ? 'I am evacuating' : 'Dismiss'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timestamp */}
        <Text style={styles.timestamp}>
          {new Date(alert.timestamp).toLocaleString('en-MY')}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  severityLabel: { fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },
  closeBtn: { padding: 2 },
  body: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 13, color: '#6b7280', width: 90 },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#1f2937', flex: 1 },
  actionBox: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  actionText: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  contacts: { paddingHorizontal: 16, marginTop: 14, gap: 6 },
  contactsLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  contactsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  contactBtnText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 14 },
  mapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 13 },
  mapBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dismissBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 12, paddingVertical: 13 },
  dismissBtnText: { fontWeight: '700', fontSize: 14 },
  timestamp: { textAlign: 'center', fontSize: 11, color: '#9ca3af', paddingBottom: 12 },
});
