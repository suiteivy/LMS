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

// ── Launch Screen Skeleton (Replaces ActivityIndicator in index.native.tsx) ──

export const LaunchScreenSkeleton: React.FC = () => {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#070514',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
      }}
    >
      {/* Glowing logo mark placeholder */}
      <SkeletonCircle size={72} style={{ marginBottom: 24 }} />

      {/* Brand title placeholder */}
      <SkeletonBox width={140} height={22} borderRadius={11} style={{ marginBottom: 12 }} />

      {/* Subtitle placeholder */}
      <SkeletonBox width={180} height={14} borderRadius={7} style={{ marginBottom: 40 }} />

      {/* Ambient bottom card preview */}
      <View
        style={{
          width: '100%',
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 16,
          padding: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <SkeletonBox width="40%" height={12} style={{ marginBottom: 12 }} />
        <SkeletonBox width="100%" height={10} style={{ marginBottom: 8 }} />
        <SkeletonBox width="70%" height={10} />
      </View>
    </View>
  );
};

// ── Admin Dashboard Skeleton (Matches 2 hero stats + 2 progress bars + 6 actions) ──

export const AdminDashboardSkeleton: React.FC<{ loading?: boolean; label?: string }> = () => {
  const { isDark } = useTheme();
  const cardBg = isDark ? 'rgba(26,22,80,0.6)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : '#D0D7DE';

  return (
    <View style={{ padding: 16 }}>
      {/* 1. School Overview Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <SkeletonBox width="45%" height={18} style={{ marginBottom: 16 }} />

        {/* 2 Hero Stat Cards (Reflowed cleanly without Revenue) */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderRadius: 12,
              padding: 14,
            }}
          >
            <SkeletonBox width="60%" height={12} style={{ marginBottom: 8 }} />
            <SkeletonBox width="75%" height={26} style={{ marginBottom: 6 }} />
            <SkeletonBox width="40%" height={10} />
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderRadius: 12,
              padding: 14,
            }}
          >
            <SkeletonBox width="60%" height={12} style={{ marginBottom: 8 }} />
            <SkeletonBox width="75%" height={26} style={{ marginBottom: 6 }} />
            <SkeletonBox width="40%" height={10} />
          </View>
        </View>

        {/* 2 Progress Bars (Attendance Today & School Capacity) */}
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <SkeletonBox width="35%" height={12} />
            <SkeletonBox width="15%" height={12} />
          </View>
          <SkeletonBox width="100%" height={8} borderRadius={4} style={{ marginBottom: 4 }} />
          <SkeletonBox width="45%" height={10} />
        </View>

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <SkeletonBox width="35%" height={12} />
            <SkeletonBox width="15%" height={12} />
          </View>
          <SkeletonBox width="100%" height={8} borderRadius={4} style={{ marginBottom: 4 }} />
          <SkeletonBox width="45%" height={10} />
        </View>
      </View>

      {/* 2. Quick Actions Card (6 buttons in 2 columns) */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <SkeletonBox width="35%" height={18} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={{
                width: '48%',
                height: 54,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
              }}
            >
              <SkeletonCircle size={28} style={{ marginRight: 10 }} />
              <SkeletonBox width="55%" height={13} />
            </View>
          ))}
        </View>
      </View>

      {/* 3. Academic Operations Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
        }}
      >
        <SkeletonBox width="40%" height={18} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View
            style={{
              flex: 1,
              height: 48,
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SkeletonBox width="70%" height={14} />
          </View>
          <View
            style={{
              flex: 1,
              height: 48,
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SkeletonBox width="70%" height={14} />
          </View>
        </View>
      </View>
    </View>
  );
};

// ── Teacher Dashboard Skeleton (Matches mode switcher + 2 metrics + 4 actions + schedule) ──

export const TeacherDashboardSkeleton: React.FC<{ loading?: boolean; label?: string }> = () => {
  const { isDark } = useTheme();
  const cardBg = isDark ? 'rgba(26,22,80,0.6)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : '#D0D7DE';

  return (
    <View style={{ padding: 16 }}>
      {/* Role Mode Switcher Tabs */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 16,
        }}
      >
        <View style={{ flex: 1, height: 36, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <SkeletonBox width="60%" height={14} />
        </View>
        <View style={{ flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
          <SkeletonBox width="60%" height={14} />
        </View>
      </View>

      {/* Today's Overview Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <SkeletonBox width="40%" height={18} style={{ marginBottom: 16 }} />

        {/* 2 Metrics */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
            <SkeletonBox width="50%" height={12} style={{ marginBottom: 6 }} />
            <SkeletonBox width="70%" height={24} />
          </View>
          <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
            <SkeletonBox width="50%" height={12} style={{ marginBottom: 6 }} />
            <SkeletonBox width="70%" height={24} />
          </View>
        </View>

        {/* 4 Action Buttons */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                width: '48%',
                height: 48,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
              }}
            >
              <SkeletonCircle size={24} style={{ marginRight: 8 }} />
              <SkeletonBox width="60%" height={12} />
            </View>
          ))}
        </View>
      </View>

      {/* Today's Teaching Schedule Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
        }}
      >
        <SkeletonBox width="55%" height={18} style={{ marginBottom: 16 }} />

        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: i < 3 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB',
            }}
          >
            {/* Time badge */}
            <SkeletonBox width={85} height={28} borderRadius={8} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <SkeletonBox width="70%" height={14} style={{ marginBottom: 4 }} />
              <SkeletonBox width="45%" height={11} />
            </View>
            <SkeletonBox width={50} height={12} />
          </View>
        ))}
      </View>
    </View>
  );
};

// ── Student Dashboard Skeleton (Matches GPA/Attendance hero + lecture cards + actions) ──

export const StudentDashboardSkeleton: React.FC<{ loading?: boolean; label?: string }> = () => {
  const { isDark } = useTheme();
  const cardBg = isDark ? 'rgba(26,22,80,0.6)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : '#D0D7DE';

  return (
    <View style={{ padding: 16 }}>
      {/* 1. Academic Performance Hero Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <SkeletonBox width="45%" height={18} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* GPA Card */}
          <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 14 }}>
            <SkeletonBox width="50%" height={12} style={{ marginBottom: 8 }} />
            <SkeletonBox width="60%" height={28} style={{ marginBottom: 6 }} />
            <SkeletonBox width="40%" height={10} />
          </View>
          {/* Attendance Card */}
          <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 14 }}>
            <SkeletonBox width="50%" height={12} style={{ marginBottom: 8 }} />
            <SkeletonBox width="60%" height={28} style={{ marginBottom: 6 }} />
            <SkeletonBox width="40%" height={10} />
          </View>
        </View>
      </View>

      {/* 2. Today's Classes Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
          <SkeletonBox width="40%" height={18} />
          <SkeletonBox width="20%" height={14} />
        </View>

        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: i < 3 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB',
            }}
          >
            <SkeletonBox width={75} height={26} borderRadius={8} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <SkeletonBox width="65%" height={14} style={{ marginBottom: 4 }} />
              <SkeletonBox width="40%" height={11} />
            </View>
            <SkeletonBox width={45} height={12} />
          </View>
        ))}
      </View>

      {/* 3. Quick Actions Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
        }}
      >
        <SkeletonBox width="35%" height={18} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={{
                width: '48%',
                height: 52,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
              }}
            >
              <SkeletonCircle size={26} style={{ marginRight: 10 }} />
              <SkeletonBox width="55%" height={13} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ── Parent Dashboard Skeleton (Matches child switcher + hero profile + metrics + actions) ──

export const ParentDashboardSkeleton: React.FC<{ loading?: boolean; label?: string }> = () => {
  const { isDark } = useTheme();
  const cardBg = isDark ? 'rgba(26,22,80,0.6)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : '#D0D7DE';

  return (
    <View style={{ padding: 16 }}>
      {/* 1. Child Switcher Pill Row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <SkeletonBox width={100} height={34} borderRadius={17} />
        <SkeletonBox width={100} height={34} borderRadius={17} />
      </View>

      {/* 2. Child Profile Hero Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          marginBottom: 16,
        }}
      >
        {/* Child header with avatar, name, and class badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <SkeletonCircle size={48} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <SkeletonBox width="50%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonBox width="35%" height={12} />
          </View>
          <SkeletonBox width={65} height={24} borderRadius={12} />
        </View>

        {/* 2 Metrics: Average Grade & Attendance */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
            <SkeletonBox width="60%" height={11} style={{ marginBottom: 6 }} />
            <SkeletonBox width="50%" height={22} />
          </View>
          <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
            <SkeletonBox width="60%" height={11} style={{ marginBottom: 6 }} />
            <SkeletonBox width="50%" height={22} />
          </View>
        </View>
      </View>

      {/* 3. Quick Actions Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <SkeletonBox width="35%" height={18} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              style={{
                width: '48%',
                height: 52,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
              }}
            >
              <SkeletonCircle size={26} style={{ marginRight: 10 }} />
              <SkeletonBox width="55%" height={13} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ── Master Admin Dashboard Skeleton (Matches Maintenance card + Sweep card + 8 KPIs + Recent Inst) ──

export const MasterAdminDashboardSkeleton: React.FC<{ loading?: boolean; label?: string }> = () => {
  const { isDark } = useTheme();
  const cardBg = isDark ? '#161B22' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : '#D0D7DE';

  return (
    <View style={{ padding: 16 }}>
      {/* 1. Global Maintenance Mode Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SkeletonCircle size={32} style={{ marginRight: 10 }} />
            <SkeletonBox width={140} height={16} />
          </View>
          <SkeletonBox width={70} height={24} borderRadius={12} />
        </View>
        <SkeletonBox width="90%" height={12} style={{ marginBottom: 6 }} />
        <SkeletonBox width="60%" height={12} />
      </View>

      {/* 2. Lifecycle Sweep Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <SkeletonCircle size={32} style={{ marginRight: 10 }} />
          <SkeletonBox width={120} height={16} />
        </View>
        <SkeletonBox width="85%" height={12} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, height: 42, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
          <View style={{ flex: 1, height: 42, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
        </View>
      </View>

      {/* 3. Platform Metrics 8-KPI Grid (2x4) */}
      <SkeletonBox width="40%" height={18} style={{ marginBottom: 14 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <View
            key={i}
            style={{
              width: '48%',
              backgroundColor: cardBg,
              borderRadius: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: cardBorder,
              padding: 14,
            }}
          >
            <SkeletonCircle size={28} style={{ marginBottom: 10 }} />
            <SkeletonBox width="50%" height={20} style={{ marginBottom: 6 }} />
            <SkeletonBox width="70%" height={10} />
          </View>
        ))}
      </View>

      {/* 4. Recently Enrolled Institutions Card */}
      <SkeletonBox width="45%" height={18} style={{ marginBottom: 12 }} />
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
        }}
      >
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: i < 3 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB',
            }}
          >
            <SkeletonCircle size={36} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <SkeletonBox width="60%" height={14} style={{ marginBottom: 4 }} />
              <SkeletonBox width="35%" height={11} />
            </View>
            <SkeletonBox width={50} height={12} />
          </View>
        ))}
      </View>
    </View>
  );
};
