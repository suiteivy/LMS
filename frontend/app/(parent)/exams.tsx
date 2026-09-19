import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ParentChildSelector, LinkedChild } from "@/components/parent/ParentChildSelector";
import { ParentService } from "@/services/ParentService";
import { GradingAPI } from "@/services/GradingService";
import { useParentStudentContext } from "@/hooks/useParentStudentContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Calendar,
  Award,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  TrendingUp,
} from "lucide-react-native";

interface Exam {
  id: string;
  title: string;
  description?: string;
  date: string;
  max_score: number;
  weight?: number;
  term?: string;
  is_published: boolean;
  subjects?: {
    id: string;
    title: string;
    teachers?: {
      users?: {
        full_name?: string;
      };
    };
  };
}

interface ExamResult {
  id: string;
  exam_id: string;
  score: number;
  competency_band?: string;
  feedback?: string;
  created_at: string;
  exams?: {
    id: string;
    title: string;
    date: string;
    max_score: number;
    weight?: number;
    term?: string;
    subjects?: {
      id: string;
      title: string;
      teachers?: {
        users?: {
          full_name?: string;
        };
      };
    };
  };
}

export default function ParentExamsPage() {
  const params = useLocalSearchParams<{ studentId?: string; studentName?: string }>();
  const { studentId: resolvedStudentId, studentName: resolvedName, ready } = useParentStudentContext(params as any);
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<"results" | "upcoming">("results");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);

  const [gradingScales, setGradingScales] = useState<any[]>([]);

  const fetchData = async () => {
    if (!resolvedStudentId) {
      setExams([]);
      setResults([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const [examsData, resultsData, scalesData] = await Promise.all([
        ParentService.getStudentExams(resolvedStudentId).catch(() => []),
        ParentService.getStudentExamResults(resolvedStudentId).catch(() => []),
        GradingAPI.getGradingScales().catch(() => []),
      ]);

      setExams(Array.isArray(examsData) ? examsData : []);
      setResults(Array.isArray(resultsData) ? resultsData : []);
      setGradingScales(Array.isArray(scalesData) ? scalesData : []);
    } catch (err) {
      console.error("[ParentExams] Error fetching exams/results:", err);
      setExams([]);
      setResults([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    fetchData();
  }, [ready, resolvedStudentId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getCompetencyBadge = (band?: string, score?: number, maxScore?: number) => {
    const b = (band || "").trim();
    const pct = (score !== undefined && maxScore && maxScore > 0)
      ? Math.round((score / maxScore) * 100)
      : undefined;

    // Check institution configured grading scales first
    if (gradingScales && gradingScales.length > 0) {
      let match = gradingScales.find((s: any) =>
        b && (
          (s.letter_grade && s.letter_grade.toLowerCase() === b.toLowerCase()) ||
          (s.name && s.name.toLowerCase() === b.toLowerCase())
        )
      );

      if (!match && pct !== undefined) {
        match = gradingScales.find((s: any) => pct >= s.min_score && pct <= s.max_score);
      }

      if (match) {
        const gradeStr = match.letter_grade || match.name;
        const descStr = match.description || match.name || gradeStr;
        const color = match.color || (
          pct !== undefined
            ? (pct >= 80 ? "#059669" : pct >= 60 ? "#0284C7" : pct >= 40 ? "#D97706" : "#DC2626")
            : "#0284C7"
        );
        return {
          label: `${descStr}${gradeStr && descStr !== gradeStr ? ` (${gradeStr})` : ''}`,
          bg: isDark ? `${color}25` : `${color}15`,
          text: color,
          border: color,
        };
      }
    }

    // Dynamic resolution based on percentage or band string
    const color = pct !== undefined
      ? (pct >= 80 ? "#059669" : pct >= 60 ? "#0284C7" : pct >= 40 ? "#D97706" : "#DC2626")
      : "#0284C7";

    return {
      label: b ? b : (pct !== undefined ? `Score ${pct}%` : "Assessed"),
      bg: isDark ? `${color}25` : `${color}15`,
      text: color,
      border: color,
    };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "TBD";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Performance overview metrics
  const totalResults = results.length;
  const averageScore = totalResults > 0
    ? Math.round(
        results.reduce((acc, curr) => {
          const max = curr.exams?.max_score || 100;
          return acc + (curr.score / max) * 100;
        }, 0) / totalResults
      )
    : null;

  return (
    <View className="flex-1 bg-[#F6F8FA] dark:bg-[#0D1117]">
      <UnifiedHeader
        title={resolvedName ? `${resolvedName}'s Exams` : "Exams & Assessments"}
        subtitle="Performance & Schedule"
        role="Parent/Guardian"
        onBack={() => router.back()}
        showNotification={false}
      />

      {/* Universal Child Selector */}
      <ParentChildSelector
        selectedStudentId={resolvedStudentId}
        onSelectChild={(child: LinkedChild) => {
          router.setParams({ studentId: child.id, studentName: child.full_name });
        }}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
        }
      >
        <View className="p-4 md:p-6 max-w-4xl mx-auto w-full">
          {/* Top Performance Metric Summary */}
          <View className="bg-[#161B22] p-6 rounded-[28px] shadow-xl mb-6 border border-gray-800">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[2px] mb-1">
                  Academic Assessment Hub
                </Text>
                <Text className="text-white text-3xl font-black tracking-tight">
                  {averageScore !== null ? `${averageScore}%` : "—"}
                </Text>
                <Text className="text-[#FF6900] text-xs font-semibold mt-1">
                  Cumulative Term Assessment Average
                </Text>
              </View>
              <View className="w-14 h-14 rounded-2xl bg-[#FF6900]/20 items-center justify-center border border-[#FF6900]/30">
                <Award size={28} color="#FF6900" />
              </View>
            </View>

            <View className="flex-row justify-between pt-4 border-t border-gray-800">
              <View>
                <Text className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Completed Exams</Text>
                <Text className="text-emerald-400 font-bold text-lg mt-0.5">{totalResults}</Text>
              </View>
              <View>
                <Text className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Scheduled Exams</Text>
                <Text className="text-sky-400 font-bold text-lg mt-0.5">{exams.length}</Text>
              </View>
              <View>
                <Text className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Grading Status</Text>
                <Text className="text-amber-400 font-bold text-lg mt-0.5">Active</Text>
              </View>
            </View>
          </View>

          {/* Segmented Tab Controls */}
          <View className="flex-row bg-white dark:bg-[#161B22] p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 mb-6 shadow-sm">
            <TouchableOpacity
              onPress={() => setActiveTab("results")}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                borderRadius: 12,
                backgroundColor: activeTab === "results" ? "#FF6900" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: activeTab === "results" ? "#FFFFFF" : isDark ? "#9CA3AF" : "#4B5563",
                }}
              >
                Exam Results ({results.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("upcoming")}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                borderRadius: 12,
                backgroundColor: activeTab === "upcoming" ? "#FF6900" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: activeTab === "upcoming" ? "#FFFFFF" : isDark ? "#9CA3AF" : "#4B5563",
                }}
              >
                Upcoming Schedule ({exams.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Views */}
          {loading ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#FF6900" />
              <Text className="text-gray-400 text-xs font-semibold mt-3">Loading exam records...</Text>
            </View>
          ) : activeTab === "results" ? (
            results.length === 0 ? (
              <View className="bg-white dark:bg-[#161B22] p-10 rounded-[28px] border border-gray-100 dark:border-gray-800 items-center justify-center shadow-sm">
                <FileText size={36} color={isDark ? "#4B5563" : "#9CA3AF"} />
                <Text className="text-gray-900 dark:text-white font-bold text-base mt-4">
                  No Exam Results Published Yet
                </Text>
                <Text className="text-gray-400 text-xs text-center mt-1 max-w-xs">
                  Official exam grades and performance levels will appear here once finalized by subject teachers.
                </Text>
              </View>
            ) : (
              results.map((res) => {
                const max = res.exams?.max_score || 100;
                const percentage = Math.round((res.score / max) * 100);
                const badge = getCompetencyBadge(res.competency_band, res.score, max);
                const subjectName = res.exams?.subjects?.title || "Subject";
                const teacherName = res.exams?.subjects?.teachers?.users?.full_name;

                return (
                  <View
                    key={res.id}
                    className="bg-white dark:bg-[#161B22] p-5 rounded-[24px] mb-4 border border-gray-100 dark:border-gray-800 shadow-sm"
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1 pr-3">
                        <View className="flex-row items-center gap-2 mb-1">
                          <View className="bg-[#FF6900]/10 px-2 py-0.5 rounded-md">
                            <Text className="text-[#FF6900] font-bold text-[10px] uppercase">
                              {res.exams?.term || "Term Exam"}
                            </Text>
                          </View>
                          <Text className="text-gray-400 text-[11px] font-medium">
                            {formatDate(res.exams?.date)}
                          </Text>
                        </View>
                        <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight">
                          {res.exams?.title || "Exam Assessment"}
                        </Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                          {subjectName} {teacherName ? `· ${teacherName}` : ""}
                        </Text>
                      </View>

                      {/* Score Badge */}
                      <View className="items-end bg-gray-50 dark:bg-gray-800/60 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-700">
                        <Text className="text-gray-900 dark:text-white font-black text-xl">
                          {res.score}
                          <Text className="text-xs text-gray-400 font-semibold">/{max}</Text>
                        </Text>
                        <Text className="text-emerald-500 font-bold text-[10px]">{percentage}%</Text>
                      </View>
                    </View>

                    {/* Performance Level */}
                    {res.competency_band ? (
                      <View
                        style={{
                          backgroundColor: badge.bg,
                          borderColor: badge.border,
                          borderWidth: 1,
                        }}
                        className="px-3 py-1.5 rounded-xl self-start mb-2"
                      >
                        <Text style={{ color: badge.text }} className="text-xs font-bold">
                          {badge.label}
                        </Text>
                      </View>
                    ) : null}

                    {/* Teacher Feedback */}
                    {res.feedback ? (
                      <View className="mt-2 p-3 bg-gray-50 dark:bg-[#0D1117] rounded-xl border border-gray-100 dark:border-gray-800">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                          Teacher Feedback
                        </Text>
                        <Text className="text-gray-700 dark:text-gray-300 text-xs italic">
                          "{res.feedback}"
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )
          ) : (
            // Upcoming Exams Schedule Tab
            exams.length === 0 ? (
              <View className="bg-white dark:bg-[#161B22] p-10 rounded-[28px] border border-gray-100 dark:border-gray-800 items-center justify-center shadow-sm">
                <Calendar size={36} color={isDark ? "#4B5563" : "#9CA3AF"} />
                <Text className="text-gray-900 dark:text-white font-bold text-base mt-4">
                  No Scheduled Exams
                </Text>
                <Text className="text-gray-400 text-xs text-center mt-1 max-w-xs">
                  Upcoming assessments, midterms, and finals will appear here once scheduled on the academic calendar.
                </Text>
              </View>
            ) : (
              exams.map((ex) => {
                const subjectName = ex.subjects?.title || "Subject";
                const teacherName = ex.subjects?.teachers?.users?.full_name;

                return (
                  <View
                    key={ex.id}
                    className="bg-white dark:bg-[#161B22] p-5 rounded-[24px] mb-4 border border-gray-100 dark:border-gray-800 shadow-sm flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      <View className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 items-center justify-center mr-4 border border-orange-200 dark:border-orange-800">
                        <BookOpen size={22} color="#FF6900" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-0.5">
                          <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                            {ex.term || "Term Exam"}
                          </Text>
                          <Text className="text-gray-400 text-[10px]">· Max {ex.max_score} Pts</Text>
                        </View>
                        <Text className="text-gray-900 dark:text-white font-bold text-base">
                          {ex.title}
                        </Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                          {subjectName} {teacherName ? `· ${teacherName}` : ""}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-xl">
                      <View className="flex-row items-center gap-1">
                        <Clock size={12} color="#FF6900" />
                        <Text className="text-gray-900 dark:text-white font-bold text-xs">
                          {formatDate(ex.date)}
                        </Text>
                      </View>
                      <Text className="text-gray-400 text-[9px] font-semibold mt-0.5">Scheduled</Text>
                    </View>
                  </View>
                );
              })
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}
