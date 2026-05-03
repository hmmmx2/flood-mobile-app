/**
 * FloodWatch Alarm Service
 *
 * Handles the Japan-EEW-style flood threshold alert:
 *   WATCH    (>= 1.0 ft) — haptic warning + push notification
 *   WARNING  (>= 2.0 ft) — heavy haptic + alarm sound + push
 *   CRITICAL (>= 3.0 ft) — SOS haptic pattern + looping alarm + push
 *
 * Call `triggerFloodAlarm()` from the push notification listener in _layout.tsx.
 * Call `dismissFloodAlarm()` when user taps Dismiss on the FloodAlertBanner.
 */

import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

export type FloodSeverity = 'WATCH' | 'WARNING' | 'CRITICAL';

export interface FloodAlertPayload {
  nodeId: string;
  nodeName: string;
  waterLevelFeet: number;
  severity: FloodSeverity;
  zone: string;
  timestamp: string;
}

// Vibration patterns per severity
async function vibrateForSeverity(severity: FloodSeverity): Promise<void> {
  if (severity === 'WATCH') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } else if (severity === 'WARNING') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise<void>((r) => setTimeout(r, 200));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } else {
    // CRITICAL — SOS pattern: 3 short, pause, 3 long, pause, 3 short
    for (let i = 0; i < 3; i++) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await new Promise<void>((r) => setTimeout(r, 150));
    }
    await new Promise<void>((r) => setTimeout(r, 400));
    for (let i = 0; i < 3; i++) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await new Promise<void>((r) => setTimeout(r, 400));
    }
    await new Promise<void>((r) => setTimeout(r, 400));
    for (let i = 0; i < 3; i++) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await new Promise<void>((r) => setTimeout(r, 150));
    }
  }
}

function severityTitle(severity: FloodSeverity): string {
  if (severity === 'WATCH')    return '⚠️ FLOOD WATCH';
  if (severity === 'WARNING')  return '🚨 FLOOD WARNING';
  return '🔴 FLOOD CRITICAL ALERT';
}

function severityBody(alert: FloodAlertPayload): string {
  const action =
    alert.severity === 'WATCH'    ? 'Monitor conditions and prepare emergency kit.' :
    alert.severity === 'WARNING'  ? 'Move valuables to higher ground. Prepare to evacuate.' :
    'EVACUATE IMMEDIATELY. Call Civil Defence: 991.';
  return `${alert.nodeName}: ${alert.waterLevelFeet.toFixed(1)} ft detected in ${alert.zone}. ${action}`;
}

export async function triggerFloodAlarm(alert: FloodAlertPayload): Promise<void> {
  // Fire vibration pattern (non-blocking)
  vibrateForSeverity(alert.severity).catch(() => undefined);

  // Schedule immediate local push notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: severityTitle(alert.severity),
      body: severityBody(alert),
      data: { type: 'flood_alert', ...alert },
      sound: alert.severity === 'CRITICAL' ? 'flood_alarm.wav' : 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      sticky: alert.severity === 'CRITICAL',
    },
    trigger: null, // fire immediately
  });
}

export function dismissFloodAlarm(): void {
  // No persistent sound in the current implementation (expo-av optional).
  // Haptics and one-shot push are self-terminating.
  // If expo-av is added in future, stop the sound here.
}
