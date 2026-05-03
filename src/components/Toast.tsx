/**
 * Lightweight toast notification system — no external dependencies.
 *
 * Usage:
 *   import { showToast } from '@/src/components/Toast';
 *
 *   showToast({ message: 'Sensor added to favourites', type: 'success' });
 *   showToast({ message: 'Failed to update settings', type: 'error' });
 *
 * Mount <ToastProvider /> once in _layout.tsx (inside RootLayoutNav return).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (msg: ToastMessage) => void;

// ── Simple event bus (no context / Zustand needed) ────────────────────────────
let _listener: Listener | null = null;
let _idCounter = 0;

export function showToast(opts: { message: string; type?: ToastType }): void {
  _listener?.({
    id: ++_idCounter,
    message: opts.message,
    type: opts.type ?? 'info',
  });
}

// ── Single toast item ─────────────────────────────────────────────────────────

const ICONS: Record<ToastType, { name: string; color: string; bg: string }> = {
  success: { name: 'checkmark-circle',  color: '#16a34a', bg: '#f0fdf4' },
  error:   { name: 'close-circle',      color: '#dc2626', bg: '#fef2f2' },
  info:    { name: 'information-circle', color: '#2563eb', bg: '#eff6ff' },
};

function ToastItem({ msg, onDone }: { msg: ToastMessage; onDone: () => void }) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const cfg = ICONS[msg.type];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => onDone());
    }, 2800);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.toast, { backgroundColor: cfg.bg, opacity, transform: [{ translateY }] }]}>
      <Ionicons name={cfg.name as any} size={18} color={cfg.color} />
      <Text style={[styles.toastText, { color: cfg.color }]} numberOfLines={2}>{msg.message}</Text>
    </Animated.View>
  );
}

// ── Provider — mount once inside RootLayoutNav ────────────────────────────────

export function ToastProvider() {
  const [queue, setQueue] = useState<ToastMessage[]>([]);

  const addToast = useCallback((msg: ToastMessage) => {
    setQueue((q) => [...q.slice(-2), msg]); // max 3 visible
  }, []);

  useEffect(() => {
    _listener = addToast;
    return () => { _listener = null; };
  }, [addToast]);

  const remove = useCallback((id: number) => {
    setQueue((q) => q.filter((m) => m.id !== id));
  }, []);

  if (queue.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {queue.map((msg) => (
        <ToastItem key={msg.id} msg={msg} onDone={() => remove(msg.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9998,
    gap: 8,
    alignItems: 'stretch',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});
