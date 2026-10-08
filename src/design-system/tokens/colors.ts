/**
 * Design System Color Tokens
 * Tailored palette inspired by mature mobility leaders (redBus & AbhiBus)
 * Supporting seamless Light and Dark modes.
 */

export const LightColors = {
  // Brand & Accents
  primary: '#D92D20',
  primaryDark: '#B42318',
  primaryLight: '#F04438',
  primarySoft: '#FEF3F2',
  primaryBorder: '#FECDCA',

  // Secondary & Accents
  secondary: '#0F172A',
  secondaryMuted: '#475569',
  accentGold: '#D97706',
  accentGoldSoft: '#FEF3C7',

  // Status & Feedback
  success: '#16A34A',
  successSoft: '#DCFCE7',
  successBorder: '#86EFAC',

  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  warningBorder: '#FDE68A',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  dangerBorder: '#FCA5A5',

  info: '#0284C7',
  infoSoft: '#E0F2FE',
  infoBorder: '#BAE6FD',

  // Surfaces & Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceCard: '#FFFFFF',
  surfaceHighlight: '#F8FAFC',

  // Borders & Dividers
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  divider: '#F1F5F9',

  // Typography
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  textPrimaryAccent: '#D92D20',

  // Bus & Seat Map Domain Specific
  seatAvailable: '#FFFFFF',
  seatAvailableBorder: '#94A3B8',
  seatSelected: '#16A34A',
  seatSelectedText: '#FFFFFF',
  seatBooked: '#E2E8F0',
  seatBookedBorder: '#CBD5E1',
  seatMale: '#0284C7',
  seatMaleSoft: '#E0F2FE',
  seatFemale: '#EC4899',
  seatFemaleSoft: '#FCE7F3',
  sleeperLength: '#F8FAFC',

  // Overlay & Backdrop
  backdrop: 'rgba(15, 23, 42, 0.65)',
  shimmerBase: '#E2E8F0',
  shimmerHighlight: '#F8FAFC',
};

export const DarkColors = {
  // Brand & Accents
  primary: '#EF4444',
  primaryDark: '#DC2626',
  primaryLight: '#F87171',
  primarySoft: '#2C1517',
  primaryBorder: '#7F1D1D',

  // Secondary & Accents
  secondary: '#F8FAFC',
  secondaryMuted: '#CBD5E1',
  accentGold: '#FBBF24',
  accentGoldSoft: '#38280B',

  // Status & Feedback
  success: '#22C55E',
  successSoft: '#143320',
  successBorder: '#166534',

  warning: '#FBBF24',
  warningSoft: '#332712',
  warningBorder: '#854D0E',

  danger: '#EF4444',
  dangerSoft: '#361517',
  dangerBorder: '#991B1B',

  info: '#38BDF8',
  infoSoft: '#0C2A40',
  infoBorder: '#075985',

  // Surfaces & Backgrounds
  background: '#0B1220',
  surface: '#111827',
  surfaceElevated: '#172033',
  surfaceSecondary: '#1E293B',
  surfaceCard: '#131D31',
  surfaceHighlight: '#1E2B45',

  // Borders & Dividers
  border: '#1E293B',
  borderStrong: '#334155',
  divider: '#1A2338',

  // Typography
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  textInverse: '#0B1220',
  textPrimaryAccent: '#EF4444',

  // Bus & Seat Map Domain Specific
  seatAvailable: '#172033',
  seatAvailableBorder: '#475569',
  seatSelected: '#22C55E',
  seatSelectedText: '#FFFFFF',
  seatBooked: '#232D42',
  seatBookedBorder: '#334155',
  seatMale: '#38BDF8',
  seatMaleSoft: '#0C2A40',
  seatFemale: '#F472B6',
  seatFemaleSoft: '#3B182B',
  sleeperLength: '#172033',

  // Overlay & Backdrop
  backdrop: 'rgba(0, 0, 0, 0.75)',
  shimmerBase: '#172033',
  shimmerHighlight: '#1E293B',
};

export type ThemeColors = typeof LightColors;
