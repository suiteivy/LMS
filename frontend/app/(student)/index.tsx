import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { supabase } from "@/libs/supabase";
import { useRouter } from "expo-router";
import { ArrowRight, Book, BookOpen, CalendarCheck, Clock, GraduationCap, Star, Wallet } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface QuickActionProps {
  icon: any;
  label: string;
  color: string;
  onPress: () => void
}

const QuickAction = ({ icon: Icon, label, color, onPress }: QuickActionProps) => (
  <TouchableOpacity
    onPress={onPress}
    className="w-[47%] bg-white dark:bg-[#121212] p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm items-center mb-4 active:bg-gray-50 dark:active:bg-gray-900"
  >
    <View style={{ backgroundColor: `${color}10` }} className="p-3.5 rounded-2xl mb-3">
      <Icon size={24} color={color} />
    </View>
    <Text className="text-gray-900 dark:text-gray-200 font-bold text-sm tracking-tight">{label}</Text>
  </TouchableOpacity>
);

export default function Index() {
  const { profile, displayId, loading: authLoading, studentId, isDemo } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotification, setShowNotification] = useState(false);
  const router = useRouter();

  const [gpa, setGpa] = useState<string>("0.00");
  const [attendancePct, setAttendancePct] = useState<string>("0%");
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (studentId || isDemo) {
      fetchDashboardData();
    }
  }, [studentId, isDemo]);

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);

      if (isDemo) {
        // High-quality mock data for Demo Mode
        setGpa("3.85");
        setAttendancePct("94%");
        setTodaysSchedule([
          {
            id: 'demo-1',
            start_time: '08:00:00',
            end_time: '09:30:00',
            subjects: { title: 'Advanced Mathematics' },
            room_number: 'Lecture Hall A'
          },
          {
            id: 'demo-2',
            start_time: '10:00:00',
            end_time: '11:30:00',
            subjects: { title: 'Theoretical Physics' },
            room_number: 'Science Lab 2'
          },
          {
            id: 'demo-3',
            start_time: '13:30:00',
            end_time: '15:00:00',
            subjects: { title: 'Software Engineering' },
            room_number: 'CS Lab 101'
          }
        ]);
        return;
      }

      if (!studentId) return;

      const { data: gradesData } = await supabase
        .from('grades')
        .select('total_grade')
        .eq('student_id', studentId);

      if (gradesData && gradesData.length > 0) {
        const scores = gradesData
        .filter(g => g.total_grade !== null)
        .map(g => g.total_grade);

        if(scores.length > 0) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          setGpa((avg /25).toFixed(2));
        }else {
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
        const present = attendanceData.filter(r => r.status === 'present' || r.status === 'late').length;
        const pct = Math.round((present / total) * 100);
        setAttendancePct(`${pct}%`);
      } else {
        setAttendancePct("-%");
      }

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
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <UnifiedHeader
        title="Intelligence"
        subtitle="Dashboard"
        role="Student"
        showNotification={true}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
        }
      >
        <View className="p-4 md:p-8 bg-gray-50 dark:bg-black">
          {/* Welcome Header */}
          <View className="mb-8 px-2">
            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px] mb-2">Academic Portal</Text>
            <Text className="text-gray-900 dark:text-white font-bold text-3xl tracking-tight">
              Hello, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
            </Text>
            <Text className="text-gray-400 dark:text-gray-500 text-xs font-medium mt-1">ID: {displayId || 'Not Assigned'}</Text>
          </View>

          {/* Core Metrics */}
          <View className="flex-row gap-4 mb-8">
            <View className="flex-1 bg-gray-900 dark:bg-[#1a1a1a] p-6 rounded-[40px] shadow-lg border border-transparent dark:border-gray-800">
              <Star size={20} color="#FF6900" />
              <Text className="text-white text-3xl font-bold mt-4 tracking-tighter">
                {gpa}
              </Text>
              <Text className="text-white/40 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mt-1">GPA Score</Text>
            </View>
            <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-6 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm">
              <Clock size={20} color="#FF6900" />
              <Text className="text-gray-900 dark:text-white text-3xl font-bold mt-4 tracking-tighter">
                {attendancePct}
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mt-1">Attendance</Text>
            </View>
          </View>

          {/* Today's Schedule */}
          <View className="flex-row justify-between items-center mb-6 px-2">
            <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Today's Lectures</Text>
            <TouchableOpacity onPress={() => router.push("/(student)/timetable" as any)}>
              <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest underline">View Full</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row mb-10 -mx-4 px-4"
          >
            {loadingData ? (
              <View className="p-10 items-center"><ActivityIndicator color="#FF6900" /></View>
            ) : todaysSchedule.length > 0 ? (
              todaysSchedule.map((item, index) => (
                <View key={item.id} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm mr-4 w-64">
                  <View className="flex-row items-center mb-4">
                    <View className={`p-2 rounded-xl mr-3 ${index % 2 === 0 ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <BookOpen size={16} color={index % 2 === 0 ? "#FF6900" : "#6B7280"} />
                    </View>
                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                      {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                    </Text>
                  </View>
                  <Text className="text-gray-900 dark:text-white font-bold text-lg mb-1 tracking-tight" numberOfLines={1}>
                    {item.subjects?.title || "Subject"}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-300 text-xs font-medium">
                    {item.room_number || "Remote Learning"}
                  </Text>
                </View>
              ))
            ) : (
              <View className="w-full bg-white dark:bg-[#1a1a1a] p-10 rounded-[40px] border border-gray-100 dark:border-gray-800 border-dashed items-center justify-center">
                <Text className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest italic">No classes today</Text>
              </View>
            )}
          </ScrollView>

          {/* Academic Suite */}
          <View className="px-2 mb-6">
            <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Academic Tools</Text>
          </View>
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
              label="Finances"
              color="#FF6900"
              onPress={() => router.push("/(student)/finance" as any)}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}