import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { Clock, ArrowRight, BookOpen, Star, GraduationCap, Book, Bell, MessageSquare, Wallet, CalendarCheck } from 'lucide-react-native';
import Notifications from '../../components/Notifications';
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { supabase } from "@/libs/supabase";

// Define Interface for the QuickAction props
interface QuickActionProps {
  icon: any;
  label: string;
  color: string;
  onPress: () => void
}

const QuickAction = ({ icon: Icon, label, color, onPress }: QuickActionProps) => (
  <TouchableOpacity
    onPress={onPress}
    className="w-[48%] bg-white p-6 rounded-3xl border border-gray-100 shadow-sm items-center mb-4 active:bg-gray-50"
  >
    <View style={{ backgroundColor: `${color}15` }} className="p-3 rounded-2xl mb-2">
      <Icon size={24} color={color} />
    </View>
    <Text className="text-gray-800 font-bold">{label}</Text>
  </TouchableOpacity>
);

export default function Index() {
  const { profile, displayId, loading: authLoading, studentId } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotification, setShowNotification] = useState(false);
  const router = useRouter();

  // Live Data State
  const [gpa, setGpa] = useState<string>("0.00");
  const [attendancePct, setAttendancePct] = useState<string>("0%");
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (studentId) {
      fetchDashboardData();
    }
  }, [studentId]);

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);

      // 1. Calculate GPA from enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('grade')
        .eq('student_id', studentId!);

      if (enrollments && enrollments.length > 0) {
        const gradeToPoints = (grade: string | null): number | null => {
          if (!grade) return null;
          const g = grade.toUpperCase().trim();
          if (g === 'A') return 4.0;
          if (g === 'B+') return 3.5;
          if (g === 'B') return 3.0;
          if (g === 'C+') return 2.5;
          if (g === 'C') return 2.0;
          if (g === 'D') return 1.0;
          if (g === 'F') return 0.0;
          // Try parse as float if it's numeric
          const num = parseFloat(g);
          return isNaN(num) ? null : num;
        };

        const validGrades = enrollments
          .map(e => gradeToPoints(e.grade))
          .filter((p): p is number => p !== null);

        if (validGrades.length > 0) {
          const avg = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
          setGpa(avg.toFixed(2));
        } else {
          setGpa("0.00");
        }
      } else {
        setGpa("0.00");
      }

      // 2. Fetch Attendance Percentage
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId!);

      if (attendanceData && attendanceData.length > 0) {
        const total = attendanceData.length;
        const present = attendanceData.filter(r => r.status === 'present' || r.status === 'late').length;
        const pct = Math.round((present / total) * 100);
        setAttendancePct(`${pct}%`);
      } else {
        setAttendancePct("-%");
      }

      // 3. Fetch Today's Schedule
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
      const today = days[new Date().getDay()];

      if (!studentId) return;

      const { data: myClasses } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', studentId);

      if (myClasses && myClasses.length > 0) {
        const classIds = myClasses.map(c => c.class_id);
        const { data: schedule } = await supabase
          .from('timetables')
          .select(`
            *,
            subjects ( title ),
            classes ( name )
          `)
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
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />

      <View className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B00"]} />
          }
        >
          <View className="p-4 md:p-8">
            {/* --- 1. Header Section --- */}
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-gray-500 text-base font-medium">
                  Welcome back,
                </Text>
                <Text className="text-3xl font-bold text-gray-900">
                  {profile?.full_name || 'Student'} 👋
                </Text>
                <Text className="text-sm text-gray-500 font-medium">
                  ID: {displayId || 'Not Setup'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowNotification(true)}
                className="bg-white p-3 rounded-full border border-gray-100 shadow-sm relative"
              >
                <Bell size={24} color="#374151" />
                {(unreadCount > 0) && (
                  <View className="absolute top-0 right-0 bg-red-500 w-3 h-3 rounded-full border-2 border-white" />
                )}
              </TouchableOpacity>
            </View>

            {/* --- 2. Quick Status Cards --- */}
            <View className="flex-row gap-4 mb-8">
              <View className="flex-1 bg-orange-500 p-4 rounded-3xl shadow-sm">
                <Star size={20} color="white" />
                <Text className="text-white text-2xl font-bold mt-2">
                  {gpa}
                </Text>
                <Text className="text-orange-100 text-xs font-medium uppercase italic">
                  GPA
                </Text>
              </View>
              <View className="flex-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <Clock size={20} color="#f97316" />
                <Text className="text-gray-900 text-2xl font-bold mt-2">
                  {attendancePct}
                </Text>
                <Text className="text-gray-400 text-xs font-medium uppercase italic">
                  Attendance
                </Text>
              </View>
            </View>

            {/* --- 3. Upcoming Schedule --- */}
            <View className="flex-row justify-between items-end mb-4 ">
              <Text className="text-xl font-bold text-gray-900">
                Today's Schedule
              </Text>
              <TouchableOpacity onPress={() => router.push("/(student)/timetable" as any)}>
                <Text className="text-orange-500 font-semibold">View All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row mb-6 -mx-4 px-4 pb-4"
            >
              {loadingData ? (
                <View className="p-4 w-full items-center"><ActivityIndicator color="#FF6B00" /></View>
              ) : todaysSchedule.length > 0 ? (
                todaysSchedule.map((item, index) => (
                  <View key={item.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mr-4 w-64">
                    <View className="flex-row items-center mb-3">
                      <View className={`p-2 rounded-xl mr-3 ${index % 2 === 0 ? 'bg-orange-100' : 'bg-blue-100'}`}>
                        <BookOpen size={20} color={index % 2 === 0 ? "#f97316" : "#3b82f6"} />
                      </View>
                      <Text className="text-gray-400 font-bold text-[10px] uppercase">
                        {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                      </Text>
                    </View>
                    <Text className="text-gray-900 font-bold text-lg mb-1" numberOfLines={1}>
                      {item.subjects?.title || "Subject"}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {item.room_number || "Room TBD"}
                    </Text>
                  </View>
                ))
              ) : (
                <View className="w-full bg-white p-6 rounded-3xl border border-gray-100 items-center justify-center mr-4">
                  <Text className="text-gray-400 italic">No classes scheduled for today.</Text>
                </View>
              )}
            </ScrollView>

            {/* --- 4. Quick Actions Grid --- */}
            <View className="mt-2">
              <Text className="text-xl font-bold text-gray-900 mb-4">
                Resources
              </Text>
              <View className="flex-row flex-wrap justify-between">
                <QuickAction
                  icon={GraduationCap}
                  label="Library"
                  color="#0d9488"
                  onPress={() => router.push("/(student)/library" as any)}
                />
                <QuickAction
                  icon={Book}
                  label="Subjects"
                  color="#8b5cf6"
                  onPress={() => router.push("/(student)/subjects" as any)}
                />
                <QuickAction
                  icon={ArrowRight}
                  label="Assignments"
                  color="#f43f5e"
                  onPress={() => router.push("/(student)/assignments" as any)}
                />
                <QuickAction
                  icon={Star}
                  label="Grades"
                  color="#eab308"
                  onPress={() => router.push("/(student)/grades" as any)}
                />
                <QuickAction
                  icon={CalendarCheck}
                  label="Attendance"
                  color="#22c55e"
                  onPress={() => router.push("/(student)/attendance" as any)}
                />
                <QuickAction
                  icon={Wallet}
                  label="Finance"
                  color="#FF6B00"
                  onPress={() => router.push("/(student)/finance" as any)}
                />
                <QuickAction
                  icon={MessageSquare}
                  label="Messages"
                  color="#0891b2"
                  onPress={() => router.push("/(student)/messages" as any)}
                />
                {/* Empty View to balance the grid if odd number of items */}
                <View className="w-[48%]" />
              </View>
            </View>
          </View>
        </ScrollView>

        <Notifications
          visible={showNotification}
          onClose={() => setShowNotification(false)}
        />
      </View>
    </>
  );
}