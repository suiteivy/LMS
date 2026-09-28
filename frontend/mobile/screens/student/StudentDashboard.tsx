/**
 * Student Dashboard — Mobile-Native Screen
 * 
 * Mobile-optimized version of the Student dashboard that provides:
 * - Native layout with proper safe areas and zero bottom tab bar clipping
 * - Mobile skeleton loading state
 * - Pull-to-refresh
 * - Today's timetable lecture stream
 * - Quick action grid with min 44px touch targets
 * - PDF timetable download
 * - Performance trends link
 * - Completely preserves web version (app/(student)/index.tsx untouched)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Book,
  BookOpen,
  CalendarCheck,
  Clock,
  Download,
  GraduationCap,
  Star,
  Wallet,
  TrendingUp,
  FileText,
  Award,
  BookOpenCheck,
} from 'lucide-react-native';

// Shared context & services
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { CacheService } from '@/services/CacheService';
import { CalendarAPI } from '@/services/CalendarService';
import { StudentService } from '@/services/StudentService';
import { supabase } from '@/libs/supabase';
import { downloadTimetablePdf } from '@/utils/timetablePdfGenerator';
import { showError, showFetchError, showSuccess } from '@/utils/toast';
import { useIsFocused } from '@react-navigation/native';

// Mobile-native components & design tokens
import { MobileScreenWrapper } from '@/mobile/components/common/MobileScreenWrapper';
import { MobileHeader } from '@/mobile/components/common/MobileHeader';
import { MobileCard } from '@/mobile/components/common/MobileCard';
import { StudentDashboardSkeleton } from '@/mobile/components/skeletons/MobileSkeleton';
import { mobileColors, spacing, MIN_TOUCH_TARGET } from '@/mobile/utils/platform';

// Cast icons for RN
const IconGraduationCap = GraduationCap as any;
const IconClock = Clock as any;
const IconBookOpen = BookOpen as any;
const IconBook = Book as any;
const IconStar = Star as any;
const IconWallet = Wallet as any;
const IconArrowRight = ArrowRight as any;
const IconDownload = Download as any;
const IconCalendarCheck = CalendarCheck as any;
const IconTrendingUp = TrendingUp as any;
const IconFileText = FileText as any;
const IconAward = Award as any;
const IconBookOpenCheck = BookOpenCheck as any;

const localDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function StudentDashboardMobile() {
  const { profile, studentId, isDemo, loading: authLoading, institutionName, institutionLogo } = useAuth();
  const { isDark } = useTheme();
  const { hasDiary, showFinancials } = useSubscriptionTier();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();

  const [gpa, setGpa] = useState<string>('0.00');
  const [attendancePct, setAttendancePct] = useState<string>('0%');
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingTimetablePdf, setDownloadingTimetablePdf] = useState(false);

  const cacheKey = studentId ? `student_dashboard_${studentId}` : null;

  const fetchDashboardData = useCallback(async () => {
    if (!isFocused) return;
    if (cacheKey && todaysSchedule.length === 0) {
      const cached = await CacheService.get<any>(cacheKey, { allowStale: true });
      if (cached.data) {
        setGpa(cached.data.gpa || '0.00');
        setAttendancePct(cached.data.attendancePct || '0%');
        setTodaysSchedule(cached.data.todaysSchedule || []);
        setLoadingData(false);
      }
    }

    try {
      setLoadingData(true);

      if (isDemo) {
        setGpa('3.85');
        setAttendancePct('94%');
        setTodaysSchedule([
          {
            id: 'demo-1',
            start_time: '08:00:00',
            end_time: '09:30:00',
            subjects: { title: 'Advanced Mathematics', teachers: { users: { full_name: 'Dr. Evans' } } },
            room_number: 'Hall A',
          },
          {
            id: 'demo-2',
            start_time: '10:00:00',
            end_time: '11:30:00',
            subjects: { title: 'Theoretical Physics', teachers: { users: { full_name: 'Prof. Davis' } } },
            room_number: 'Lab 2',
          },
          {
            id: 'demo-3',
            start_time: '13:30:00',
            end_time: '15:00:00',
            subjects: { title: 'Software Engineering', teachers: { users: { full_name: 'Eng. Chen' } } },
            room_number: 'Room 101',
          },
        ]);
        return;
      }

      if (!studentId) return;

      let calculatedGpa = '0.00';
      const { data: gradesData } = await supabase
        .from('grades')
        .select('total_grade')
        .eq('student_id', studentId);

      if (gradesData && gradesData.length > 0) {
        const scores = (gradesData as any[])
          .filter(g => g.total_grade !== null)
          .map(g => g.total_grade);
        if (scores.length > 0) {
          const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
          calculatedGpa = (avg / 25).toFixed(2);
          setGpa(calculatedGpa);
        } else {
          setGpa('0.00');
        }
      } else {
        setGpa('0.00');
      }

      let calculatedAttendance = '–%';
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId);

      if (attendanceData && attendanceData.length > 0) {
        const total = attendanceData.length;
        const present = (attendanceData as any[]).filter((r: any) => r.status === 'present' || r.status === 'late').length;
        calculatedAttendance = `${Math.round((present / total) * 100)}%`;
        setAttendancePct(calculatedAttendance);
      } else {
        setAttendancePct('–%');
      }

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
      const today = days[new Date().getDay()];

      let fetchedSchedule: any[] = [];
      const { data: myClasses } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', studentId);

      if (myClasses && myClasses.length > 0) {
        const classIds = (myClasses as any[]).map((c: any) => c.class_id);
        const { data: schedule } = await supabase
          .from('timetables')
          .select(`*, subjects(title, category, teachers(users(full_name))), classes(display_name), teachers(full_name)`)
          .in('class_id', classIds)
          .eq('day_of_week', today)
          .or('is_draft.is.null,is_draft.eq.false')
          .order('start_time', { ascending: true });

        fetchedSchedule = schedule || [];
        setTodaysSchedule(fetchedSchedule);
      } else {
        setTodaysSchedule([]);
      }

      if (cacheKey) {
        CacheService.set(cacheKey, {
          gpa: calculatedGpa,
          attendancePct: calculatedAttendance,
          todaysSchedule: fetchedSchedule,
        }, 10 * 60 * 1000);
      }
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
      if (isFocused) {
        showFetchError('dashboard data', error);
      }
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [studentId, isDemo, cacheKey, isFocused]);

  useEffect(() => {
    if (authLoading) return;
    if (studentId || isDemo) {
      fetchDashboardData();
    } else {
      setLoadingData(false);
    }
  }, [studentId, isDemo, authLoading, fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDownloadTimetablePdf = async () => {
    try {
      setDownloadingTimetablePdf(true);
      const entries = await StudentService.getTimetable();
      const cancelledDates = await CalendarAPI.getCancelledDates().catch(() => []);

      await downloadTimetablePdf({
        title: 'Student Class Timetable',
        subtitle: profile?.full_name ? `Schedule for ${profile.full_name}` : 'Academic Schedule',
        institutionName,
        institutionLogo,
        entries: entries || [],
        cancelledDates: cancelledDates || [],
        fileName: `${profile?.full_name || 'student'}-timetable-${localDateKey(new Date())}`,
      });

      showSuccess('PDF Ready', 'Timetable PDF generated successfully.');
    } catch {
      showError('Export failed', 'Failed to generate timetable PDF.');
    } finally {
      setDownloadingTimetablePdf(false);
    }
  };

  // Quick actions list
  const quickActions = [
    {
      icon: IconGraduationCap,
      label: 'Library',
      route: '/(student)/library',
      color: '#0D9488',
    },
    {
      icon: IconStar,
      label: 'Performance',
      route: '/(student)/grades',
      color: '#FF6900',
    },
    {
      icon: IconBook,
      label: 'Assignments',
      route: '/(student)/assignments',
      color: '#3B82F6',
    },
    {
      icon: IconClock,
      label: 'Attendance',
      route: '/(student)/attendance',
      color: '#10B981',
    },
    {
      icon: IconBookOpen,
      label: 'Academic Vault',
      route: '/(student)/vault',
      color: '#8B5CF6',
    },
    ...(hasDiary
      ? [{ icon: IconBookOpen, label: 'Diary', route: '/(student)/diary', color: '#EC4899' }]
      : []),
    ...(showFinancials
      ? [{ icon: IconWallet, label: 'Financials', route: '/(student)/finance', color: '#F59E0B' }]
      : []),
    {
      icon: IconFileText,
      label: 'Report Cards',
      route: '/(student)/report-cards',
      color: '#06B6D4',
    },
    {
      icon: IconAward,
      label: 'Transcripts',
      route: '/(student)/transcripts',
      color: '#6366F1',
    },
    {
      icon: IconBookOpenCheck,
      label: 'Clearance',
      route: '/(student)/clearance',
      color: '#059669',
    },
  ];

  if (authLoading || (loadingData && todaysSchedule.length === 0 && gpa === '0.00')) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface }}>
        <MobileHeader
          title="Welcome back,"
          subtitle={profile?.full_name || 'Student'}
          largeTitle
          role="Student"
          showNotification={true}
          showUserAvatar={true}
        />
        <StudentDashboardSkeleton loading={true} label="Loading student dashboard..." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface }}>
      <MobileHeader
        title="Welcome back,"
        subtitle={profile?.full_name || 'Student'}
        largeTitle
        role="Student"
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

      {/* ── Metric Cards ── */}
      <View style={styles.metricsRow}>
        <View style={styles.metricWrapper}>
          <MobileCard
            style={[
              styles.metricCard,
              { backgroundColor: isDark ? '#1a1a2e' : '#111827' }
            ]}
          >
            <View style={styles.metricIconWrap}>
              <IconGraduationCap size={20} color="#FF6900" />
            </View>
            <Text style={styles.metricValueLight}>{gpa}</Text>
            <Text style={styles.metricLabelLight}>CUMULATIVE GPA</Text>
          </MobileCard>
        </View>

        <View style={styles.metricWrapper}>
          <MobileCard
            style={[
              styles.metricCard,
              { backgroundColor: isDark ? '#161B22' : '#ffffff' }
            ]}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
              <IconClock size={20} color="#10B981" />
            </View>
            <Text style={[styles.metricValue, { color: isDark ? '#ffffff' : '#111827' }]}>
              {attendancePct}
            </Text>
            <Text style={[styles.metricLabel, { color: isDark ? '#64748b' : '#94a3b8' }]}>
              ATTENDANCE
            </Text>
          </MobileCard>
        </View>
      </View>

      {/* ── Today's Schedule ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
          Today's Lectures
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleDownloadTimetablePdf}
            disabled={downloadingTimetablePdf}
            style={[styles.pdfButton, { borderColor: isDark ? '#374151' : '#e5e7eb', backgroundColor: isDark ? '#0D1117' : '#ffffff' }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <IconDownload size={12} color="#FF6900" style={{ marginRight: 4 }} />
            <Text style={styles.pdfButtonText}>
              {downloadingTimetablePdf ? 'Exporting...' : 'PDF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(student)/timetable', params: { backTo: '/(student)' } } as any)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.seeAllText}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {todaysSchedule.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scheduleScroll}
        >
          {todaysSchedule.map((item, index) => {
            const isFirst = index % 2 === 0;
            return (
              <MobileCard
                key={item.id || index}
                style={[
                  styles.scheduleCard,
                  { backgroundColor: isDark ? '#161B22' : '#ffffff' }
                ]}
              >
                <View style={styles.scheduleCardTop}>
                  <View
                    style={[
                      styles.subjectBadge,
                      {
                        backgroundColor: isFirst
                          ? (isDark ? 'rgba(255,105,0,0.15)' : '#fff7ed')
                          : (isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff')
                      }
                    ]}
                  >
                    <IconBookOpen
                      size={14}
                      color={isFirst ? '#FF6900' : '#3B82F6'}
                    />
                  </View>
                  <Text style={[styles.timeText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                    {item.start_time?.slice(0, 5)} – {item.end_time?.slice(0, 5)}
                  </Text>
                </View>

                <Text
                  style={[styles.subjectTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}
                  numberOfLines={1}
                >
                  {item.subjects?.title || 'Lecture'}
                </Text>

                {item.subjects?.category ? (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: isDark ? '#60a5fa' : '#2563eb', textTransform: 'uppercase' }}>
                      {item.subjects.category}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.scheduleCardBottom}>
                  <Text style={[styles.roomText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                    {item.room_number || item.classes?.display_name || 'Class'}
                  </Text>
                  <Text style={styles.teacherText}>
                    {(item.teachers?.full_name || item.subjects?.teachers?.users?.full_name)?.split(' ')[0] || 'Faculty'}
                  </Text>
                </View>
              </MobileCard>
            );
          })}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.emptyScheduleCard,
            {
              borderColor: isDark ? '#1f2937' : '#e2e8f0',
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            }
          ]}
        >
          <IconCalendarCheck size={28} color={isDark ? '#475569' : '#94a3b8'} />
          <Text style={[styles.emptyScheduleTitle, { color: isDark ? '#64748b' : '#94a3b8' }]}>
            No lectures scheduled today
          </Text>
          <Text style={[styles.emptyScheduleSubtitle, { color: isDark ? '#475569' : '#cbd5e1' }]}>
            Enjoy your study session or break
          </Text>
        </View>
      )}

      {/* ── Academic Tools ── */}
      <View style={[styles.sectionHeaderRow, { marginTop: spacing.lg }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
          Academic Tools
        </Text>
      </View>

      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <TouchableOpacity
              key={action.label}
              onPress={() => router.push({ pathname: action.route as any, params: { backTo: '/(student)' } } as any)}
              activeOpacity={0.75}
              style={[
                styles.quickActionButton,
                {
                  backgroundColor: isDark ? '#161B22' : '#ffffff',
                  borderColor: isDark ? '#1f2937' : '#f1f5f9',
                }
              ]}
            >
              <View
                style={[
                  styles.quickActionIconWrap,
                  { backgroundColor: `${action.color}15` }
                ]}
              >
                <Icon size={22} color={action.color} />
              </View>
              <Text
                style={[styles.quickActionLabel, { color: isDark ? '#e2e8f0' : '#111827' }]}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Performance Trends Link ── */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/(student)/analytics', params: { backTo: '/(student)' } } as any)}
        activeOpacity={0.75}
        style={[
          styles.trendsCard,
          {
            backgroundColor: isDark ? '#161B22' : '#ffffff',
            borderColor: isDark ? '#1f2937' : '#f1f5f9',
          }
        ]}
      >
        <View style={styles.trendsCardLeft}>
          <View style={[styles.trendsIconWrap, { backgroundColor: 'rgba(255,105,0,0.12)' }]}>
            <IconTrendingUp size={18} color="#FF6900" />
          </View>
          <View>
            <Text style={[styles.trendsTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
              Performance Trends
            </Text>
            <Text style={[styles.trendsSubtitle, { color: isDark ? '#64748b' : '#94a3b8' }]}>
              View longitudinal GPA & subject progress
            </Text>
          </View>
        </View>
        <IconArrowRight size={18} color={isDark ? '#64748b' : '#94a3b8'} />
      </TouchableOpacity>
      </MobileScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 110, // Generous bottom clearance for the 52+insets bottom tab bar
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricWrapper: {
    flex: 1,
  },
  metricCard: {
    padding: spacing.md,
    borderRadius: 24,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 105, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metricValueLight: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  metricLabelLight: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pdfButtonText: {
    color: '#FF6900',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  seeAllText: {
    color: '#FF6900',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  scheduleScroll: {
    gap: spacing.sm,
    paddingBottom: 4,
  },
  scheduleCard: {
    width: 220,
    padding: spacing.md,
    borderRadius: 20,
  },
  scheduleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectBadge: {
    padding: 6,
    borderRadius: 10,
    marginRight: 8,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  scheduleCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomText: {
    fontSize: 11,
    fontWeight: '500',
  },
  teacherText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6900',
  },
  emptyScheduleCard: {
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyScheduleTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  emptyScheduleSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionButton: {
    width: '48%',
    minHeight: MIN_TOUCH_TARGET + 16,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  trendsCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET,
  },
  trendsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  trendsTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  trendsSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
});
