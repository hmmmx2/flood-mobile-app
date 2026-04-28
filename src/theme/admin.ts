/**
 * Admin / CRM Design Tokens — dark theme used on all admin screens.
 * Mirrors flood-website-crm CSS variables exactly.
 * Import this file in admin screens and CRM UI components.
 */

export const colors = {
  // ── Brand ────────────────────────────────────────────────────────────────
  primary: '#1d4ed8',
  primaryDim: 'rgba(29,78,216,0.15)',

  // ── Backgrounds ──────────────────────────────────────────────────────────
  background: '#1A1A2E',
  card: '#16213E',
  cardAlt: '#1E2A40',
  overlay: 'rgba(0,0,0,0.6)',

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#2D3A5A',
  borderLight: 'rgba(45,58,90,0.5)',

  // ── Text ─────────────────────────────────────────────────────────────────
  textPrimary: '#E8E8E8',
  textSecondary: '#A0A0A0',
  textMuted: '#6B7280',

  // ── Status ────────────────────────────────────────────────────────────────
  status: {
    normal: '#56E40A',
    watch: '#FFD54F',
    warning: '#FF9F1C',
    critical: '#D7263D',
    offline: '#6B7280',
  },

  // ── Status dim (badge backgrounds) ───────────────────────────────────────
  statusDim: {
    normal: 'rgba(86,228,10,0.12)',
    watch: 'rgba(255,213,79,0.15)',
    warning: 'rgba(255,159,28,0.15)',
    critical: 'rgba(215,38,55,0.15)',
    offline: 'rgba(107,114,128,0.15)',
  },

  // ── UI Surface ────────────────────────────────────────────────────────────
  inputBg: '#0F1523',
  tabBar: '#16213E',
  divider: '#2D3A5A',
  skeleton: '#2D3A5A',
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
    case 1: return 'Alert';
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
