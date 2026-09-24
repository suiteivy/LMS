/**
 * MobileCard
 * 
 * Standard card component for mobile screens.
 * Replaces web-style cards with mobile-appropriate styling:
 * - Correct border radius and shadow for mobile
 * - Touch feedback (opacity reduction on press)
 * - Theme-aware
 * - Consistent padding and spacing
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { mobileColors } from '@/mobile/utils/platform';

interface MobileCardProps {
  children: React.ReactNode;
  /** Make the card pressable */
  onPress?: () => void;
  /** Additional style */
  style?: StyleProp<ViewStyle>;
  /** Remove default padding (default: false) */
  noPadding?: boolean;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  onPress,
  style,
  noPadding = false,
}) => {
  const { isDark } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: isDark ? mobileColors.bgCard : mobileColors.bgLightCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? mobileColors.borderSubtle : mobileColors.borderLight,
    padding: noPadding ? 0 : 16,
    marginBottom: 12,
    // Shadow
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 8,
        }
      : {
          elevation: isDark ? 4 : 2,
        }),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};

export default MobileCard;
