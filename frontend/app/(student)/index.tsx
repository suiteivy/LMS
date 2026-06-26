import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { SubscriptionBanner, SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/libs/supabase";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Book,
  BookOpen,
  CalendarCheck,
  Clock,
  GraduationCap,
  Star,
  Wallet,
  LogOut,
} from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

// ─── Quick Action ────────────────────────────────────────────────────────────

interface QuickActionProps {
  icon: any;
  label: string;
  color: string;
  onPress: () => void;
  cols: number;
}

const QuickAction = ({ icon: Icon, label, color, onPress, cols }: QuickActionProps) => {
  const { isDark } = useTheme();
  // Tighter padding on 3-col layout, more breathing room on 2-col
  const pad = cols >= 3 ? 14 : 18;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        width: `${Math.floor(100 / cols) - 2}%`,
        marginBottom: 12,
        padding: pad,
        borderRadius: 20,
        backgroundColor: isDark ? '#161B22' : '#ffffff',
        borderWidth: 1,
        borderColor: isDark ? '#1f2937' : '#f1f5f9',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.35 : 0.06,
        shadowRadius: 4,
        elevation: 2,
        boxShadow: [{
          offsetX: 0,
          offsetY: 1,
          blurRadius: 4,
          color: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.06)',
        }],
      }}
    >
      <View
        style={{
          backgroundColor: `${color}15`,
          padding: cols >= 3 ? 10 : 12,
          borderRadius: 14,
          marginBottom: 8,
        }}
      >
        <Icon size={cols >= 3 ? 20 : 22} color={color} strokeWidth={2} />
      </View>
      <Text
        style={{
          color: isDark ? '#e2e8f0' : '#111827',
          fontWeight: '700',
          fontSize: cols >= 3 ? 11 : 12,
          letterSpacing: 0.1,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Metric Card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: any;
  value: string;
  label: string;
  dark?: boolean;
  isDark: boolean;
}

const MetricCard = ({ icon: Icon, value, label, dark = false, isDark }: MetricCardProps) => {
  const bg = dark
    ? (isDark ? '#1a1a2e' : '#111827')
    : (isDark ? '#1a1a2e' : '#ffffff');

  const valuColor = dark ? '#ffffff' : (isDark ? '#ffffff' : '#111827');
  const labelColor = dark ? 'rgba(255,255,255,0.4)' : (isDark ? '#64748b' : '#94a3b8');
  const borderColor = dark ? 'transparent' : (isDark ? '#1f2937' : '#f1f5f9');

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        padding: 20,
        borderRadius: 28,
        borderWidth: 1,
        borderColor,
        shadowColor: dark ? '#FF6900' : '#000',
        shadowOffset: { width: 0, height: dark ? 8 : 2 },
        shadowOpacity: dark ? 0.15 : (isDark ? 0.35 : 0.07),
        shadowRadius: dark ? 16 : 6,
        elevation: dark ? 8 : 2,
        boxShadow: [{
          offsetX: 0,
          offsetY: dark ? 8 : 2,
          blurRadius: dark ? 16 : 6,
          color: dark
            ? 'rgba(255, 105, 0, 0.15)'
            : (isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.07)'),
        }],
      }}
    >
      <Icon size={18} color="#FF6900" strokeWidth={2} />
      <Text style={{ color: valuColor, fontSize: 30, fontWeight: '800', marginTop: 12, letterSpacing: -1 }}>
        {value}
      </Text>
      <Text style={{ color: labelColor, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
};

// ─── Schedule Card ────────────────────────────────────────────────────────────

interface ScheduleCardProps {
  item: any;
  index: number;
  isDark: boolean;
  isGrid?: boolean;
}

const ScheduleCard = ({ item, index, isDark, isGrid }: ScheduleCardProps) => {
  const accent = index % 2 === 0;
  return (
    <View
      style={{
        backgroundColor: isDark ? '#161B22' : '#ffffff',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: isDark ? '#1f2937' : '#f1f5f9',
        // Horizontal scroll: fixed width. Grid: flex fill handled by parent
        ...(isGrid ? { flex: 1 } : { width: 220, marginRight: 12 }),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 4,
        elevation: 2,
        boxShadow: [{
          offsetX: 0,
          offsetY: 1,
          blurRadius: 4,
          color: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)',
        }],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View
          style={{
            backgroundColor: accent
              ? (isDark ? 'rgba(255,105,0,0.15)' : '#fff7ed')
              : (isDark ? '#1f2937' : '#f8fafc'),
            padding: 7,
            borderRadius: 10,
            marginRight: 8,
          }}
        >
          <BookOpen size={14} color={accent ? "#FF6900" : "#6B7280"} strokeWidth={2} />
        </View>
        <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontWeight: '700', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {item.start_time?.slice(0, 5)} – {item.end_time?.slice(0, 5)}
        </Text>
      </View>
      <Text style={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: '700', fontSize: 14, marginBottom: 6, letterSpacing: -0.2 }} numberOfLines={1}>
        {item.subjects?.title || "Subject"}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: 11, fontWeight: '500' }}>
          {item.room_number || "Room TBD"}
        </Text>
        <Text style={{ color: '#FF6900', fontSize: 10, fontWeight: '700' }}>
          {item.subjects?.teachers?.users?.full_name?.split(' ')[0] || "Faculty"}
        </Text>
      </View>
    </View>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  isDark: boolean;
}

const SectionHeader = ({ title, actionLabel, onAction, isDark }: SectionHeaderProps) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
    <Text style={{ fontSize: 17, fontWeight: '800', color: isDark ? '#f1f5f9' : '#111827', letterSpacing: -0.3 }}>
      {title}
    </Text>
    {actionLabel && onAction && (
      <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
        <Text style={{ color: '#FF6900', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {actionLabel}
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function Index() {
  const { profile, displayId, loading: authLoading, studentId, isDemo, logout } = useAuth();
  const { isDark } = useTheme();
  const { hasDiary, showFinancials } = useSubscriptionTier();
  const tier = useSubscriptionTier();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // 3-col on wider phones/tablets, 2-col on compact phones
  const quickActionCols = width >= 400 ? 3 : 2;
  // Grid schedule layout on wider screens, horizontal scroll on mobile
  const useScheduleGrid = width >= 600;

  const [gpa, setGpa] = useState<string>("0.00");
  const [attendancePct, setAttendancePct] = useState<string>("0%");
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (studentId || isDemo) fetchDashboardData();
    else setLoadingData(false);
  }, [studentId, isDemo, authLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);

      if (isDemo) {
        setGpa("3.85");
        setAttendancePct("94%");
        setTodaysSchedule([
          {
            id: 'demo-1',
            start_time: '08:00:00',
            end_time: '09:30:00',
            subjects: { title: 'Advanced Mathematics' },
            room_number: 'Lecture Hall A',
          },
          {
            id: 'demo-2',
            start_time: '10:00:00',
            end_time: '11:30:00',
            subjects: { title: 'Theoretical Physics' },
            room_number: 'Science Lab 2',
          },
          {
            id: 'demo-3',
            start_time: '13:30:00',
            end_time: '15:00:00',
            subjects: { title: 'Software Engineering' },
            room_number: 'CS Lab 101',
          },
        ]);
        return;
      }

      if (!studentId) return;

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
          setGpa((avg / 25).toFixed(2));
        } else {
          setGpa("0.00");
        }
      } else {
        setGpa("0.00");
      }

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId!);

      if (attendanceData && attendanceData.length > 0) {
        const total = attendanceData.length;
        const present = (attendanceData as any[]).filter((r: any) => r.status === 'present' || r.status === 'late').length;
        setAttendancePct(`${Math.round((present / total) * 100)}%`);
      } else {
        setAttendancePct("–%");
      }

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
      const today = days[new Date().getDay()];

      const { data: myClasses } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', studentId);

      if (myClasses && myClasses.length > 0) {
        const classIds = (myClasses as any[]).map((c: any) => c.class_id);
        const { data: schedule } = await supabase
          .from('timetables')
          .select(`*, subjects(title, teachers(users(full_name))), classes(name)`)
          .in('class_id', classIds)
          .eq('day_of_week', today)
          .order('start_time', { ascending: true });

        setTodaysSchedule(schedule || []);
      } else {
        setTodaysSchedule([]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (studentId) fetchDashboardData();
    else setRefreshing(false);
  }, [studentId]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#161B22' : '#f8fafc' }}>
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  // ─── Quick actions list (conditional on subscription) ───────────────────
  const quickActions = [
    { icon: GraduationCap, label: "Library", color: "#0d9488", route: "/(student)/library" },
    { icon: Star, label: "Grades", color: "#eab308", route: "/(student)/grades" },
    { icon: ArrowRight, label: "Assignments", color: "#f43f5e", route: "/(student)/assignments" },
    { icon: CalendarCheck, label: "Attendance", color: "#22c55e", route: "/(student)/attendance" },
    ...(showFinancials ? [{ icon: Wallet, label: "Finances", color: "#FF6900", route: "/(student)/finance" }] : []),
    ...(hasDiary ? [{ icon: BookOpen, label: "Diary", color: "#f59e0b", route: "/(student)/diary" }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#161B22' : '#f8fafc' }}>
      <UnifiedHeader
        title="Dashboard"
        subtitle={profile?.full_name || "Student Portal"}
        role="Student"
        showNotification={true}
      />
      <SubscriptionBanner />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF6900"]}
            tintColor="#FF6900"
          />
        }
      >
        <View style={{ padding: 20 }}>
          {/* Log out link */}
          <View className="flex-row justify-end mb-6 px-2">
            <TouchableOpacity
              onPress={async () => {
                await logout();
                router.replace("/(auth)/signIn");
              }}
              style={{
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 1,
                  blurRadius: 2,
                  color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.05)',
                }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.4 : 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
              className="flex-row items-center bg-white dark:bg-[#161B22] px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800"
            >
              <LogOut size={14} color="#ef4444" />
              <Text className="ml-2 text-red-600 font-bold text-[10px] uppercase tracking-widest">Logout</Text>
            </TouchableOpacity>
          </View>

          {/* ── Welcome ───────────────────────────────────────────────── */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              color: isDark ? '#475569' : '#94a3b8',
              fontWeight: '700',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: 3,
              marginBottom: 6,
            }}>
              Academic Portal
            </Text>
            <Text style={{
              color: isDark ? '#f1f5f9' : '#111827',
              fontWeight: '800',
              fontSize: 26,
              letterSpacing: -0.5,
              lineHeight: 30,
            }}>
              Hello, {profile?.first_name || profile?.full_name?.split(' ')[0] || 'Student'}
            </Text>
            <Text style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: 11, fontWeight: '500', marginTop: 3 }}>
              ID: {displayId || 'Not Assigned'}
            </Text>
          </View>

          {/* ── Metric Cards ─────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
            <HelpTooltip id="student.dashboard.metrics" role="student" tier={tier} onLearnMore={(a) => router.push({ pathname: '/(student)/accessibility/settings', params: { manual: '1', anchor: a || 'student-workflow' } } as any)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
            <MetricCard
              icon={Star}
              value={gpa}
              label="GPA Score"
              dark
              isDark={isDark}
            />
            <MetricCard
              icon={Clock}
              value={attendancePct}
              label="Attendance"
              isDark={isDark}
            />
          </View>

          {/* ── Today's Schedule ─────────────────────────────────────── */}
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionHeader
                title="Today's Lectures"
                actionLabel="Full Schedule"
                onAction={() => router.push("/(student)/timetable" as any)}
                isDark={isDark}
              />
              <HelpTooltip id="student.dashboard.schedule" role="student" tier={tier} onLearnMore={(a) => router.push({ pathname: '/(student)/accessibility/settings', params: { manual: '1', anchor: a || 'student-workflow' } } as any)} />
            </View>

            {loadingData ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator color="#FF6900" />
              </View>
            ) : todaysSchedule.length > 0 ? (
              useScheduleGrid ? (
                // Grid layout on wider screens
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {todaysSchedule.map((item, index) => (
                    <View key={item.id} style={{ width: '48%' }}>
                      <ScheduleCard item={item} index={index} isDark={isDark} isGrid />
                    </View>
                  ))}
                </View>
              ) : (
                // Horizontal scroll on compact mobile
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -20 }}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4 }}
                >
                  {todaysSchedule.map((item, index) => (
                    <ScheduleCard key={item.id} item={item} index={index} isDark={isDark} />
                  ))}
                </ScrollView>
              )
            ) : (
              // Empty state
              <View style={{
                padding: 32,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: isDark ? '#1f2937' : '#e2e8f0',
                borderStyle: 'dashed',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              }}>
                <CalendarCheck size={24} color={isDark ? '#334155' : '#cbd5e1'} strokeWidth={1.5} />
                <Text style={{ color: isDark ? '#475569' : '#94a3b8', fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10 }}>
                  No classes today
                </Text>
                <Text style={{ color: isDark ? '#334155' : '#cbd5e1', fontSize: 11, marginTop: 4 }}>
                  Enjoy the free time
                </Text>
              </View>
            )}
          </View>

          {/* ── Academic Tools ────────────────────────────────────────── */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionHeader title="Academic Tools" isDark={isDark} />
              <HelpTooltip id="student.dashboard.tools" role="student" tier={tier} onLearnMore={(a) => router.push({ pathname: '/(student)/accessibility/settings', params: { manual: '1', anchor: a || 'student-workflow' } } as any)} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {quickActions.map((action) => (
                <QuickAction
                  key={action.label}
                  icon={action.icon}
                  label={action.label}
                  color={action.color}
                  onPress={() => router.push(action.route as any)}
                  cols={quickActionCols}
                />
              ))}
            </View>
          </View>

          {/* ── Performance Trends (add-on gated institution-wide) ───── */}
          <SubscriptionGate
            feature="analytics"
            fallback={
              <View
                style={{
                  backgroundColor: isDark ? '#161B22' : '#fff7ed',
                  borderColor: isDark ? '#1f2937' : '#fed7aa',
                  borderWidth: 1,
                  borderRadius: 20,
                  padding: 16,
                  marginTop: 8,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: '800', fontSize: 14, marginBottom: 4 }}>
                  Performance Trends Locked
                </Text>
                <Text style={{ color: isDark ? '#94a3b8' : '#6b7280', fontSize: 12, marginBottom: 12 }}>
                  Your institution has not enabled the Analytics add-on yet.
                </Text>
              </View>
            }
          >
            <TouchableOpacity
              onPress={() => router.push("/(student)/analytics" as any)}
              activeOpacity={0.75}
              style={{
                marginTop: 8,
                marginBottom: 12,
                padding: 16,
                borderRadius: 20,
                backgroundColor: isDark ? '#161B22' : '#ffffff',
                borderWidth: 1,
                borderColor: isDark ? '#1f2937' : '#f1f5f9',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(255,105,0,0.12)', padding: 10, borderRadius: 12, marginRight: 10 }}>
                  <ArrowRight size={16} color="#FF6900" />
                </View>
                <View>
                  <Text style={{ color: isDark ? '#f1f5f9' : '#111827', fontWeight: '700', fontSize: 13 }}>Performance Trends</Text>
                  <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 11 }}>View longitudinal analytics</Text>
                </View>
              </View>
            </TouchableOpacity>
          </SubscriptionGate>

        </View>
      </ScrollView>
    </View>
  );
}
