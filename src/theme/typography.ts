import { TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: -0.4,
  } satisfies TextStyle,
  h2: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: -0.2,
  } satisfies TextStyle,
  h3: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  } satisfies TextStyle,
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  } satisfies TextStyle,
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } satisfies TextStyle,
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } satisfies TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  } satisfies TextStyle,
  micro: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  priceLarge: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
  priceMedium: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
  button: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  } satisfies TextStyle,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
