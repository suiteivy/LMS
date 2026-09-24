/**
 * Admin Dashboard — Mobile-Native Screen
 * 
 * Mobile-optimized version of the Admin dashboard that provides:
 * - Native-feeling layout with proper safe areas
 * - Skeleton loading states (not the web AppLoading spinner)
 * - Pull-to-refresh
 * - Touch-optimized card sizes and spacing
 * - Same business logic (useAuth, useDashboardStats, useSubscriptionTier)
 * 
 * The web version (app/(admin)/index.tsx) remains completely untouched.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  LogOut,
  RefreshCw,
  UserPlus,
  Wallet,
  Users,
  GraduationCap,
  Clock,
} from 'lucide-react-native';

// Shared business logic — NOT duplicated
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';

// Mobile-specific components
import { MobileScreenWrapper } from '@/mobile/components/common/MobileScreenWrapper';
import { MobileHeader } from '@/mobile/components/common/MobileHeader';
import { MobileCard } from '@/mobile/components/common/MobileCard';
import { DashboardSkeleton } from '@/mobile/components/skeletons/MobileSkeleton';
import { mobileColors, MIN_TOUCH_TARGET, spacing } from '@/mobile/utils/platform';
import { SubscriptionBanner, SubscriptionGate } from '@/components/shared/SubscriptionComponents';

// Cast icons for RN compatibility
const IconUserPlus = UserPlus as any;
const IconWallet = Wallet as any;
const IconBookOpen = BookOpen as any;
const IconBarChart3 = BarChart3 as any;
const IconLogOut = LogOut as any;
const IconCalendar = Calendar as any;
const IconClipboardList = ClipboardList as any;
const IconRefreshCw = RefreshCw as any;
const IconUsers = Users as any;
const IconGraduationCap = GraduationCap as any;
const IconClock = Clock as any;

// ── Quick Action Button (mobile-optimized) ─────────────────────────────────

interface QuickActionProps {
  icon: any;
  label: string;
  onPress: () => void;
}

const QuickAction = ({ icon: Icon, label, onPress }: QuickActionProps) => {
  const { isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.quickAction,
        {
          backgroundColor: isDark ? mobileColors.bgCard : mobileColors.bgLightCard,
          borderColor: isDark ? mobileColors.borderSubtle : mobileColors.borderLight,
        },
      ]}
    >
      <View style={styles.quickActionIcon}>
        <Icon size={20} color={mobileColors.flame} strokeWidth={2} />
      </View>
      <Text
        style={[
          styles.quickActionLabel,
          { color: isDark ? mobileColors.textPrimary : mobileColors.textDark },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ── Stat Card (mobile-optimized) ───────────────────────────────────────────

interface StatDisplayProps {
  label: string;
  value: string;
  sublabel?: string;
  accentColor?: string;
}

const StatDisplay = ({ label, value, sublabel, accentColor }: StatDisplayProps) => {
  const { isDark } = useTheme();

  return (
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: isDark ? mobileColors.textSecondary : mobileColors.textDarkSecondary }]}>
        {label}
      </Text>
      <Text
        style={[styles.statValue, { color: accentColor || (isDark ? mobileColors.textPrimary : mobileColors.textDark) }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {sublabel && (
        <Text style={[styles.statSublabel, { color: isDark ? mobileColors.textMuted : mobileColors.textDarkSecondary }]}>
          {sublabel}
        </Text>
      )}
    </View>
  );
};

// ── Progress Bar ───────────────────────────────────────────────────────────

const ProgressBar = ({ value, label, sublabel }: { value: string; label: string; sublabel?: string }) => {
  const { isDark } = useTheme();
  const percentage = parseFloat(value) || 0;

  return (
    <MobileCard>
      <View style={styles.progressHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.progressTitle, { color: isDark ? mobileColors.textPrimary : mobileColors.textDark }]}>
            {label}
          </Text>
          {sublabel && (
            <Text style={[styles.progressSubtitle, { color: isDark ? mobileColors.textMuted : mobileColors.textDarkSecondary }]}>
              {sublabel}
            </Text>
          )}
        </View>
        <Text style={[styles.progressValue, { color: isDark ? mobileColors.textPrimary : mobileColors.textDark }]}>
          {value}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EAEEF2' }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(percentage, 100)}%` as any },
          ]}
        />
      </View>
    </MobileCard>
  );
};

// ── Main Dashboard Screen ──────────────────────────────────────────────────

export const AdminDashboardMobile: React.FC = () => {
  const { profile, subscriptionPlan, isMain, logout } = useAuth();
  const { stats, loading, refresh: refreshStats } = useDashboardStats();
  const { isDark } = useTheme();
  const tier = useSubscriptionTier();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshStats();
    } finally {
      setRefreshing(false);
    }
  }, [refreshStats]);

  // Extract stats
  const attendanceValue = stats.find((s) => s.label === 'Attendance')?.value || '0%';
  const attendanceSub = stats.find((s) => s.label === 'Attendance')?.subValue || 'No data recorded today';
  const revenueStat = stats.find((s) => s.label === 'Revenue');
  const totalStudents = parseInt(stats.find((s) => s.label === 'Total Students')?.value || '0');
  const totalTeachers = parseInt(stats.find((s) => s.label === 'Teachers')?.value || '0');
  const totalUsers = totalStudents + totalTeachers;
  const planMax =
    subscriptionPlan === 'beta' ? 30
    : subscriptionPlan === 'basic' ? 900
    : subscriptionPlan === 'pro' ? 1000
    : 5000;
  const capacityPct = `${Math.min((totalStudents / planMax) * 100, 100).toFixed(0)}%`;

  const formatNum = (v: number) => (v > 100 ? v.toLocaleString() : `${v}`);

  // Right action: logout button
  const logoutAction = (
    <TouchableOpacity
      onPress={async () => await logout()}
      style={styles.logoutButton}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Sign out"
    >
      <IconLogOut size={20} color="#ef4444" strokeWidth={2} />
    </TouchableOpacity>
  );

  // Right action: refresh button
  const refreshAction = (
    <TouchableOpacity
      onPress={handleRefresh}
      disabled={refreshing}
      style={[styles.refreshButton, { opacity: refreshing ? 0.5 : 1 }]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Refresh dashboard"
    >
      <IconRefreshCw size={18} color={mobileColors.flame} strokeWidth={2} />
    </TouchableOpacity>
  );

  // Show skeleton while loading initial data
  if (loading && stats.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface }}>
        <MobileHeader
          title="Dashboard"
          subtitle="Loading..."
          largeTitle
          rightAction={logoutAction}
        />
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface }}>
      <SubscriptionBanner />
      <MobileHeader
        title={`Welcome back,`}
        subtitle={profile?.full_name || 'Administrator'}
        largeTitle
        rightAction={logoutAction}
        rightActionSecondary={refreshAction}
      />

      <MobileScreenWrapper
        scrollable
        refreshing={refreshing}
        onRefresh={handleRefresh}
        skipTopInset
      >
        {/* ── Hero Stats Row ── */}
        <View style={styles.statsRow}>
          {tier.showFinancials && revenueStat && (
            <StatDisplay label="Revenue" value={revenueStat.value} />
          )}
          <StatDisplay label="Total Users" value={formatNum(totalUsers)} accentColor={mobileColors.flame} />
          <StatDisplay label="Students" value={formatNum(totalStudents)} />
        </View>

        {/* ── Today's Presence ── */}
        <ProgressBar
          value={attendanceValue}
          label="Today's Presence"
          sublabel={attendanceSub}
        />

        {/* ── Institution Capacity ── */}
        <SubscriptionGate minPlan="basic">
          <ProgressBar
            value={capacityPct}
            label="Institution Capacity"
            sublabel={`${formatNum(totalStudents)} enrolled of ${formatNum(planMax)} limit`}
          />
        </SubscriptionGate>

        {/* ── Quick Actions ── */}
        <Text
          style={[
            styles.sectionTitle,
            { color: isDark ? mobileColors.textPrimary : mobileColors.textDark },
          ]}
        >
          Quick Actions
        </Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon={IconUserPlus}
            label="Enroll User"
            onPress={() => router.push({ pathname: '/(admin)/users/create', params: { backTo: '/(admin)' } })}
          />
          <SubscriptionGate feature="library">
            <QuickAction
              icon={IconBookOpen}
              label="Library"
              onPress={() => router.navigate({ pathname: '/(admin)/management/library', params: { backTo: '/(admin)' } } as any)}
            />
          </SubscriptionGate>
          <SubscriptionGate feature="finance">
            <QuickAction
              icon={IconWallet}
              label="Finance"
              onPress={() => router.navigate({ pathname: '/(admin)/finance', params: { backTo: '/(admin)' } } as any)}
            />
          </SubscriptionGate>
          <SubscriptionGate feature="analytics">
            <QuickAction
              icon={IconBarChart3}
              label="Analytics"
              onPress={() => router.navigate({ pathname: '/(admin)/management/analytics', params: { backTo: '/(admin)' } } as any)}
            />
          </SubscriptionGate>
          <QuickAction
            icon={IconCalendar}
            label="Attendance"
            onPress={() => router.push({ pathname: '/(admin)/attendance', params: { backTo: '/(admin)' } } as any)}
          />
          <QuickAction
            icon={IconClipboardList}
            label="Results & Cards"
            onPress={() => router.push({ pathname: '/(admin)/results', params: { backTo: '/(admin)' } } as any)}
          />
        </View>
      </MobileScreenWrapper>
    </View>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statSublabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  quickAction: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: MIN_TOUCH_TARGET,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  quickActionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  progressValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: mobileColors.flame,
    borderRadius: 3,
  },
  logoutButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdminDashboardMobile;
