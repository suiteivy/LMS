/**
 * Teacher Dashboard — Mobile-Native Screen
 * 
 * Mobile-optimized version of the Teacher dashboard that provides:
 * - Native layout with proper safe areas and zero bottom tab bar clipping
 * - Mobile skeleton loading state
 * - Pull-to-refresh
 * - Role-mode switcher (Subject vs Class vs Librarian vs Finance)
 * - Quick actions with min 44px touch targets
 * - Today's teaching schedule & homeroom status
 * - Completely preserves web version (app/(teacher)/index.tsx untouched)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  BookOpen,
  Calendar,
  Check,
  Clock,
  ClipboardList,
  GraduationCap,
  LogOut,
  MessageSquare,
  School,
  Users,
  ChevronRight,
  Award,
  Bell,
} from 'lucide-react-native';

// Shared business logic & services
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTeacherRoleMode } from '@/hooks/useTeacherRoleMode';
import { TeacherAPI } from '@/services/TeacherService';
import { CacheService } from '@/services/CacheService';
import { TeacherAttendanceAPI, StaffPresenceItem } from '@/services/TeacherAttendanceService';
import { SubscriptionBanner } from '@/components/shared/SubscriptionComponents';
import { formatClassLabel } from '@/utils/classLabel';

// Mobile-specific components & tokens
import { MobileScreenWrapper } from '@/mobile/components/common/MobileScreenWrapper';
import { MobileHeader } from '@/mobile/components/common/MobileHeader';
import { MobileCard } from '@/mobile/components/common/MobileCard';
import { TeacherDashboardSkeleton } from '@/mobile/components/skeletons/MobileSkeleton';
import { mobileColors, spacing, MIN_TOUCH_TARGET } from '@/mobile/utils/platform';

// Cast icons for RN compatibility
const IconUsers = Users as any;
const IconGraduationCap = GraduationCap as any;
const IconClipboardList = ClipboardList as any;
const IconBookOpen = BookOpen as any;
const IconCalendar = Calendar as any;
const IconClock = Clock as any;
const IconSchool = School as any;
const IconMessageSquare = MessageSquare as any;
const IconLogOut = LogOut as any;
const IconChevronRight = ChevronRight as any;
const IconCheck = Check as any;

export function TeacherDashboardMobile() {
  const { profile, teacherId, isInitializing, session, isDemo, logout } = useAuth();
  const { isDark } = useTheme();

  // State
  const [stats, setStats] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [staffPresence, setStaffPresence] = useState<StaffPresenceItem[]>([]);

  // Role modes
  const {
    mode,
    setMode,
    syncRoles,
    canToggle,
    isSubjectTeacher,
    isClassTeacher,
    isHOD,
    isLibrarian,
    isFinanceAdmin,
  } = useTeacherRoleMode();

  const cacheKey = profile?.id ? `teacher_dashboard_${profile.id}_${mode}` : null;
  const hydratedFromCacheRef = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    if (!isDemo && (isInitializing || !session)) return;

    if (cacheKey && !hydratedFromCacheRef.current) {
      hydratedFromCacheRef.current = true;
      const cached = await CacheService.get<any>(cacheKey, { allowStale: true });
      if (cached?.data) {
        setStats(cached.data.stats || null);
        setSchedule(cached.data.schedule || []);
        const cachedRoles = cached.data.roles || [];
        setRoles(cachedRoles);
        syncRoles(cachedRoles);
        setLoading(false);
      }
    }

    try {
      setLoading(true);

      if (isDemo) {
        const mockStats = {
          studentsCount: 142,
          classesCount: 5,
          subjectsCount: 3,
          pendingAssignments: 8,
          attendancePercentage: 94,
        };
        const mockSchedule = [
          { id: '1', time: '08:30 - 09:30', subject: 'Mathematics', class_name: 'Grade 10-A', room: 'Room 204' },
          { id: '2', time: '10:00 - 11:00', subject: 'Advanced Algebra', class_name: 'Grade 11-B', room: 'Room 102' },
          { id: '3', time: '13:00 - 14:00', subject: 'Geometry', class_name: 'Grade 9-C', room: 'Room 204' },
        ];
        setStats(mockStats);
        setSchedule(mockSchedule);
        setRoles(['Subject Teacher', 'Class Teacher']);
        setLoading(false);
        return;
      }

      if (teacherId) {
        const [dashData, presenceData] = await Promise.all([
          TeacherAPI.getDashboardStats(),
          TeacherAttendanceAPI.getStaffPresence().catch(() => []),
        ]);

        if (dashData) {
          setStats(dashData.stats || null);
          setSchedule(dashData.schedule || []);
          const assignedRoles = dashData.roles || [];
          setRoles(assignedRoles);
          syncRoles(assignedRoles);

          if (cacheKey) {
            await CacheService.set(cacheKey, dashData, 5 * 60 * 1000);
          }
        }
        setStaffPresence(presenceData || []);
      }
    } catch (err) {
      console.error('TeacherDashboardMobile fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDemo, isInitializing, session, teacherId, cacheKey, syncRoles]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
  }, [fetchDashboardData]);

  const teacherRoleLabel = useMemo(() => {
    const held: string[] = [];
    if (isSubjectTeacher) held.push('Subject');
    if (isClassTeacher) held.push('Class Teacher');
    if (isHOD) held.push('HOD');
    if (isLibrarian) held.push('Librarian');
    if (isFinanceAdmin) held.push('Finance');
    return held.length > 0 ? held.join(' · ') : 'Teacher';
  }, [isSubjectTeacher, isClassTeacher, isHOD, isLibrarian, isFinanceAdmin]);

  // Mode-aware quick actions
  const quickActions = useMemo(() => {
    if (mode === 'class') {
      return [
        { label: 'Homeroom Roll', icon: IconUsers, color: '#FF6900', route: '/(teacher)/classes' },
        { label: 'Attendance', icon: IconCalendar, color: '#10B981', route: '/(teacher)/management/attendance' },
        { label: 'Timetable', icon: IconClock, color: '#06B6D4', route: '/(teacher)/management/timetable' },
        { label: 'Report Cards', icon: IconClipboardList, color: '#3B82F6', route: '/(teacher)/management/report-cards' },
        { label: 'Class Students', icon: IconGraduationCap, color: '#8B5CF6', route: '/(teacher)/students' },
      ];
    }
    return [
      { label: 'My Classes', icon: IconSchool, color: '#FF6900', route: '/(teacher)/classes' },
      { label: 'Timetable', icon: IconClock, color: '#06B6D4', route: '/(teacher)/management/timetable' },
      { label: 'Grade Entry', icon: IconGraduationCap, color: '#3B82F6', route: '/(teacher)/management/grade-entry' },
      { label: 'Assignments', icon: IconClipboardList, color: '#8B5CF6', route: '/(teacher)/management/assignments' },
      { label: 'Coverage', icon: IconBookOpen, color: '#EC4899', route: '/(teacher)/management/coverage' },
    ];
  }, [mode]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface }}>
      <SubscriptionBanner />

      {/* Persistent Mobile Header */}
      <MobileHeader
        title="Welcome back,"
        subtitle={profile?.full_name || 'Teacher'}
        largeTitle
        role={teacherRoleLabel || 'Teacher'}
        showNotification={true}
        showUserAvatar={true}
      />

      <MobileScreenWrapper
        refreshing={refreshing}
        onRefresh={onRefresh}
        scrollable={true}
        skipTopInset
      >
        {loading && !stats ? (
          <TeacherDashboardSkeleton />
        ) : (
        <View style={styles.container}>
          {/* Mode Switcher Tabs (if multiple roles) */}
          {canToggle && (
            <View
              style={[
                styles.modeSwitcher,
                {
                  backgroundColor: isDark ? mobileColors.bgCard : mobileColors.bgLightCard,
                  borderColor: isDark ? mobileColors.borderSubtle : mobileColors.borderLight,
                },
              ]}
            >
              {isSubjectTeacher && (
                <TouchableOpacity
                  onPress={() => setMode('subject')}
                  style={[
                    styles.modeTab,
                    mode === 'subject' && styles.modeTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      mode === 'subject' ? styles.modeTabTextActive : { color: isDark ? mobileColors.textSecondary : mobileColors.textDarkSecondary },
                    ]}
                  >
                    Subject Mode
                  </Text>
                </TouchableOpacity>
              )}
              {isClassTeacher && (
                <TouchableOpacity
                  onPress={() => setMode('class')}
                  style={[
                    styles.modeTab,
                    mode === 'class' && styles.modeTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      mode === 'class' ? styles.modeTabTextActive : { color: isDark ? mobileColors.textSecondary : mobileColors.textDarkSecondary },
                    ]}
                  >
                    Class Mode
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Quick Metrics Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#FF6900' }]}>
              <View style={styles.statIconBadge}>
                <IconUsers size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>{stats?.studentsCount ?? 0}</Text>
              <Text style={styles.statLabel}>
                {mode === 'class' ? 'Class Students' : 'Students Taught'}
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark ? mobileColors.bgCard : mobileColors.bgLightCard,
                  borderColor: isDark ? mobileColors.borderSubtle : mobileColors.borderLight,
                  borderWidth: 1,
                },
              ]}
            >
              <View
                style={[
                  styles.statIconBadge,
                  { backgroundColor: isDark ? 'rgba(255,105,0,0.15)' : '#FFF3E8' },
                ]}
              >
                <IconClock size={20} color="#FF6900" />
              </View>
              <Text
                style={[
                  styles.statValue,
                  { color: isDark ? mobileColors.textPrimary : mobileColors.textDark },
                ]}
              >
                {schedule.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: isDark ? mobileColors.textSecondary : mobileColors.textDarkSecondary },
                ]}
              >
                Today's Lessons
              </Text>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? mobileColors.textPrimary : mobileColors.textDark },
            ]}
          >
            Quick Actions
          </Text>

          <View style={styles.actionsGrid}>
            {quickActions.map((action, idx) => {
              const ActionIcon = action.icon;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.75}
                  style={[
                    styles.actionTile,
                    {
                      backgroundColor: isDark ? mobileColors.bgCard : mobileColors.bgLightCard,
                      borderColor: isDark ? mobileColors.borderSubtle : mobileColors.borderLight,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      { backgroundColor: `${action.color}18` },
                    ]}
                  >
                    <ActionIcon size={22} color={action.color} />
                  </View>
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: isDark ? mobileColors.textPrimary : mobileColors.textDark },
                    ]}
                    numberOfLines={1}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today's Schedule Card */}
          <View style={styles.sectionHeaderRow}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? mobileColors.textPrimary : mobileColors.textDark, marginBottom: 0 },
              ]}
            >
              Today's Schedule
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(teacher)/management/timetable' as any)}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>Timetable →</Text>
            </TouchableOpacity>
          </View>

          {schedule.length === 0 ? (
            <MobileCard style={styles.emptyScheduleCard}>
              <IconCalendar size={32} color={isDark ? mobileColors.textMuted : mobileColors.textDarkSecondary} />
              <Text
                style={[
                  styles.emptyScheduleText,
                  { color: isDark ? mobileColors.textSecondary : mobileColors.textDarkSecondary },
                ]}
              >
                No classes scheduled for today.
              </Text>
            </MobileCard>
          ) : (
            schedule.map((item, idx) => (
              <MobileCard key={item.id || idx} style={styles.scheduleItemCard}>
                <View style={styles.scheduleItemRow}>
                  <View style={styles.timeBadge}>
                    <IconClock size={14} color="#FF6900" />
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                  <View style={styles.scheduleDetails}>
                    <Text
                      style={[
                        styles.subjectTitle,
                        { color: isDark ? mobileColors.textPrimary : mobileColors.textDark },
                      ]}
                    >
                      {item.subject}
                    </Text>
                    <Text
                      style={[
                        styles.classRoomText,
                        { color: isDark ? mobileColors.textSecondary : mobileColors.textDarkSecondary },
                      ]}
                    >
                      {item.class_name} · {item.room}
                    </Text>
                  </View>
                  <IconChevronRight size={18} color={isDark ? mobileColors.textMuted : mobileColors.borderLight} />
                </View>
              </MobileCard>
            ))
          )}

        </View>
      )}
      </MobileScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  modeSwitcher: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: {
    backgroundColor: '#FF6900',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    padding: spacing.md,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  seeAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: {
    color: '#FF6900',
    fontSize: 12,
    fontWeight: '700',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.lg,
  },
  actionTile: {
    width: '48.5%',
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    gap: 10,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyScheduleCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyScheduleText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  scheduleItemCard: {
    marginBottom: 8,
    padding: spacing.md,
  },
  scheduleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,105,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6900',
  },
  scheduleDetails: {
    flex: 1,
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  classRoomText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
