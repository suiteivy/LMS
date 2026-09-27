/**
 * Parent Dashboard — Mobile-Native Screen
 * 
 * Mobile-optimized version of the Parent dashboard that provides:
 * - Native layout with proper safe areas and zero bottom tab bar clipping
 * - Interactive child switcher pills for parents with multiple children
 * - Child Profile Hero card with class label
 * - Academic metrics (Average Grade, Attendance %)
 * - Touch-first quick actions with min 44px touch targets
 * - Conduct Log modal
 * - Mobile skeleton loading state & pull-to-refresh
 * - Completely preserves web version (app/(parent)/index.tsx untouched)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Award,
  BookOpen,
  BookOpenCheck,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  LifeBuoy,
  LogOut,
  ShieldAlert,
  UserCircle,
  X,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';

// Shared context & services
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { ParentService } from '@/services/ParentService';
import { CacheService } from '@/services/CacheService';
import { ViolationService, StudentViolation } from '@/services/ViolationService';
import { ViolationList } from '@/components/violations/ViolationList';
import { formatClassLabel } from '@/utils/classLabel';
import {
  clearParentSelectedChild,
  getParentSelectedChild,
  setParentSelectedChild,
} from '@/utils/parentSelectedChild';

// Mobile-native components & design tokens
import { MobileScreenWrapper } from '@/mobile/components/common/MobileScreenWrapper';
import { MobileHeader } from '@/mobile/components/common/MobileHeader';
import { MobileCard } from '@/mobile/components/common/MobileCard';
import { ParentDashboardSkeleton } from '@/mobile/components/skeletons/MobileSkeleton';
import { mobileColors, spacing, MIN_TOUCH_TARGET } from '@/mobile/utils/platform';

// Cast icons for RN compatibility
const IconUserCircle = UserCircle as any;
const IconGraduationCap = GraduationCap as any;
const IconClock = Clock as any;
const IconAward = Award as any;
const IconCreditCard = CreditCard as any;
const IconFileText = FileText as any;
const IconBookOpen = BookOpen as any;
const IconBookOpenCheck = BookOpenCheck as any;
const IconLifeBuoy = LifeBuoy as any;
const IconShieldAlert = ShieldAlert as any;
const IconX = X as any;
const IconLogOut = LogOut as any;
const IconChevronRight = ChevronRight as any;
const IconCalendar = Calendar as any;
const IconTrendingUp = TrendingUp as any;

export function ParentDashboardMobile() {
  const { profile, loading: authLoading, logout } = useAuth();
  const { isDark } = useTheme();
  const tier = useSubscriptionTier();
  const router = useRouter();

  const classTypeLabel =
    (profile as any)?.institutions?.school_categories?.class_type ||
    (profile as any)?.institutions?.categories?.[0]?.class_type ||
    (profile as any)?.institutions?.school_categories?.level_label ||
    'Grade';

  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>({});
  const [childViolations, setChildViolations] = useState<StudentViolation[]>([]);
  const [showConductModal, setShowConductModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cacheKey = profile?.id ? `parent_linked_students_${profile.id}` : null;

  const fetchStudentDetails = useCallback(async (studentId: string) => {
    const detailCacheKey = `parent_child_detail_${studentId}`;
    const cached = await CacheService.get<any>(detailCacheKey, { allowStale: true });
    if (cached.data) {
      setStudentData(cached.data);
    }

    try {
      const [performance, attendance] = await Promise.all([
        ParentService.getStudentPerformance(studentId),
        ParentService.getStudentAttendance(studentId),
      ]);

      let avgGrade = 'N/A';
      if (performance.grades && performance.grades.length > 0) {
        avgGrade = performance.grades[0].grade || 'N/A';
      }

      let attendancePct: string | number = 'N/A';
      if (attendance && attendance.length > 0) {
        const present = attendance.filter((a: any) => a.status === 'present' || a.status === 'late').length;
        attendancePct = `${Math.round((present / attendance.length) * 100)}%`;
      }

      const computed = {
        performance: { average_grade: avgGrade },
        attendance: { overall_percentage: attendancePct },
      };
      setStudentData(computed);
      CacheService.set(detailCacheKey, computed, 10 * 60 * 1000);

      // Fetch violations
      const violations = await ViolationService.getStudentViolations(studentId);
      setChildViolations(violations?.data || []);
    } catch (err) {
      console.error('Error fetching student details:', err);
    }
  }, []);

  const fetchLinkedStudents = useCallback(async () => {
    if (cacheKey && linkedStudents.length === 0) {
      const cached = await CacheService.get<any[]>(cacheKey, { allowStale: true });
      if (cached.data && cached.data.length > 0) {
        setLinkedStudents(cached.data);
        const initial = cached.data[0];
        setSelectedStudent(initial);
        setLoading(false);
        fetchStudentDetails(initial.id);
      }
    }

    try {
      const students = await ParentService.getLinkedStudents();
      setLinkedStudents(students || []);
      if (students && students.length > 0) {
        if (cacheKey) {
          CacheService.set(cacheKey, students, 15 * 60 * 1000);
        }
        const saved = await getParentSelectedChild();
        const matched = saved?.studentId
          ? students.find((s: any) => s.id === saved.studentId)
          : null;
        const initial = matched || students[0];
        setSelectedStudent(initial);
        await setParentSelectedChild({
          studentId: initial.id,
          studentName: initial.users?.full_name || '',
          classId: initial.class_id || '',
        });
        fetchStudentDetails(initial.id);
      } else {
        await clearParentSelectedChild();
      }
    } catch (error) {
      console.error('Error fetching linked students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cacheKey, linkedStudents.length, fetchStudentDetails]);

  useEffect(() => {
    if (authLoading) return;
    fetchLinkedStudents();
  }, [authLoading, fetchLinkedStudents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLinkedStudents();
  }, [fetchLinkedStudents]);

  const handleSelectChild = async (student: any) => {
    setSelectedStudent(student);
    await setParentSelectedChild({
      studentId: student.id,
      studentName: student.users?.full_name || '',
      classId: student.class_id || '',
    });
    fetchStudentDetails(student.id);
  };

  const goTo = (route: string) => {
    router.push({
      pathname: route as any,
      params: {
        studentId: selectedStudent?.id || '',
        studentName: selectedStudent?.users?.full_name || '',
        classId: selectedStudent?.class_id || '',
        backTo: '/(parent)',
      },
    } as any);
  };

  const quickActions = [
    {
      icon: IconAward,
      label: 'Grades',
      color: '#FF6900',
      onPress: () => goTo('/(parent)/grades'),
      show: true,
    },
    {
      icon: IconClock,
      label: 'Attendance',
      color: '#10B981',
      onPress: () => goTo('/(parent)/attendance'),
      show: true,
    },
    {
      icon: IconCreditCard,
      label: 'Fees & Billing',
      color: '#3B82F6',
      onPress: () => goTo('/(parent)/finance'),
      show: tier.showFinancials,
    },
    {
      icon: IconCalendar,
      label: 'Timetable',
      color: '#8B5CF6',
      onPress: () => goTo('/(parent)/timetable'),
      show: true,
    },
    {
      icon: IconBookOpenCheck,
      label: 'Assignments',
      color: '#06B6D4',
      onPress: () => goTo('/(parent)/assignments'),
      show: true,
    },
    {
      icon: IconFileText,
      label: 'Report Cards',
      color: '#EC4899',
      onPress: () => goTo('/(parent)/report-cards'),
      show: true,
    },
    {
      icon: IconFileText,
      label: 'Reports',
      color: '#14B8A6',
      onPress: () => goTo('/(parent)/reports'),
      show: true,
    },
    {
      icon: IconTrendingUp,
      label: 'Analytics',
      color: '#F97316',
      onPress: () => goTo('/(parent)/analytics'),
      show: tier.hasAnalytics,
    },
    {
      icon: IconGraduationCap,
      label: 'Exams',
      color: '#F59E0B',
      onPress: () => goTo('/(parent)/exams'),
      show: true,
    },
    {
      icon: IconBookOpen,
      label: 'Class Diary',
      color: '#6366F1',
      onPress: () => goTo('/(parent)/diary'),
      show: tier.hasDiary,
    },
    {
      icon: IconBookOpenCheck,
      label: 'Clearance',
      color: '#10B981',
      onPress: () => goTo('/(parent)/clearance'),
      show: true,
    },
    {
      icon: IconShieldAlert,
      label: 'Conduct Log',
      color: '#EF4444',
      onPress: () => setShowConductModal(true),
      show: true,
    },
    {
      icon: IconLifeBuoy,
      label: 'Support',
      color: '#64748B',
      onPress: () => goTo('/(parent)/support'),
      show: true,
    },
  ].filter(a => a.show);

  if (loading && !refreshing && linkedStudents.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface }}>
        <MobileHeader
          title="Welcome back,"
          subtitle={profile?.full_name || 'Parent'}
          largeTitle
          role="Parent"
          showNotification={true}
          showUserAvatar={true}
        />
        <ParentDashboardSkeleton loading={true} label="Loading parent dashboard..." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? mobileColors.bgPrimary : mobileColors.bgLightSurface }}>
      <MobileHeader
        title="Welcome back,"
        subtitle={profile?.full_name || 'Parent'}
        largeTitle
        role="Parent"
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

      {/* ── Multiple Children Switcher ── */}
      {linkedStudents.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.childPillsScroll}
        >
          {linkedStudents.map((student) => {
            const isSelected = selectedStudent?.id === student.id;
            const name = student.users?.first_name || student.users?.full_name?.split(' ')[0] || 'Child';
            return (
              <TouchableOpacity
                key={student.id}
                onPress={() => handleSelectChild(student)}
                style={[
                  styles.childPill,
                  {
                    backgroundColor: isSelected
                      ? '#FF6900'
                      : isDark ? '#161B22' : '#ffffff',
                    borderColor: isSelected
                      ? '#FF6900'
                      : isDark ? '#1f2937' : '#e5e7eb',
                  }
                ]}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <IconUserCircle
                  size={14}
                  color={isSelected ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.childPillText,
                    { color: isSelected ? '#ffffff' : (isDark ? '#f1f5f9' : '#111827') }
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── No linked students empty state ── */}
      {linkedStudents.length === 0 && !loading && (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: isDark ? '#161B22' : '#ffffff',
              borderColor: isDark ? '#1f2937' : '#e5e7eb',
            }
          ]}
        >
          <IconUserCircle size={44} color="#9CA3AF" />
          <Text style={[styles.emptyTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
            No students linked to your account
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? '#64748b' : '#94a3b8' }]}>
            Contact your school administrator to link your children.
          </Text>
        </View>
      )}

      {/* ── Selected Child Hero Card ── */}
      {selectedStudent && (
        <MobileCard
          style={[
            styles.childHeroCard,
            { backgroundColor: isDark ? '#1a1a2e' : '#111827' }
          ]}
        >
          <Text style={styles.childHeroOverline}>STUDENT PROFILE</Text>
          <Text style={styles.childHeroName} numberOfLines={1}>
            {selectedStudent?.users?.full_name || 'Student'}
          </Text>
          <View style={styles.childHeroBadge}>
            <Text style={styles.childHeroBadgeText}>
              {formatClassLabel(selectedStudent?.classes)}
            </Text>
          </View>
        </MobileCard>
      )}

      {/* ── Metric Cards ── */}
      {selectedStudent && (
        <View style={styles.metricsRow}>
          <View style={styles.metricWrapper}>
            <MobileCard
              style={[
                styles.metricCard,
                { backgroundColor: isDark ? '#161B22' : '#ffffff' }
              ]}
            >
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(255,105,0,0.12)' }]}>
                <IconAward size={20} color="#FF6900" />
              </View>
              <Text style={[styles.metricValue, { color: isDark ? '#ffffff' : '#111827' }]}>
                {studentData?.performance?.average_grade || '–'}
              </Text>
              <Text style={[styles.metricLabel, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                AVERAGE GRADE
              </Text>
            </MobileCard>
          </View>

          <View style={styles.metricWrapper}>
            <MobileCard
              style={[
                styles.metricCard,
                { backgroundColor: isDark ? '#161B22' : '#ffffff' }
              ]}
            >
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <IconClock size={20} color="#10B981" />
              </View>
              <Text style={[styles.metricValue, { color: isDark ? '#ffffff' : '#111827' }]}>
                {studentData?.attendance?.overall_percentage || '–'}
              </Text>
              <Text style={[styles.metricLabel, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                ATTENDANCE RATE
              </Text>
            </MobileCard>
          </View>
        </View>
      )}

      {/* ── Quick Actions Grid ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
          Parent Actions
        </Text>
      </View>

      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <TouchableOpacity
              key={action.label}
              onPress={action.onPress}
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

      {/* ── Conduct Log Modal ── */}
      <Modal
        visible={showConductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#161B22' : '#ffffff' }
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: isDark ? '#f1f5f9' : '#111827' }]}>
                  Conduct & Incident Log
                </Text>
                <Text style={[styles.modalSubtitle, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                  {selectedStudent?.users?.full_name || 'Student'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowConductModal(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconX size={20} color={isDark ? '#f1f5f9' : '#111827'} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <ViolationList violations={childViolations} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 110, // Clears the 60+insets bottom tab bar cleanly
  },
  childPillsScroll: {
    gap: 8,
    paddingBottom: spacing.sm,
  },
  childPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
  },
  childPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  childHeroCard: {
    padding: spacing.lg,
    borderRadius: 28,
    marginBottom: spacing.md,
  },
  childHeroOverline: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  childHeroName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  childHeroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,105,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  childHeroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6900',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metricValue: {
    fontSize: 26,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
});
