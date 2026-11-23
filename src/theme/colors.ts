export const colors = {
  // Brand & Primary
  primary: '#0F766E',       // Verde petróleo profundo (confianza y energía)
  primaryDark: '#115E59',
  primaryLight: '#CCFBF1',
  primarySurface: '#F0FDFA',

  // Secondary & Accent
  accent: '#F59E0B',        // Ámbar para estrellas y destacados
  accentLight: '#FEF3C7',

  // Fuel types
  fuelRegular: '#16A34A',   // Magna / Regular (Verde)
  fuelRegularBg: '#DCFCE7',
  fuelPremium: '#DC2626',   // Premium (Rojo)
  fuelPremiumBg: '#FEE2E2',
  fuelDiesel: '#1E293B',    // Diésel (Gris oscuro / Negro)
  fuelDieselBg: '#E2E8F0',

  // Semantic states
  success: '#15803D',
  successBg: '#DCFCE7',
  warning: '#B45309',
  warningBg: '#FEF3C7',
  danger: '#B91C1C',
  dangerBg: '#FEE2E2',

  // Profeco Certification
  profecoBlue: '#1D4ED8',
  profecoBg: '#DBEAFE',
  profecoBorder: '#93C5FD',

  // Neutrals
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',

  // Shadows & overlays
  shadow: '#0F172A',
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

export type ColorToken = keyof typeof colors;
