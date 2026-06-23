import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { TrendingUp, BarChart3, Award, BookOpen } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { GradingAPI } from "@/services/GradingService";
import { getPerformanceLabel } from "@/utils/getPerformanceLabel";
import { TrendChart, SubjectTrendCard } from "@/components/common/TrendChart";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";

export default function StudentAnalyticsPage() {
  const { studentId, user, isDemo } = useAuth();
  const { isDark } = useTheme();

  const [trends, setTrends] = useState<{ terms: any[]; subjects: any[] }>({ terms: [], subjects: [] });
  const [gradingScales, setGradingScales] = useState<any[]>([]);
  const [reportCards, setReportCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const targetId = studentId || user?.id;

  const fetchData = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const [trendData, scales, cards] = await Promise.all([
        GradingAPI.getPerformanceTrends({ student_id: targetId }).catch(() => ({ terms: [], subjects: [] })),
        GradingAPI.getGradingScales().catch(() => []),
        GradingAPI.getReportCards({ student_id: targetId }).catch(() => []),
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
    fetchData();
  }, [targetId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Build term-wise GPA data for overall trend chart
  const termGpaData = reportCards
    .filter((rc) => rc.total_gpa !== null && rc.total_gpa !== undefined)
    .sort((a, b) => (a.term_id || "").localeCompare(b.term_id || ""))
    .slice(-8)
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
  const avgGpa = gpaValues.length > 0
    ? (gpaValues.reduce((s, g) => s + g, 0) / gpaValues.length).toFixed(2)
    : "N/A";
  const latestGpa = gpaValues.length > 0
    ? gpaValues[gpaValues.length - 1].toFixed(2)
    : "N/A";

  const hasData = termGpaData.length > 0 || subjectBreakdown.length > 0 || trends.subjects?.length > 0;

  return (
    <View className="flex-1 bg-gray-50">
      <UnifiedHeader
        title="Performance Trends"
        subtitle="Analytics"
        role="Student"
        onBack={() => router.back()}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-4">
          {loading ? (
            <ActivityIndicator size="large" color="#FF6B00" className="mt-12" />
          ) : !hasData ? (
            <View className="bg-white p-8 rounded-2xl border border-gray-100 items-center mt-6">
              <Award size={32} color="#e5e7eb" />
              <Text className="text-gray-400 text-sm mt-3 font-medium text-center">
                No performance data available yet. Trends will appear here once report cards are generated.
              </Text>
            </View>
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
              {termGpaData.length > 0 && (
                <TrendChart
                  title="GPA Over Terms"
                  data={termGpaData}
                  color="#FF6B00"
                  height={160}
                  maxValue={4}
                />
              )}

              {/* Subject Performance Breakdown */}
              {subjectBreakdown.length > 0 && (
                <View className="mt-6">
                  <View className="flex-row items-center mb-3">
                    <BookOpen size={18} color="#FF6B00" />
                    <Text className="text-gray-900 font-bold text-lg ml-2">Latest Term Breakdown</Text>
                  </View>
                  {subjectBreakdown.map((item: any, idx: number) => (
                    <View
                      key={idx}
                      className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row justify-between items-center"
                    >
                      <View className="flex-1 mr-3">
                        <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>
                          {item.subject}
                        </Text>
                        <Text className="text-gray-400 text-xs">
                          {item.average !== null ? `${Math.round(item.average)}%` : "—"}
                        </Text>
                      </View>
                      <View
                        className="px-3 py-1 rounded-full border"
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
                  <View className="flex-row items-center mb-3">
                    <TrendingUp size={18} color="#FF6B00" />
                    <Text className="text-gray-900 font-bold text-lg ml-2">Subject Trends</Text>
                  </View>
                  {trends.subjects.map((subject: any) => {
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
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
