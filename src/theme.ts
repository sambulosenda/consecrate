/**
 * The whole visual language lives here: colour, type and spacing. Screens and
 * components read from this file and never hard-code a colour or font, so a
 * change of direction is a change in one place.
 *
 * Principles (from the PRD): calm, not gamified; readable for all ages.
 * Body text starts at 17pt and every control is at least 48pt tall.
 */

export const colors = {
  ground: '#F4F6F1',
  surface: '#FFFFFF',
  ink: '#17211D',
  inkSoft: '#2E3A34',
  muted: '#4C5A53',
  accent: '#1F5A4A',
  accentPressed: '#17443A',
  accentTint: '#DDE9E2',
  onAccent: '#FFFFFF',
  line: '#D5DCD4',
  lineStrong: '#AEBBB2',
  danger: '#9B2C2C',
} as const;

export const fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  control: 14,
  card: 16,
} as const;

export const controlHeight = 56;

export const type = {
  display: { fontFamily: fonts.serifMedium, fontSize: 34, lineHeight: 40, color: colors.ink },
  title: { fontFamily: fonts.serifMedium, fontSize: 28, lineHeight: 34, color: colors.ink },
  scripture: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, color: colors.ink },
  bodyLarge: { fontFamily: fonts.sansMedium, fontSize: 19, lineHeight: 27, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 26, color: colors.ink },
  bodyMuted: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 26, color: colors.muted },
  small: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.muted },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  button: { fontFamily: fonts.sansSemiBold, fontSize: 18, lineHeight: 24 },
} as const;
