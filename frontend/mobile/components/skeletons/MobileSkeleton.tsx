/**
 * MobileSkeleton
 * 
 * Animated skeleton loader components for mobile screens.
 * Uses a subtle pulse animation instead of the web shimmer effect.
 * Built with react-native Animated API for performance.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

// ── Pulse Animation Hook ───────────────────────────────────────────────────
function usePulseAnimation() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return opacity;
}

// ── Base Skeleton ──────────────────────────────────────────────────────────

interface SkeletonBoxProps {
  /** Width (number or string like '60%') */
  width?: number | string;
  /** Height in pixels */
  height?: number;
  /** Border radius (default: 8) */
  borderRadius?: number;
  /** Additional style */
  style?: ViewStyle;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const { isDark } = useTheme();
  const opacity = usePulseAnimation();

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          opacity,
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
};

// ── Circle Skeleton (avatar, icon) ─────────────────────────────────────────

interface SkeletonCircleProps {
  size?: number;
  style?: ViewStyle;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 40,
  style,
}) => {
  return (
    <SkeletonBox
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
};

// ── Card Skeleton ──────────────────────────────────────────────────────────

export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: isDark ? 'rgba(26,22,80,0.6)' : '#FFFFFF',
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#D0D7DE',
          padding: 16,
          marginBottom: 12,
        },
        style,
      ]}
    >
      <SkeletonBox width="45%" height={14} style={{ marginBottom: 12 }} />
      <SkeletonBox width="100%" height={12} style={{ marginBottom: 8 }} />
      <SkeletonBox width="75%" height={12} />
    </View>
  );
};

// ── List Item Skeleton ─────────────────────────────────────────────────────

export const SkeletonListItem: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB',
        },
        style,
      ]}
    >
      <SkeletonCircle size={40} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <SkeletonBox width="60%" height={14} style={{ marginBottom: 6 }} />
        <SkeletonBox width="40%" height={11} />
      </View>
      <SkeletonBox width={48} height={24} borderRadius={12} />
    </View>
  );
};

// ── Stat Card Skeleton (dashboard) ─────────────────────────────────────────

export const SkeletonStatCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: isDark ? 'rgba(26,22,80,0.6)' : '#FFFFFF',
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#D0D7DE',
          padding: 16,
          width: '48%',
          marginBottom: 12,
        },
        style,
      ]}
    >
      <SkeletonCircle size={32} style={{ marginBottom: 12 }} />
      <SkeletonBox width="50%" height={22} style={{ marginBottom: 8 }} />
      <SkeletonBox width="70%" height={12} />
    </View>
  );
};

// ── Dashboard Skeleton (full screen) ───────────────────────────────────────

export const DashboardSkeleton: React.FC = () => {
  return (
    <View style={{ padding: 16 }}>
      {/* Header area */}
      <View style={{ marginBottom: 24 }}>
        <SkeletonBox width="50%" height={24} style={{ marginBottom: 8 }} />
        <SkeletonBox width="70%" height={14} />
      </View>

      {/* Stat cards row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 }}>
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </View>

      {/* Quick actions */}
      <SkeletonBox width="30%" height={18} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              width: '48%',
              height: 56,
              borderRadius: 12,
              marginBottom: 8,
              overflow: 'hidden',
            }}
          >
            <SkeletonBox width="100%" height={56} borderRadius={12} />
          </View>
        ))}
      </View>

      {/* Recent activity */}
      <SkeletonBox width="40%" height={18} style={{ marginTop: 16, marginBottom: 12 }} />
      {[1, 2, 3].map((i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  );
};

// ── List Skeleton ──────────────────────────────────────────────────────────

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  );
};

// ── Detail View Skeleton ───────────────────────────────────────────────────

export const DetailSkeleton: React.FC = () => {
  return (
    <View style={{ padding: 16 }}>
      {/* Title */}
      <SkeletonBox width="60%" height={24} style={{ marginBottom: 8 }} />
      <SkeletonBox width="40%" height={14} style={{ marginBottom: 24 }} />

      {/* Info cards */}
      <SkeletonCard />
      <SkeletonCard />

      {/* Table-like section */}
      <SkeletonBox width="35%" height={18} style={{ marginBottom: 12 }} />
      {[1, 2, 3, 4].map((i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  );
};
