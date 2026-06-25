import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { ArrowLeft, TrendingUp, BarChart3, Award, BookOpen } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { ParentService } from "@/services/ParentService";
import { GradingAPI } from "@/services/GradingService";
import { formatClassLabel } from "@/utils/classLabel";
import { getPerformanceLabel } from "@/utils/getPerformanceLabel";
import { TrendChart, SubjectTrendCard } from "@/components/common/TrendChart";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { setParentSelectedChild } from "@/utils/parentSelectedChild";
import { useParentStudentContext } from "@/hooks/useParentStudentContext";

export default function ParentAnalyticsPage() {
  const params = useLocalSearchParams<{ studentId?: string; studentName?: string; classId?: string }>();
  const context = useParentStudentContext(params as any, { persistWhenParamPresent: false });
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const { hasAnalytics } = useSubscriptionTier();
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [trends, setTrends] = useState<any>({ terms: [], subjects: [] });
  const [gradingScales, setGradingScales] = useState<any[]>([]);
  const [reportCards, setReportCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (student?: any) => {
    const target = student || selectedStudent;
    if (!target) return;

    setLoading(true);
    try {
      const [trendData, scales, cards] = await Promise.all([
        GradingAPI.getPerformanceTrends({ student_id: target.id }).catch(() => ({ terms: [], subjects: [] })),
        GradingAPI.getGradingScales().catch(() => []),
        GradingAPI.getReportCards({ student_id: target.id }).catch(() => []),
      ]);

      setTrends(trendData);
      setGradingScales(Array.isArray(scales) ? scales : []);
      setReportCards(Array.isArray(cards) ? cards : []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadStudents = async () => {
      if (!context.ready) return;
      try {
        const students = await ParentService.getLinkedStudents();
        setLinkedStudents(students);
        if (students.length > 0) {
          const matched = context.studentId
            ? students.find((s: any) => s.id === context.studentId)
            : null;
          const initial = matched || students[0];
          setSelectedStudent(initial);
          await setParentSelectedChild({
            studentId: initial.id,
            studentName: initial.users?.full_name || "",
            classId: initial.class_id || "",
          });
        }
      } catch (error) {
        console.error("Error loading students:", error);
      }
    };
    loadStudents();
  }, [context.ready, context.studentId]);

  useEffect(() => {
    if (selectedStudent) {
      setParentSelectedChild({
        studentId: selectedStudent.id,
        studentName: selectedStudent.users?.full_name || "",
        classId: selectedStudent.class_id || "",
      });
      fetchData(selectedStudent);
    }
  }, [selectedStudent]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Build term-wise GPA data for overall trend chart
  const termGpaData = reportCards
    .filter((rc) => rc.total_gpa !== null && rc.total_gpa !== undefined)
    .sort((a, b) => {
      // Sort by term_id (rough chronological)
      const ta = a.term_id || "";
      const tb = b.term_id || "";
      return ta.localeCompare(tb);
    })
    .slice(-8) // last 8 terms
    .map((rc) => ({
      label: rc.terms?.name || "?",
      value: rc.total_gpa,
    }));

  // Build subject performance breakdown from latest report card
  const latestCard = reportCards
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];

  const subjectBreakdown = (latestCard?.report_card_items || []).map((item: any) => {
    const scaleRows = gradingScales.filter((s) => s.institution_id === latestCard?.institution_id);
    const perf = getPerformanceLabel(item.average_percentage, scaleRows);
    return {
      subject: item.subject_name || item.subjects?.title || "Unknown",
      average: item.average_percentage,
      letterGrade: item.letter_grade,
      performance: perf,
    };
  });

  // Overall GPA stats
  const gpaValues = reportCards
    .map((rc) => rc.total_gpa)
    .filter((g) => g !== null && g !== undefined);
  const avgGpa = gpaValues.length > 0 ? (gpaValues.reduce((s, g) => s + g, 0) / gpaValues.length).toFixed(2) : "N/A";
  const latestGpa = gpaValues.length > 0 ? gpaValues[gpaValues.length - 1].toFixed(2) : "N/A";

  return (
    <View className="flex-1 bg-gray-50">
      <UnifiedHeader title="Performance Trends" role="Parent/Guardian" />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-4">
          {!!selectedStudent?.users?.full_name && (
            <View className="mb-3 px-1">
              <View className="self-start bg-white dark:bg-navy-surface border border-gray-100 dark:border-gray-800 rounded-full px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Viewing: <Text className="text-gray-900 dark:text-white">{selectedStudent.users.full_name}</Text> · {selectedStudent.class_name || formatClassLabel({
                    grade_level: selectedStudent.grade_level,
                    form_level: selectedStudent.form_level,
                  }) || 'Unassigned'}
                </Text>
              </View>
            </View>
          )}

          {/* Student Switcher */}
          {linkedStudents.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {linkedStudents.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  onPress={() => setSelectedStudent(student)}
                  className={`px-4 py-2 rounded-full mr-2 border ${
                    selectedStudent?.id === student.id
                      ? "bg-orange-500 border-orange-500"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedStudent?.id === student.id ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {student.users?.full_name || student.full_name || student.name || "Student"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <SubscriptionGate
            feature="analytics"
            fallback={
              <View className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 items-center mt-6">
                <Text className="text-gray-900 dark:text-white font-bold text-base mb-1">Analytics Locked</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-sm text-center mb-4">
                  Analytics add-on is not enabled for your institution.
                </Text>
              </View>
            }
          >
            {loading ? (
              <ActivityIndicator size="large" color="#FF6B00" className="mt-12" />
            ) : (
              <View>
              {/* GPA Overview Cards */}
              <View className="flex-row gap-3 mb-6">
                <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                  <View className="w-10 h-10 rounded-xl items-center justify-center mb-2 bg-orange-50">
                    <TrendingUp size={20} color="#FF6B00" />
                  </View>
                  <Text className="text-gray-900 text-2xl font-bold">{latestGpa}</Text>
                  <Text className="text-gray-400 text-xs uppercase">Current GPA</Text>
                </View>
                <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                  <View className="w-10 h-10 rounded-xl items-center justify-center mb-2 bg-blue-50">
                    <BarChart3 size={20} color="#3B82F6" />
                  </View>
                  <Text className="text-gray-900 text-2xl font-bold">{avgGpa}</Text>
                  <Text className="text-gray-400 text-xs uppercase">Average GPA</Text>
                </View>
              </View>

              {/* Overall Trend Chart */}
              <TrendChart
                title="GPA Over Terms"
                data={termGpaData}
                color="#FF6B00"
                height={160}
                maxValue={4}
              />

              {/* Subject Performance Breakdown */}
              {subjectBreakdown.length > 0 && (
                <View className="mt-6">
                  <Text className="text-lg font-bold text-gray-900 mb-3">Latest Term Breakdown</Text>
                  {subjectBreakdown.map((item: any, idx: number) => (
                    <View key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row justify-between items-center">
                      <View className="flex-1 mr-3">
                        <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>{item.subject}</Text>
                        <Text className="text-gray-400 text-xs">{item.average !== null ? `${Math.round(item.average)}%` : "—"}</Text>
                      </View>
                      <View
                        className={`px-3 py-1 rounded-full border`}
                        style={{
                          backgroundColor: item.performance.bg,
                          borderColor: item.performance.borderColor,
                        }}
                      >
                        <Text style={{ color: item.performance.color }} className="text-xs font-bold">
                          {item.letterGrade || item.performance.label}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Per-Subject Trend Charts */}
              {trends.subjects && trends.subjects.length > 0 && (
                <View className="mt-6">
                  <Text className="text-lg font-bold text-gray-900 mb-3">Subject Trends</Text>
                  {trends.subjects.map((subject: any) => {
                    // Build trend data for this subject across terms
                    const subjectTrend = (trends.terms || [])
                      .map((termData: any) => {
                        const subjectEntry = termData.subjects?.find(
                          (s: any) => s.subject_id === subject.subject_id
                        );
                        return {
                          term_name: termData.term_name,
                          average: subjectEntry?.average ?? null,
                        };
                      })
                      .filter((t: any) => t.average !== null);

                    if (subjectTrend.length === 0) return null;
                    return (
                      <SubjectTrendCard
                        key={subject.subject_id}
                        subjectName={subject.subject_name}
                        trend={subjectTrend}
                        color="#FF6B00"
                      />
                    );
                  })}
                </View>
              )}

              {/* Empty State */}
              {termGpaData.length === 0 && subjectBreakdown.length === 0 && (
                <View className="bg-white p-8 rounded-2xl border border-gray-100 items-center mt-6">
                  <Award size={32} color="#e5e7eb" />
                  <Text className="text-gray-400 text-sm mt-3 font-medium text-center">
                    No performance data available yet. Report cards will appear here once generated.
                  </Text>
                </View>
              )}
              </View>
            )}
          </SubscriptionGate>
        </View>
      </ScrollView>
    </View>
  );
}
