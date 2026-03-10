import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ParentService } from '@/services/ParentService';
import { router } from 'expo-router';
import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
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
      <View className="flex-1 justify-center items-center bg-white dark:bg-navy">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  return <ParentDashboard user={profile} logout={logout} />;
}

function ParentDashboard({ user, logout }: any) {
  const { isDark } = useTheme();
  const { hasDiary } = useSubscriptionTier();
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
      },
    });
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-navy">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-navy">
      <UnifiedHeader
        title="Intelligence"
        subtitle="Parent Portal"
        role="Parent"
        showNotification={true}
      />
      <SubscriptionBanner />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
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
              className="flex-row items-center bg-white dark:bg-navy-surface px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
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
            <View className="bg-gray-900 p-8 rounded-[48px] shadow-2xl mb-8">
              <View className="flex-row justify-between items-center mb-8">
                <View className="flex-1 mr-4">
                  <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Child Profile</Text>
                  <Text className="text-white text-3xl font-black tracking-tighter" numberOfLines={1}>
                    {selectedStudent?.users?.full_name}
                  </Text>
                  <View className="bg-[#FF6900]/20 self-start px-3 py-1 rounded-full mt-2">
                    <Text className="text-[#FF6900] text-[10px] font-bold tracking-widest uppercase">
                      {selectedStudent?.grade_level ? `Grade ${selectedStudent.grade_level}` : 'No Grade'}
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
                          {stu.users?.full_name?.split(' ')[0]}
                        </Text>
                        {stu.grade_level && (
                          <Text className={`text-[9px] mt-0.5 ${selectedStudent?.id === stu.id ? 'text-white/70' : 'text-gray-600'}`}>
                            Gr {stu.grade_level}
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
              />
              <MetricCard
                icon={CheckCircle}
                value={studentData.attendance?.overall_percentage || "N/A"}
                label="Attendance"
                color="#10B981"
              />
            </View>
          )}

          {/* Quick Actions */}
          {selectedStudent && (
            <>
              <View className="px-2 mb-6">
                <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Academic Oversight</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  Viewing: {selectedStudent.users?.full_name?.split(' ')[0]}
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
                <QuickAction
                  icon={CreditCard}
                  label="Finance"
                  color="#059669"
                  isDark={isDark}
                  onPress={() => goTo("/(parent)/finance")}
                />
                <QuickAction
                  icon={MessageSquare}
                  label="Messaging"
                  color="#0891b2"
                  isDark={isDark}
                  onPress={() => router.navigate("/(parent)/messages" as any)}
                />
                {hasDiary && (
                  <QuickAction
                    icon={BookOpen}
                    label="Class Diary"
                    color="#f59e0b"
                    isDark={isDark}
                    onPress={() => router.push("/(parent)/diary" as any)}
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
          <View className="bg-white dark:bg-navy-surface p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm mb-8 items-center border-dashed">
            <Bell size={28} color={isDark ? '#374151' : '#d1d5db'} />
            <Text className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest italic text-center mt-4">
              No unread notifications for {selectedStudent?.users?.full_name?.split(" ")[0] || 'your child'}
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const MetricCard = ({ icon: Icon, value, label, color }: any) => (
  <View className="flex-1 bg-white dark:bg-navy-surface p-6 rounded-[32px] border border-gray-50 dark:border-gray-800 shadow-sm">
    <View className={`w-10 h-10 rounded-2xl items-center justify-center mb-4`} style={{ backgroundColor: `${color}15` }}>
      <Icon size={20} color={color} />
    </View>
    <Text className="text-gray-900 dark:text-white text-3xl font-black tracking-tighter">{value}</Text>
    <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-[2px] mt-1">{label}</Text>
  </View>
);

const SectionHeader = ({ title, actionLabel, onAction }: any) => (
  <View className="flex-row justify-between items-center mb-6 px-4">
    <Text className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{title}</Text>
    <TouchableOpacity onPress={onAction} className="bg-orange-50 dark:bg-orange-950/30 px-4 py-2 rounded-xl">
      <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-widest">{actionLabel}</Text>
    </TouchableOpacity>
  </View>
);

const QuickAction = ({ icon: Icon, label, color, onPress, isDark }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="w-[48%] bg-white dark:bg-navy-surface p-8 rounded-[40px] border border-gray-50 dark:border-gray-800 shadow-sm items-center mb-4 active:opacity-80"
  >
    <View style={{ backgroundColor: isDark ? `${color}25` : `${color}10` }} className="p-4 rounded-3xl mb-3 shadow-inner">
      <Icon size={24} color={color} />
    </View>
    <Text className="text-gray-900 dark:text-gray-200 font-bold text-xs uppercase tracking-widest">{label}</Text>
  </TouchableOpacity>
);