import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MessageSquare,
  PenBox,
  X,
} from "lucide-react-native";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { ParentService } from "@/services/ParentService";
import { useParentStudentContext } from "@/hooks/useParentStudentContext";
import { useTheme } from "@/contexts/ThemeContext";
import { showFetchError } from "@/utils/toast";

interface ParentAssignment {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  total_points: number;
  weight?: number;
  grading_style?: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  subject: { id?: string; title: string };
  submission?: {
    id: string;
    status: string;
    grade?: string | number;
    marks?: number;
    feedback?: string;
    submitted_at?: string;
  } | null;
  status: "pending" | "submitted" | "graded" | "overdue";
}

type FilterTab = "all" | "pending" | "submitted" | "graded" | "overdue";

export default function ParentAssignmentsPage() {
  const params = useLocalSearchParams<{ studentId?: string; studentName?: string; classId?: string }>();
  const { studentId, studentName, ready } = useParentStudentContext(params as any);
  const { isDark } = useTheme();

  const [assignments, setAssignments] = useState<ParentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [selectedAssignment, setSelectedAssignment] = useState<ParentAssignment | null>(null);

  const fetchAssignments = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const data = await ParentService.getStudentAssignments(studentId);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching parent student assignments:", error);
      showFetchError("assignments", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (ready && studentId) {
      fetchAssignments();
    }
  }, [ready, studentId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments();
  };

  const filteredAssignments = useMemo(() => {
    if (activeFilter === "all") return assignments;
    return assignments.filter((a) => a.status === activeFilter);
  }, [assignments, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: assignments.length,
      pending: assignments.filter((a) => a.status === "pending").length,
      submitted: assignments.filter((a) => a.status === "submitted").length,
      graded: assignments.filter((a) => a.status === "graded").length,
      overdue: assignments.filter((a) => a.status === "overdue").length,
    };
  }, [assignments]);

  const getStatusBadge = (status: ParentAssignment["status"]) => {
    switch (status) {
      case "graded":
        return {
          bg: isDark ? "rgba(16, 185, 129, 0.15)" : "#DCFCE7",
          text: "#16A34A",
          label: "Graded",
        };
      case "submitted":
        return {
          bg: isDark ? "rgba(59, 130, 246, 0.15)" : "#DBEAFE",
          text: "#2563EB",
          label: "Submitted",
        };
      case "overdue":
        return {
          bg: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
          text: "#DC2626",
          label: "Overdue",
        };
      default:
        return {
          bg: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7",
          text: "#D97706",
          label: "Pending",
        };
    }
  };

  return (
    <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
      <UnifiedHeader
        title={studentName ? `${studentName}'s Assignments` : "Assignments"}
        subtitle="Curriculum"
        role="Parent/Guardian"
        onBack={() => router.back()}
      />

      {/* Filter Tabs */}
      <View className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B22]">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        >
          {(
            [
              { key: "all", label: `All (${counts.all})` },
              { key: "pending", label: `Pending (${counts.pending})` },
              { key: "submitted", label: `Submitted (${counts.submitted})` },
              { key: "graded", label: `Graded (${counts.graded})` },
              { key: "overdue", label: `Overdue (${counts.overdue})` },
            ] as { key: FilterTab; label: string }[]
          ).map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.8}
                className={`px-4 py-2 rounded-full border ${
                  isActive
                    ? "bg-[#FF6900] border-[#FF6900]"
                    : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? "text-white" : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Body Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF6900"]}
            tintColor="#FF6900"
          />
        }
      >
        {loading && !refreshing ? (
          <ListItemSkeleton loading={loading} count={4} label="Loading assignments..." />
        ) : filteredAssignments.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <View className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mb-4">
              <PenBox size={28} color="#9CA3AF" />
            </View>
            <Text className="text-gray-900 dark:text-white font-bold text-base">
              No assignments found
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-xs text-center mt-1 max-w-xs">
              {activeFilter === "all"
                ? "No assignments currently scheduled for this student."
                : `No assignments matching the "${activeFilter}" filter.`}
            </Text>
          </View>
        ) : (
          filteredAssignments.map((assign) => {
            const badge = getStatusBadge(assign.status);
            const dueDateFormatted = assign.due_date
              ? new Date(assign.due_date).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "No due date";

            return (
              <TouchableOpacity
                key={assign.id}
                onPress={() => setSelectedAssignment(assign)}
                activeOpacity={0.85}
                className="bg-white dark:bg-[#1E2530] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 mb-3"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md self-start">
                    <Text className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      {assign.subject?.title || "General"}
                    </Text>
                  </View>
                  <View
                    style={{ backgroundColor: badge.bg }}
                    className="px-2.5 py-0.5 rounded-full"
                  >
                    <Text style={{ color: badge.text }} className="text-[10px] font-extrabold uppercase tracking-wider">
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <Text className="text-gray-900 dark:text-white font-bold text-base mb-1">
                  {assign.title}
                </Text>

                {assign.description ? (
                  <Text className="text-gray-500 dark:text-gray-400 text-xs mb-3" numberOfLines={2}>
                    {assign.description}
                  </Text>
                ) : null}

                {/* Meta details footer */}
                <View className="flex-row items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <View className="flex-row items-center">
                    <Clock size={12} color="#9CA3AF" />
                    <Text className="text-[11px] text-gray-500 dark:text-gray-400 ml-1.5">
                      Due: {dueDateFormatted}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {assign.submission?.grade != null && (
                      <View className="bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
                        <Text className="text-emerald-600 dark:text-emerald-400 font-black text-xs">
                          Score: {assign.submission.grade} / {assign.total_points}
                        </Text>
                      </View>
                    )}
                    <Text className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                      {assign.total_points} pts
                    </Text>
                  </View>
                </View>

                {/* Teacher remarks highlight */}
                {assign.submission?.feedback ? (
                  <View className="mt-3 bg-blue-50 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/30 flex-row items-start">
                    <MessageSquare size={13} color="#3B82F6" style={{ marginTop: 2, marginRight: 6 }} />
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">
                        Teacher Feedback
                      </Text>
                      <Text className="text-xs text-blue-900 dark:text-blue-200 mt-0.5">
                        "{assign.submission.feedback}"
                      </Text>
                    </View>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Assignment Detail Modal */}
      <Modal
        visible={!!selectedAssignment}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAssignment(null)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="bg-white dark:bg-[#161B22] w-full max-w-lg rounded-3xl p-6 border border-gray-200 dark:border-gray-800 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xs font-bold text-[#FF6900] uppercase tracking-wider">
                {selectedAssignment?.subject?.title || "Assignment Details"}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedAssignment(null)}
                className="p-1 rounded-full bg-gray-100 dark:bg-gray-800"
              >
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xl font-black text-gray-900 dark:text-white mb-2">
                {selectedAssignment?.title}
              </Text>

              <View className="flex-row items-center gap-2 mb-4">
                {selectedAssignment && (
                  <View
                    style={{ backgroundColor: getStatusBadge(selectedAssignment.status).bg }}
                    className="px-2.5 py-0.5 rounded-full"
                  >
                    <Text
                      style={{ color: getStatusBadge(selectedAssignment.status).text }}
                      className="text-[10px] font-extrabold uppercase"
                    >
                      {getStatusBadge(selectedAssignment.status).label}
                    </Text>
                  </View>
                )}
                <Text className="text-xs text-gray-400">
                  Total Marks: {selectedAssignment?.total_points}
                </Text>
              </View>

              {selectedAssignment?.description ? (
                <View className="mb-4">
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Instructions
                  </Text>
                  <Text className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedAssignment.description}
                  </Text>
                </View>
              ) : null}

              {selectedAssignment?.submission?.grade != null && (
                <View className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl mb-4 border border-gray-100 dark:border-gray-700">
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Grade Awarded
                  </Text>
                  <Text className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {selectedAssignment.submission.grade} / {selectedAssignment.total_points}
                  </Text>
                  {selectedAssignment.submission.feedback ? (
                    <Text className="text-xs text-gray-600 dark:text-gray-300 mt-2 italic">
                      "{selectedAssignment.submission.feedback}"
                    </Text>
                  ) : null}
                </View>
              )}

              {selectedAssignment?.attachment_url && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(selectedAssignment.attachment_url!)}
                  className="flex-row items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mt-2"
                >
                  <Download size={16} color="#FF6900" />
                  <Text className="text-xs font-bold text-gray-800 dark:text-gray-200 ml-2 flex-1" numberOfLines={1}>
                    {selectedAssignment.attachment_name || "Download Resource"}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setSelectedAssignment(null)}
              className="mt-6 py-3 bg-[#FF6900] rounded-xl items-center"
            >
              <Text className="text-white font-bold text-sm">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
