/**
 * Admin / CRM Design Tokens — dark theme used on all admin screens.
 * Mirrors flood-website-crm CSS variables exactly.
 * Import this file in admin screens and CRM UI components.
 */

export const colors = {
  // ── Brand ────────────────────────────────────────────────────────────────
  primary:    '#1d4ed8',
  primaryDim: 'rgba(29,78,216,0.15)',

  // ── Backgrounds ──────────────────────────────────────────────────────────
  background: '#060d1a',
  card:       '#0d1f3d',
  cardAlt:    '#0f2347',
  overlay:    'rgba(0,0,0,0.6)',

  // ── Borders ───────────────────────────────────────────────────────────────
  border:      '#1e3a5f',
  borderLight: 'rgba(30,58,95,0.5)',

  // ── Text ─────────────────────────────────────────────────────────────────
  textPrimary:   '#e8edf5',
  textSecondary: '#8899b8',
  textMuted:     '#5a6a8a',

  // ── Status ────────────────────────────────────────────────────────────────
  status: {
    normal:   '#16a34a',
    watch:    '#d97706',
    warning:  '#ea580c',
    critical: '#dc2626',
    offline:  '#6B7280',
  },

  // ── Status dim (badge backgrounds) ───────────────────────────────────────
  statusDim: {
    normal:   'rgba(22,163,74,0.12)',
    watch:    'rgba(217,119,6,0.15)',
    warning:  'rgba(234,88,12,0.15)',
    critical: 'rgba(220,38,38,0.15)',
    offline:  'rgba(107,114,128,0.15)',
  },

  // ── UI Surface ────────────────────────────────────────────────────────────
  inputBg:  '#0a1628',
  tabBar:   '#0d1f3d',
  divider:  '#1e3a5f',
  skeleton: '#1e3a5f',
} as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.textPrimary },
  h3: { fontSize: 17, fontWeight: '700' as const, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary },
  label: { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary, letterSpacing: 0.5 },
  labelUpper: { fontSize: 11, fontWeight: '700' as const, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' as const },
  value: { fontSize: 28, fontWeight: '800' as const, color: colors.textPrimary },
  valueMedium: { fontSize: 20, fontWeight: '700' as const, color: colors.textPrimary },
  caption: { fontSize: 11, fontWeight: '400' as const, color: colors.textMuted },
  badge: { fontSize: 11, fontWeight: '700' as const },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
} as const;

/** Maps water level (0–3) to status colour */
export function getLevelColor(level: number): string {
  switch (level) {
    case 0: return colors.status.normal;
    case 1: return colors.status.watch;
    case 2: return colors.status.warning;
    case 3: return colors.status.critical;
    default: return colors.status.offline;
  }
}

export function getLevelLabel(level: number): string {
  switch (level) {
    case 0: return 'Normal';
    case 1: return 'Watch';
    case 2: return 'Warning';
    case 3: return 'Critical';
    default: return 'Unknown';
  }
}

export function getLevelDim(level: number): string {
  switch (level) {
    case 0: return colors.statusDim.normal;
    case 1: return colors.statusDim.watch;
    case 2: return colors.statusDim.warning;
    case 3: return colors.statusDim.critical;
    default: return colors.statusDim.offline;
  }
}
