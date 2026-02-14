/**
 * Design Tokens (TypeScript)
 *
 * These reference CSS custom properties for runtime access to theme values.
 * For styling, prefer using CSS custom properties directly.
 */

export const colors = {
  primary: 'var(--cliffy-color-primary)',
  primaryHover: 'var(--cliffy-color-primary-hover)',
  primaryActive: 'var(--cliffy-color-primary-active)',
  primaryLight: 'var(--cliffy-color-primary-light)',

  secondary: 'var(--cliffy-color-secondary)',
  secondaryHover: 'var(--cliffy-color-secondary-hover)',
  secondaryActive: 'var(--cliffy-color-secondary-active)',
  secondaryLight: 'var(--cliffy-color-secondary-light)',

  success: 'var(--cliffy-color-success)',
  successHover: 'var(--cliffy-color-success-hover)',
  successActive: 'var(--cliffy-color-success-active)',
  successLight: 'var(--cliffy-color-success-light)',

  warning: 'var(--cliffy-color-warning)',
  warningHover: 'var(--cliffy-color-warning-hover)',
  warningActive: 'var(--cliffy-color-warning-active)',
  warningLight: 'var(--cliffy-color-warning-light)',

  error: 'var(--cliffy-color-error)',
  errorHover: 'var(--cliffy-color-error-hover)',
  errorActive: 'var(--cliffy-color-error-active)',
  errorLight: 'var(--cliffy-color-error-light)',

  foreground: 'var(--cliffy-color-foreground)',
  background: 'var(--cliffy-color-background)',
  muted: 'var(--cliffy-color-muted)',
  border: 'var(--cliffy-color-border)',
} as const;

export const spacing = {
  xs: 'var(--cliffy-space-xs)',
  sm: 'var(--cliffy-space-sm)',
  md: 'var(--cliffy-space-md)',
  lg: 'var(--cliffy-space-lg)',
  xl: 'var(--cliffy-space-xl)',
} as const;

export const typography = {
  fontSans: 'var(--cliffy-font-sans)',
  fontMono: 'var(--cliffy-font-mono)',

  textXs: 'var(--cliffy-text-xs)',
  textSm: 'var(--cliffy-text-sm)',
  textMd: 'var(--cliffy-text-md)',
  textLg: 'var(--cliffy-text-lg)',
  textXl: 'var(--cliffy-text-xl)',
  text2xl: 'var(--cliffy-text-2xl)',
  text3xl: 'var(--cliffy-text-3xl)',

  fontNormal: 'var(--cliffy-font-normal)',
  fontMedium: 'var(--cliffy-font-medium)',
  fontSemibold: 'var(--cliffy-font-semibold)',
  fontBold: 'var(--cliffy-font-bold)',
} as const;

export const radii = {
  sm: 'var(--cliffy-radius-sm)',
  md: 'var(--cliffy-radius-md)',
  lg: 'var(--cliffy-radius-lg)',
  xl: 'var(--cliffy-radius-xl)',
  full: 'var(--cliffy-radius-full)',
} as const;

export const shadows = {
  sm: 'var(--cliffy-shadow-sm)',
  md: 'var(--cliffy-shadow-md)',
  lg: 'var(--cliffy-shadow-lg)',
} as const;

export const transitions = {
  fast: 'var(--cliffy-duration-fast)',
  normal: 'var(--cliffy-duration-normal)',
  slow: 'var(--cliffy-duration-slow)',
  easing: 'var(--cliffy-easing)',
} as const;

/**
 * All tokens combined for easy access.
 */
export const tokens = {
  colors,
  spacing,
  typography,
  radii,
  shadows,
  transitions,
} as const;
