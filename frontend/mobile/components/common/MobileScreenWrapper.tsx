/**
 * MobileScreenWrapper
 * 
 * Standard wrapper for all mobile screens providing:
 * - Proper safe area handling (top + bottom)
 * - Consistent background color (dark/light theme aware)
 * - Optional pull-to-refresh
 * - Optional scroll behavior (ScrollView vs static View)
 * 
 * Usage:
 *   <MobileScreenWrapper scrollable refreshing={isRefreshing} onRefresh={handleRefresh}>
 *     <YourContent />
 *   </MobileScreenWrapper>
 */

import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { mobileColors } from '@/mobile/utils/platform';

interface MobileScreenWrapperProps {
  children: React.ReactNode;
  /** Whether the content should be scrollable (default: true) */
  scrollable?: boolean;
  /** Pull-to-refresh state */
  refreshing?: boolean;
  /** Pull-to-refresh handler */
  onRefresh?: () => void;
  /** Skip top safe area padding (e.g., when a custom header handles it) */
  skipTopInset?: boolean;
  /** Skip bottom safe area padding (e.g., when tab bar handles it) */
  skipBottomInset?: boolean;
  /** Additional style for the container */
  style?: ViewStyle;
  /** Additional style for the content area inside scroll */
  contentStyle?: ViewStyle;
}

export const MobileScreenWrapper: React.FC<MobileScreenWrapperProps> = ({
  children,
  scrollable = true,
  refreshing = false,
  onRefresh,
  skipTopInset = false,
  skipBottomInset = true, // Tab bar usually handles bottom
  style,
  contentStyle,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface,
    paddingTop: skipTopInset ? 0 : insets.top,
    paddingBottom: skipBottomInset ? 0 : insets.bottom,
    ...style,
  };

  if (!scrollable) {
    return <View style={containerStyle}>{children}</View>;
  }

  return (
    <ScrollView
      style={containerStyle}
      contentContainerStyle={[{ paddingBottom: 24 }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={mobileColors.flame}
            colors={[mobileColors.flame]}
            progressBackgroundColor={isDark ? mobileColors.bgSurface : mobileColors.bgLightCard}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
};

export default MobileScreenWrapper;
