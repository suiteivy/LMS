/**
 * Master Admin Dashboard — Mobile-Native Screen
 * 
 * Mobile-optimized version of the Master Admin dashboard providing:
 * - Native layout with proper safe areas and zero bottom tab bar clipping
 * - Platform-wide KPI grid (Institutions, Subscriptions, Users, Tickets)
 * - Global maintenance mode controls
 * - Subscription lifecycle sweep controls
 * - Recently enrolled institutions list
 * - Mobile skeleton loading state & pull-to-refresh
 * - Preserves web version intact (app/(master-admin)/index.tsx untouched)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Building2,
  CreditCard,
  Headphones,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Users,
  Wrench,
  CalendarClock,
  Info,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

// Shared context & services
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { SettingsService } from '@/services/SettingsService';
import { CacheService } from '@/services/CacheService';
import { MasterAdminDashboardSkeleton } from '@/mobile/components/skeletons/MobileSkeleton';
import { api } from '@/services/api';
import { getBackendRootUrl } from '@/utils/backendUrl';

// Mobile-native components & design tokens
import { MobileScreenWrapper } from '@/mobile/components/common/MobileScreenWrapper';
import { MobileHeader } from '@/mobile/components/common/MobileHeader';
import { MobileCard } from '@/mobile/components/common/MobileCard';
import { mobileColors, spacing, MIN_TOUCH_TARGET } from '@/mobile/utils/platform';

// Cast icons for RN compatibility
const IconBuilding2 = Building2 as any;
const IconCreditCard = CreditCard as any;
const IconHeadphones = Headphones as any;
const IconLogOut = LogOut as any;
const IconRefreshCw = RefreshCw as any;
const IconShieldAlert = ShieldAlert as any;
const IconUsers = Users as any;
const IconWrench = Wrench as any;
const IconCalendarClock = CalendarClock as any;
const IconInfo = Info as any;

export function MasterAdminDashboardMobile() {
  const { profile, logout } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('System maintenance is in progress. Please try again later.');
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [sweepPreviewLoading, setSweepPreviewLoading] = useState(false);
  const [sweepRunLoading, setSweepRunLoading] = useState(false);
  const [sweepPreview, setSweepPreview] = useState<any>(null);

  const fetchMaintenanceMode = useCallback(async () => {
    try {
      const data = await SettingsService.getMasterMaintenanceMode();
      setMaintenanceEnabled(!!data.enabled);
      setMaintenanceMessage(data.message || 'System maintenance is in progress. Please try again later.');
    } catch (err) {
      console.error('Failed to fetch maintenance mode:', err);
    }
  }, []);

  const setMaintenanceMode = useCallback(async (enabled: boolean) => {
    try {
      setMaintenanceLoading(true);
      const response = await SettingsService.updateMasterMaintenanceMode(enabled, maintenanceMessage);
      setMaintenanceEnabled(!!response.maintenance?.enabled);
      setMaintenanceMessage(response.maintenance?.message || maintenanceMessage);
      Toast.show({
        type: 'success',
        text1: enabled ? 'Maintenance Enabled' : 'Maintenance Disabled',
        text2: enabled ? 'All institutions are globally paused.' : 'Global access restored.',
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: err?.response?.data?.error || 'Could not update maintenance mode.',
      });
    } finally {
      setMaintenanceLoading(false);
    }
  }, [maintenanceMessage]);

  const fetchStats = useCallback(async () => {
    try {
      setFetchError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setFetchError('No active session. Please sign in again.');
        return;
      }

      if (!stats) {
        const cached = await CacheService.get<any>('master_admin_platform_stats', { allowStale: true });
        if (cached.data) {
          setStats(cached.data);
          setLoading(false);
        }
      }

      const res = await api.get('/master-admin/stats');
      if (res.data) {
        setStats(res.data);
        CacheService.set('master_admin_platform_stats', res.data, 5 * 60 * 1000);
      }
    } catch (err: any) {
      console.error(err);
      setFetchError(err?.response?.data?.error || 'Failed to load platform stats.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stats]);

  const previewLifecycleSweep = useCallback(async () => {
    try {
      setSweepPreviewLoading(true);
      const res = await api.get('/master-admin/subscriptions/lifecycle-sweep/preview');
      setSweepPreview(res.data);
    } catch (err: any) {
      console.error('previewLifecycleSweep error:', err);
      Toast.show({ type: 'error', text1: 'Preview Failed', text2: err?.response?.data?.error || 'Unable to preview sweep.' });
    } finally {
      setSweepPreviewLoading(false);
    }
  }, []);

  const runLifecycleSweep = useCallback(async () => {
    try {
      setSweepRunLoading(true);
      const res = await api.post('/master-admin/subscriptions/lifecycle-sweep', {});
      const data = res.data;
      Toast.show({
        type: 'success',
        text1: 'Sweep Complete',
        text2: `Scanned ${data?.scanned || 0}, warnings ${data?.warnings?.length || 0}, expired ${data?.changed?.length || 0}`,
      });
      await previewLifecycleSweep();
      await fetchStats();
    } catch (err: any) {
      console.error('runLifecycleSweep error:', err);
      Toast.show({ type: 'error', text1: 'Sweep Failed', text2: err?.response?.data?.error || 'Unable to run sweep.' });
    } finally {
      setSweepRunLoading(false);
    }
  }, [fetchStats, previewLifecycleSweep]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
    fetchMaintenanceMode();
  }, [fetchStats, fetchMaintenanceMode]);

  useEffect(() => {
    fetchStats();
    fetchMaintenanceMode();

    const channel = supabase
      .channel('master-admin-dashboard-mobile-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats, fetchMaintenanceMode]);

  const kpis = [
    { label: 'INSTITUTIONS', value: stats?.totalInstitutions ?? 0, icon: IconBuilding2, color: '#FF6900' },
    { label: 'SUBSCRIPTIONS', value: stats?.activeSubscriptions ?? 0, icon: IconCreditCard, color: '#10B981' },
    { label: 'TOTAL USERS', value: stats?.totalUsers ?? 0, icon: IconUsers, color: '#3B82F6' },
    { label: 'OPEN TICKETS', value: stats?.openSupportTickets ?? 0, icon: IconHeadphones, color: '#EF4444' },
    { label: 'STUDENTS', value: stats?.totalStudents ?? 0, icon: IconUsers, color: '#8B5CF6' },
    { label: 'TEACHERS', value: stats?.totalTeachers ?? 0, icon: IconUsers, color: '#F59E0B' },
    { label: 'ADMINS', value: stats?.totalAdmins ?? 0, icon: IconUsers, color: '#06B6D4' },
    { label: 'MASTER ADMINS', value: stats?.totalMasterAdmins ?? 0, icon: IconShieldAlert, color: '#EC4899' },
  ];

  // Show skeleton while loading initial stats
  if (loading && !stats) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface }}>
        <MobileHeader
          title="Welcome back,"
          subtitle="Loading platform..."
          largeTitle
          role="Master Admin"
          showNotification={true}
          showUserAvatar={true}
        />
        <MasterAdminDashboardSkeleton />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface }}>
      <MobileHeader
        title="Welcome back,"
        subtitle={profile?.full_name || 'Platform Administrator'}
        largeTitle
        role="Master Admin"
        showNotification={true}
        showUserAvatar={true}
      />

      <MobileScreenWrapper
        refreshing={refreshing}
        onRefresh={onRefresh}
        scrollable={true}
        skipTopInset
        contentStyle={styles.scrollContent}
      >

      {/* ── Global Maintenance Mode Card ── */}
      <MobileCard
        style={[
          styles.controlCard,
          { backgroundColor: isDark ? '#161B22' : '#ffffff' }
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.controlIconWrap, { backgroundColor: 'rgba(255,105,0,0.12)' }]}>
              <IconWrench size={18} color="#FF6900" />
            </View>
            <Text style={[styles.controlTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
              Global Maintenance
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: maintenanceEnabled ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: maintenanceEnabled ? '#ef4444' : '#22c55e' }
              ]}
            >
              {maintenanceEnabled ? 'ENABLED' : 'DISABLED'}
            </Text>
          </View>
        </View>

        <Text style={[styles.controlDescription, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          {maintenanceMessage}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            disabled={maintenanceLoading || maintenanceEnabled}
            onPress={() => setMaintenanceMode(true)}
            style={[
              styles.actionButton,
              {
                backgroundColor: (maintenanceLoading || maintenanceEnabled) ? 'rgba(239,68,68,0.2)' : '#EF4444',
                opacity: (maintenanceLoading || maintenanceEnabled) ? 0.6 : 1,
              }
            ]}
          >
            <Text style={styles.actionButtonText}>Pause All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={maintenanceLoading || !maintenanceEnabled}
            onPress={() => setMaintenanceMode(false)}
            style={[
              styles.actionButton,
              {
                backgroundColor: (maintenanceLoading || !maintenanceEnabled) ? 'rgba(34,197,94,0.2)' : '#10B981',
                opacity: (maintenanceLoading || !maintenanceEnabled) ? 0.6 : 1,
              }
            ]}
          >
            <Text style={styles.actionButtonText}>Resume All</Text>
          </TouchableOpacity>
        </View>
      </MobileCard>

      {/* ── Subscription Lifecycle Sweep Card ── */}
      <MobileCard
        style={[
          styles.controlCard,
          { backgroundColor: isDark ? '#161B22' : '#ffffff' }
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.controlIconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
              <IconCalendarClock size={18} color="#3B82F6" />
            </View>
            <Text style={[styles.controlTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
              Lifecycle Sweep
            </Text>
          </View>
        </View>

        <Text style={[styles.controlDescription, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          Scan institutions near expiry and auto-expire overdue non-beta subscriptions.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            disabled={sweepPreviewLoading || sweepRunLoading}
            onPress={previewLifecycleSweep}
            style={[
              styles.actionButton,
              {
                backgroundColor: (sweepPreviewLoading || sweepRunLoading) ? 'rgba(255,105,0,0.2)' : '#FF6900',
                opacity: (sweepPreviewLoading || sweepRunLoading) ? 0.6 : 1,
              }
            ]}
          >
            <Text style={styles.actionButtonText}>
              {sweepPreviewLoading ? 'Loading…' : 'Preview'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={sweepRunLoading || sweepPreviewLoading}
            onPress={runLifecycleSweep}
            style={[
              styles.actionButton,
              {
                backgroundColor: (sweepRunLoading || sweepPreviewLoading) ? 'rgba(16,185,129,0.2)' : '#10B981',
                opacity: (sweepRunLoading || sweepPreviewLoading) ? 0.6 : 1,
              }
            ]}
          >
            <Text style={styles.actionButtonText}>
              {sweepRunLoading ? 'Running…' : 'Run Sweep'}
            </Text>
          </TouchableOpacity>
        </View>

        {sweepPreview && (
          <View style={styles.previewStatsRow}>
            <Text style={[styles.previewStatText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Scanned: {sweepPreview.scanned || 0}  ·  Warnings: {sweepPreview.warnings_count || 0}  ·  To Expire: {sweepPreview.expire_count || 0}
            </Text>
          </View>
        )}
      </MobileCard>

      {/* ── KPI Grid ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
          Platform Metrics
        </Text>
      </View>

      {stats ? (
        <View style={styles.kpiGrid}>
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <MobileCard
                key={kpi.label}
                style={[
                  styles.kpiCard,
                  { backgroundColor: isDark ? '#161B22' : '#ffffff' }
                ]}
              >
                <View style={styles.kpiCardTop}>
                  <View style={[styles.kpiIconWrap, { backgroundColor: `${kpi.color}15` }]}>
                    <Icon size={16} color={kpi.color} />
                  </View>
                </View>
                <Text style={[styles.kpiValue, { color: isDark ? '#f1f5f9' : '#111827' }]}>
                  {kpi.value}
                </Text>
                <Text style={[styles.kpiLabel, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                  {kpi.label}
                </Text>
              </MobileCard>
            );
          })}
        </View>
      ) : (
        <MobileCard
          style={[
            styles.controlCard,
            { backgroundColor: isDark ? '#161B22' : '#ffffff' }
          ]}
        >
          <Text style={[styles.controlTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
            Unable to load stats
          </Text>
          <Text style={[styles.controlDescription, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {fetchError || 'Something went wrong.'}
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={[styles.actionButton, { backgroundColor: '#FF6900', marginTop: spacing.sm }]}
          >
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
        </MobileCard>
      )}

      {/* ── Recent Institutions ── */}
      <View style={[styles.sectionHeaderRow, { marginTop: spacing.md }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
          Recently Enrolled
        </Text>
      </View>

      <MobileCard
        style={[
          styles.controlCard,
          { backgroundColor: isDark ? '#161B22' : '#ffffff' }
        ]}
      >
        {(stats?.recentInstitutions || []).length > 0 ? (
          (stats.recentInstitutions as any[]).map((inst, idx) => (
            <View
              key={inst.id || idx}
              style={[
                styles.recentInstRow,
                { borderBottomColor: isDark ? '#21262D' : '#F1F5F9' }
              ]}
            >
              <Text style={[styles.recentInstName, { color: isDark ? '#f1f5f9' : '#111827' }]}>
                {inst.name}
              </Text>
              <Text style={[styles.recentInstPlan, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {inst.subscription_plan || 'trial'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
            No recent institutions registered.
          </Text>
        )}
      </MobileCard>
      </MobileScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 110, // Generous clearance for 60+insets bottom tab bar
  },
  controlCard: {
    padding: spacing.md,
    borderRadius: 24,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  controlTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  controlDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewStatsRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  previewStatText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: 20,
  },
  kpiCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  recentInstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  recentInstName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  recentInstPlan: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
