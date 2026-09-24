/**
 * MobileHeader
 * 
 * Compact, native-feeling header for mobile screens.
 * Features:
 * - Large title with optional subtitle
 * - Left action (back button) and right action slots
 * - Safe area aware
 * - Theme-aware (dark/light)
 * - Optional profile avatar/greeting
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronLeft } from 'lucide-react-native';
import { mobileColors, MIN_TOUCH_TARGET } from '@/mobile/utils/platform';

const IconChevronLeft = ChevronLeft as any;

interface MobileHeaderProps {
  /** Main title text */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Show back button (default: false) */
  showBack?: boolean;
  /** Back button handler */
  onBack?: () => void;
  /** Right-side action element (e.g., settings icon, notification bell) */
  rightAction?: React.ReactNode;
  /** Additional right-side action element */
  rightActionSecondary?: React.ReactNode;
  /** Use large title style (default: false) */
  largeTitle?: boolean;
  /** Additional style for the header container */
  style?: ViewStyle;
  /** Whether to add top safe area inset (default: true) */
  withSafeArea?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  rightActionSecondary,
  largeTitle = false,
  style,
  withSafeArea = true,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const textColor = isDark ? mobileColors.textPrimary : mobileColors.textDark;
  const subtitleColor = isDark ? mobileColors.textSecondary : mobileColors.textDarkSecondary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface,
          paddingTop: withSafeArea ? insets.top + 8 : 8,
          borderBottomColor: isDark ? mobileColors.borderSubtle : mobileColors.borderLight,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {/* Left action (back button) */}
        {showBack && onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <IconChevronLeft size={24} color={textColor} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        {/* Title area */}
        {!largeTitle && (
          <View style={styles.titleContainer}>
            <Text
              style={[styles.title, { color: textColor }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[styles.subtitle, { color: subtitleColor }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        )}

        {/* Right actions */}
        <View style={styles.rightActions}>
          {rightActionSecondary}
          {rightAction}
        </View>
      </View>

      {/* Large title (below the nav row) */}
      {largeTitle && (
        <View style={styles.largeTitleContainer}>
          <Text style={[styles.largeTitleText, { color: textColor }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.largeTitleSubtitle, { color: subtitleColor }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  backPlaceholder: {
    width: 8,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  largeTitleContainer: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  largeTitleText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  largeTitleSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default MobileHeader;
