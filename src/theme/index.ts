// ─────────────────────────────────────────────────────────────────────────────
// flood-mobile-app — Design Tokens
// Mirrors the flood-website-community CSS variable system
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // ── Pop Up brand palette ────────────────────────────────────
  brand:      '#1d4ed8',   // primary blue CTA
  brandDark:  '#1e40af',   // hover / pressed
  brandLight: '#dbeafe',   // tint background
  navy:       '#1e3a8a',   // deep navy
  teal:       '#0891b2',   // secondary accent
  cyan:       '#06b6d4',   // cyan highlight

  // ── Surfaces ────────────────────────────────────────────────
  bg:         '#eef2ff',
  card:       '#ffffff',
  border:     '#e2e8f0',
  text:       '#1e293b',
  muted:      '#64748b',
  inputBg:    '#f8fafc',
  hover:      '#eff6ff',
  pillBg:     '#f1f5f9',

  // ── Flood status (keep red semantics for safety) ────────────
  success:    '#22c55e',
  warning:    '#f59e0b',
  danger:     '#ef4444',
  critical:   '#7f1d1d',
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
} as const;

export const typography = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  h1:   28,
} as const;
