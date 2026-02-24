import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ParentService } from "@/services/ParentService";
import { supabase } from "@/libs/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { BookOpen, LayoutList, Star, TrendingUp } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";

const gradeColor = (g: string) => {
  if (g.startsWith("A")) return { bg: "bg-emerald-50", text: "text-emerald-700" };
  if (g.startsWith("B")) return { bg: "bg-blue-50", text: "text-blue-700" };
  return { bg: "bg-amber-50", text: "text-amber-700" };
};

export default function StudentGradesPage() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [performance, setPerformance] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [stats, setStats] = useState({ gpa: "0.0", attendance_pct: "0", standing: "N/A" });

  const fetchPerformanceData = async () => {
    if (!studentId) return;
    try {
      const [performanceData, attendance] = await Promise.all([
        ParentService.getStudentPerformance(studentId),
        ParentService.getStudentAttendance(studentId)
      ]);

      setPerformance(performanceData);

      const allSubmissions = [
        ...(performanceData.submissions || []),
        ...(performanceData.grades || [])
      ].map((s: any, idx: number) => ({
        id: s.id || `grade-${idx}`,
        title: s.assignment?.title || s.title || (s.subject?.title + " Grade"),
        subject: s.assignment?.subject?.title || s.subject?.title || "Unknown",
        score: s.grade || s.total_grade || 0,
        grade: s.letter_grade || (s.grade >= 80 ? 'A' : s.grade >= 70 ? 'B' : s.grade >= 60 ? 'C' : 'D'),
        feedback: s.feedback || ""
      }));

      setGrades(allSubmissions);

      // Simple GPA Calc
      const avg = allSubmissions.length > 0
        ? allSubmissions.reduce((acc, curr) => acc + Number(curr.score), 0) / allSubmissions.length
        : 0;
      const gpa = (avg / 25).toFixed(1);

      // Attendance Pct
      let attendancePct = "0";
      if (attendance && attendance.length > 0) {
        const present = attendance.filter((a: any) => a.status === 'present' || a.status === 'late').length;
        attendancePct = `${Math.round((present / attendance.length) * 100)}`;
      }

      // Fetch Rank
      const { data: rankData }: any = await (supabase.rpc as any)('get_student_rank', { p_student_id: studentId });

      setStats({
        gpa,
        attendance_pct: attendancePct,
        standing: Number(gpa) >= 3.5 ? "Excellent" : Number(gpa) >= 3.0 ? "Good" : "Probation",
        rank: rankData?.rank || 'N/A',
        totalStudents: rankData?.total_students || 0
      } as any);

    } catch (error) {
      console.error("Error fetching performance data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [studentId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPerformanceData();
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }
  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <UnifiedHeader
        title="Intelligence"
        subtitle="Performance"
        role="Parent"
        onBack={() => router.back()}
        showNotification={false}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
        }
      >
        <View className="p-4 md:p-8">
          {/* GPA Hero Section */}
          <View className="bg-gray-900 p-8 rounded-[48px] shadow-2xl mb-8">
            <View className="flex-row justify-between items-start mb-10">
              <View>
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Cumulative Index</Text>
                <Text className="text-white text-6xl font-black tracking-tighter">{stats.gpa}</Text>
                <Text className="text-[#FF6900] text-xs font-bold mt-2 uppercase tracking-widest">{stats.standing} Standing</Text>
              </View>
              <View className="bg-[#FF6900] p-4 rounded-3xl shadow-lg">
                <TrendingUp size={28} color="white" />
              </View>
            </View>

            {/* Performance Grid */}
            <View className="flex-row justify-between pt-8 border-t border-white/10">
              <View className="items-center">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Cohort Rank</Text>
                <Text className="text-white font-bold text-xl mt-1">{(stats as any).rank}{(stats as any).totalStudents > 0 ? `/${(stats as any).totalStudents}` : ''}</Text>
              </View>
              <View className="items-center border-x border-white/10 px-8">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Attendance</Text>
                <Text className="text-white font-bold text-xl mt-1">{stats.attendance_pct}%</Text>
              </View>
              <View className="items-center">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Standing</Text>
                <Text className="text-emerald-400 font-bold text-xl mt-1">{stats.standing}</Text>
              </View>
            </View>
          </View>

          {/* Transcript Breakdown */}
          <View className="px-2 flex-row justify-between items-center mb-6">
            <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Academic Transcript</Text>
            <TouchableOpacity className="bg-white dark:bg-[#1a1a1a] p-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <LayoutList size={16} color="#FF6900" />
            </TouchableOpacity>
          </View>

          {grades.length === 0 ? (
            <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-4">
              <Star size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
              <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6">No records found</Text>
            </View>
          ) : (
            grades.map((result: any) => {
              const gc = gradeColor(result.grade);
              return (
                <View key={result.id} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] mb-4 border border-gray-50 dark:border-gray-800 shadow-sm">
                  <View className="flex-row justify-between items-center mb-6">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-2xl bg-orange-50 items-center justify-center mr-3">
                        <BookOpen size={18} color="#FF6900" />
                      </View>
                      <View>
                        <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight">{result.subject}</Text>
                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-0.5">{result.title}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <View className={`${gc.bg} px-3 py-1 rounded-full mb-1`}>
                        <Text className={`${gc.text} font-black text-xs uppercase tracking-widest`}>{result.grade}</Text>
                      </View>
                      <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest">{result.score}% Accuracy</Text>
                    </View>
                  </View>

                  {result.feedback && (
                    <View className="bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <View className="flex-row items-center mb-3">
                        <Star size={14} color="#FF6900" />
                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest ml-2">Faculty Evaluation</Text>
                      </View>
                      <Text className="text-gray-600 dark:text-gray-300 text-xs font-medium leading-5">{result.feedback}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

