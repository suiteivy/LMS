import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ParentService } from '@/services/ParentService';
import { router } from 'expo-router';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  LogOut,
  MessageSquare,
  TrendingUp,
  UserCircle
} from 'lucide-react-native';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SubscriptionBanner } from "@/components/shared/SubscriptionComponents";

export default function ParentIndex() {
  const { profile, loading, logout } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FFFFFF] dark:bg-[#0D1117]">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  return <ParentDashboard user={profile} logout={logout} />;
}

function ParentDashboard({ user, logout }: any) {
  const { isDark } = useTheme();
  const levelLabel = user?.institutions?.school_categories?.level_label || 'Grade';
  const tier = useSubscriptionTier();
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLinkedStudents = async () => {
    try {
      const students = await ParentService.getLinkedStudents();
      setLinkedStudents(students);
      if (students.length > 0) {
        setSelectedStudent(students[0]);
      }
    } catch (error) {
      console.error("Error fetching linked students:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStudentDetails = async (studentId: string) => {
    try {
      const [performance, attendance] = await Promise.all([
        ParentService.getStudentPerformance(studentId),
        ParentService.getStudentAttendance(studentId)
      ]);

      let avgGrade = "N/A";
      if (performance.grades && performance.grades.length > 0) {
        avgGrade = performance.grades[0].grade || "N/A";
      }

      let attendancePct: string | number = "N/A";
      if (attendance && attendance.length > 0) {
        const present = attendance.filter((a: any) => a.status === 'present' || a.status === 'late').length;
        attendancePct = `${Math.round((present / attendance.length) * 100)}%`;
      }

      setStudentData({
        performance: { average_grade: avgGrade },
        attendance: { overall_percentage: attendancePct }
      });
    } catch (error) {
      console.error("Error fetching student details:", error);
    }
  };

  useEffect(() => {
    fetchLinkedStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentDetails(selectedStudent.id);
    }
  }, [selectedStudent]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLinkedStudents();
  };

  // Navigate to a sub-page with full student context
  const goTo = (pathname: string) => {
    if (!selectedStudent?.id) return;
    router.push({
      pathname: pathname as any,
      params: {
        studentId: selectedStudent.id,
        studentName: selectedStudent.users?.full_name || '',
        classId: selectedStudent.class_id || '',
      },
    });
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FFFFFF] dark:bg-[#0D1117]">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
      <UnifiedHeader
        title="Welcome back"
        subtitle={user?.full_name || "Parent Portal"}
        role="Parent/Guardian"
        showNotification={true}
      />
      <SubscriptionBanner />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20, paddingTop: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
        }
      >
        <View className="p-4 md:p-8">

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
              className="flex-row items-center bg-white dark:bg-navy-surface px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800"
            >
              <LogOut size={14} color="#ef4444" />
              <Text className="ml-2 text-red-600 font-bold text-[10px] uppercase tracking-widest">Logout</Text>
            </TouchableOpacity>
          </View>

          {/* No students linked state */}
          {linkedStudents.length === 0 && !loading && (
            <View className="bg-white dark:bg-navy-surface p-10 rounded-[40px] border border-dashed border-gray-200 dark:border-gray-700 items-center mb-8">
              <UserCircle size={40} color="#9ca3af" />
              <Text className="text-gray-400 dark:text-gray-500 font-bold text-sm text-center mt-4">
                No students linked to your account
              </Text>
              <Text className="text-gray-400 dark:text-gray-600 text-xs text-center mt-2">
                Contact your school admin to link your children
              </Text>
            </View>
          )}

          {/* Child Selection Hero */}
          {selectedStudent && (
            <View
              style={{
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 15,
                  blurRadius: 30,
                  color: 'rgba(0, 0, 0, 0.3)',
                }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 15 },
                shadowOpacity: 0.3,
                shadowRadius: 30,
                elevation: 20,
              }}
              className="bg-gray-900 p-8 rounded-[48px] mb-8"
            >
              <View className="flex-row justify-between items-center mb-8">
                <View className="flex-1 mr-4">
                  <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Child Profile</Text>
                  <Text className="text-white text-3xl font-black tracking-tighter" numberOfLines={1}>
                    {selectedStudent?.users?.first_name ? `${selectedStudent.users.first_name} ${selectedStudent.users.last_name || ''}` : selectedStudent?.users?.full_name}
                  </Text>
                  <View className="bg-[#FF6900]/20 self-start px-3 py-1 rounded-full mt-2">
                    <Text className="text-[#FF6900] text-[10px] font-bold tracking-widest uppercase">
                      {selectedStudent?.grade_level || selectedStudent?.form_level ? `${levelLabel} ${selectedStudent.grade_level || selectedStudent.form_level}` : `No ${levelLabel}`}
                    </Text>
                  </View>
                </View>
                <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center border border-white/10">
                  <UserCircle size={32} color="white" />
                </View>
              </View>

              {/* Multi-student switcher (only appears when >1 child) */}
              {linkedStudents.length > 1 && (
                <View className="border-t border-white/10 pt-6">
                  <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-4">
                    Switch Child ({linkedStudents.length} linked)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {linkedStudents.map((stu) => (
                      <TouchableOpacity
                        key={stu.id}
                        onPress={() => setSelectedStudent(stu)}
                        className={`mr-3 px-6 py-2.5 rounded-2xl border ${selectedStudent?.id === stu.id ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-white/5 border-white/10'}`}
                      >
                        <Text className={`font-bold text-xs ${selectedStudent?.id === stu.id ? 'text-white' : 'text-gray-400'}`}>
                          {stu.users?.first_name || stu.users?.full_name?.split(' ')[0]}
                        </Text>
                        {(stu.grade_level || stu.form_level) && (
                          <Text className={`text-[9px] mt-0.5 ${selectedStudent?.id === stu.id ? 'text-white/70' : 'text-gray-600'}`}>
                            {levelLabel.substring(0, 2)} {stu.grade_level || stu.form_level}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Metrics Row */}
          {selectedStudent && (
            <View className="flex-row gap-4 mb-8">
              <MetricCard
                icon={TrendingUp}
                value={studentData.performance?.average_grade || "N/A"}
                label="Academic Avg"
                color="#FF6900"
                isDark={isDark}
              />
              <MetricCard
                icon={CheckCircle}
                value={studentData.attendance?.overall_percentage || "N/A"}
                label="Attendance"
                color="#10B981"
                isDark={isDark}
              />
            </View>
          )}

          {/* Quick Actions */}
          {selectedStudent && (
            <>
              <View className="px-2 mb-6">
                <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Academic Oversight</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  Viewing: {selectedStudent.users?.first_name || selectedStudent.users?.full_name?.split(' ')[0]}
                  {linkedStudents.length > 1 ? ` · ${linkedStudents.length} children` : ''}
                </Text>
              </View>

              <View className="flex-row flex-wrap justify-between px-1 mb-8">
                <QuickAction
                  icon={FileText}
                  label="Grades"
                  color="#2563eb"
                  isDark={isDark}
                  onPress={() => goTo("/(parent)/grades")}
                />
                <QuickAction
                  icon={Calendar}
                  label="Attendance"
                  color="#7c3aed"
                  isDark={isDark}
                  onPress={() => goTo("/(parent)/attendance")}
                />
                {tier.showFinancials && (
                  <QuickAction
                    icon={CreditCard}
                    label="Finance"
                    color="#059669"
                    isDark={isDark}
                    onPress={() => goTo("/(parent)/finance")}
                  />
                )}
                <QuickAction
                  icon={FileText}
                  label="Reports"
                  color="#ec4899"
                  isDark={isDark}
                  onPress={() => goTo("/(parent)/reports")}
                />
                <QuickAction
                  icon={Award}
                  label="Report Cards"
                  color="#8b5cf6"
                  isDark={isDark}
                  onPress={() => goTo("/(parent)/report-cards")}
                />
                <QuickAction
                  icon={TrendingUp}
                  label="Analytics"
                  color="#f97316"
                  isDark={isDark}
                  onPress={() => {
                    if (tier.hasAnalytics) {
                      goTo("/(parent)/analytics");
                    } else {
                      router.push("/(admin)/request-feature" as any);
                    }
                  }}
                />
                <QuickAction
                  icon={Clock}
                  label="Timetable"
                  color="#eab308"
                  isDark={isDark}
                  onPress={() => goTo("/(parent)/timetable")}
                />
                {tier.hasDiary && (
                  <QuickAction
                    icon={BookOpen}
                    label="Class Diary"
                    color="#f59e0b"
                    isDark={isDark}
                    onPress={() => goTo("/(parent)/diary")}
                  />
                )}
              </View>
            </>
          )}

          {/* Updates Section */}
          <SectionHeader
            title="Institutional Updates"
            actionLabel="Archive"
            onAction={() => router.push("/(parent)/announcements" as any)}
          />
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
            activeOpacity={0.7}
            className="flex-row items-center bg-white dark:bg-navy-surface px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800"
          >
            <LogOut size={14} color="#ef4444" />
            <Text className="ml-2 text-red-600 font-bold text-[10px] uppercase tracking-widest">Logout</Text>
          </TouchableOpacity>

          <SectionHeader
            title="Institutional Updates"
            actionLabel="Archive"
            onAction={() => router.push("/(parent)/announcements" as any)}
          />
          <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-6 mb-6 items-center">
            <Bell size={28} color={isDark ? '#4B5563' : '#9CA3AF'} />
            <Text className="text-gray-500 dark:text-gray-400 mt-2 text-xs uppercase tracking-widest font-bold text-center">
              No unread notifications
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const SectionHeader = ({ title, actionLabel, onAction }: any) => (
  <View className="flex-row justify-between items-end mb-3">
    <Text className="text-lg font-bold text-gray-900 dark:text-white">{title}</Text>
    {actionLabel && onAction && (
      <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
        <Text className="text-[#FF6900] font-bold text-sm">{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const QuickAction = ({ icon: Icon, label, color, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-4 mr-3 mb-3 min-w-[140px]"
  >
    <View className="flex-row items-center mb-3">
      <Icon size={20} color={color} />
    </View>
    <Text className="text-gray-900 dark:text-white font-bold">{label}</Text>
  </TouchableOpacity>
);

const MetricCard = ({ icon: Icon, value, label, color, isDark }: any) => (
  <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-4">
    <Icon size={18} color={color} />
    <Text className="text-gray-900 dark:text-white text-2xl font-black mt-2">{value}</Text>
    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">{label}</Text>
  </View>
);
