/**
 * Mobile Platform Utilities
 * 
 * Shared helpers for mobile-specific screens and components.
 * These utilities provide consistent platform behavior across the mobile app.
 */

import { Platform, Dimensions, StatusBar } from 'react-native';

/** True on iOS and Android, false on web */
export const IS_NATIVE = Platform.OS !== 'web';
export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';

/** Screen dimensions (use useWindowDimensions for reactive values) */
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
export { SCREEN_WIDTH, SCREEN_HEIGHT };

/** Standard touch target minimum (44pt per Apple HIG / 48dp per Material) */
export const MIN_TOUCH_TARGET = Platform.OS === 'ios' ? 44 : 48;

/** Standard spacing scale for mobile layouts */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

/** Status bar height helper for Android (iOS uses SafeAreaView) */
export const ANDROID_STATUS_BAR_HEIGHT = IS_ANDROID ? (StatusBar.currentHeight ?? 24) : 0;

/**
 * Design tokens matching the Cloudora LMS visual identity.
 * Shared across all mobile screens for consistency.
 */
export const mobileColors = {
  // Brand
  flame: '#FF6B00',
  flameDim: 'rgba(255,107,0,0.8)',
  flameGlow: 'rgba(255,107,0,0.35)',
  flameBg: 'rgba(255,107,0,0.12)',
  
  // Dark theme (primary mobile theme)
  bgDeep: '#070514',
  bgPrimary: '#0F0B2E',
  bgSurface: '#13103A',
  bgCard: '#1A1650',
  borderSubtle: 'rgba(255,255,255,0.1)',
  
  // Light theme
  bgLight: '#ffffff',
  bgLightSurface: '#F6F8FA',
  bgLightCard: '#FFFFFF',
  borderLight: '#D0D7DE',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.45)',
  textDark: '#111827',
  textDarkSecondary: '#6B7280',
  
  // Tab bar
  tabBarDark: '#161B22',
  tabBarLight: '#ffffff',
  tabBarBorderDark: '#1f2937',
  tabBarBorderLight: '#e5e7eb',
  tabBarActiveTint: '#FF6B00',
  tabBarInactiveDark: '#94a3b8',
  tabBarInactiveLight: '#64748b',
} as const;
