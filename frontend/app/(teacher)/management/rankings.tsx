import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherRoleMode } from "@/hooks/useTeacherRoleMode";
import { api } from "@/services/api";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { resolveAvatarUri } from "@/utils/avatar";
import {
  Trophy,
  Award,
  Medal,
  Users,
  Filter,
  ArrowUpDown,
  BookOpen,
  ChevronRight,
  TrendingUp,
  UserCircle,
} from "lucide-react-native";

interface StudentRank {
  rank: number;
  student_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  grade_level: string | null;
  graded_tasks: number;
  average_score: number;
  cbc_band?: string;
  cbc_label?: string;
  grade?: string;
  grade_label?: string;
}

interface RankingsResponse {
  scope_mode: string;
  total_students: number;
  cbc_distribution?: Record<string, number>;
  grade_distribution?: Record<string, number>;
  grading_scale?: any[];
  rankings: StudentRank[];
}

export default function StudentRankingsScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { mode, isClassTeacher, isSubjectTeacher } = useTeacherRoleMode();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<RankingsResponse | null>(null);
  const [selectedBand, setSelectedBand] = useState<string | null>(null);

  const bg = isDark ? "#0D1117" : "#F6F8FA";
  const card = isDark ? "#161B22" : "#FFFFFF";
  const border = isDark ? "#21262D" : "#D0D7DE";
  const textPrimary = isDark ? "#F9FAFB" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const orange = "#FF6900";

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/teacher/rankings");
      if (res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load rankings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [mode]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRankings();
  };

  const distributionItems = useMemo(() => {
    const dist = data?.grade_distribution || data?.cbc_distribution || {};
    if (data?.grading_scale && Array.isArray(data.grading_scale) && data.grading_scale.length > 0) {
      return data.grading_scale.map((d: any) => ({
        band: d.grade || d.band || d.name,
        label: d.label || d.description || d.grade,
        count: dist[d.grade || d.band] || 0,
        color: d.color || (d.grade === "A" || d.grade === "EE" ? "#10B981" : d.grade === "B" || d.grade === "ME" ? "#3B82F6" : d.grade === "C" || d.grade === "AE" ? "#F59E0B" : "#EF4444"),
      }));
    }
    const keys = Object.keys(dist);
    if (keys.length > 0) {
      const defaultColors: Record<string, string> = {
        EE: "#10B981", ME: "#3B82F6", AE: "#F59E0B", BE: "#EF4444",
        A: "#10B981", B: "#3B82F6", C: "#F59E0B", D: "#F97316", E: "#EF4444"
      };
      return keys.map((k) => ({
        band: k,
        label: k,
        count: dist[k] || 0,
        color: defaultColors[k] || "#3B82F6",
      }));
    }
    return [
      { band: "EE", label: "Exceeding", count: 0, color: "#10B981" },
      { band: "ME", label: "Meeting", count: 0, color: "#3B82F6" },
      { band: "AE", label: "Approaching", count: 0, color: "#F59E0B" },
      { band: "BE", label: "Below", count: 0, color: "#EF4444" },
    ];
  }, [data]);

  const filteredRankings = useMemo(() => {
    if (!data?.rankings) return [];
    if (!selectedBand) return data.rankings;
    return data.rankings.filter((r) => (r.grade || r.cbc_band) === selectedBand);
  }, [data?.rankings, selectedBand]);

  const getBadgeStyle = (band: string) => {
    const item = distributionItems.find((i) => i.band === band);
    const color = item?.color || (band === "EE" || band === "A" ? "#10B981" : band === "ME" || band === "B" ? "#3B82F6" : band === "AE" || band === "C" ? "#F59E0B" : "#EF4444");
    return {
      bg: isDark ? `${color}25` : `${color}15`,
      text: color,
      border: color,
    };
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <UnifiedHeader
        title={mode === "class" ? "Class Performance" : "Subject Performance"}
        subtitle="Student Rankings"
        role="Teacher"
        onBack={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={orange} />}
      >
        {/* Scope Indicator Banner */}
        <View
          style={{
            backgroundColor: card,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: isDark ? "rgba(255, 105, 0, 0.15)" : "#FFF7ED",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trophy size={20} color={orange} />
            </View>
            <View>
              <Text style={{ color: textPrimary, fontSize: 14, fontWeight: "800" }}>
                {mode === "class" ? "Designated Class Ranking" : "Teaching Subjects Ranking"}
              </Text>
              <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                {mode === "class"
                  ? "Overall student rankings across all subjects in your designated class"
                  : "Rankings strictly scoped to students in your taught subjects"}
              </Text>
            </View>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: isDark ? "#21262D" : "#F3F4F6",
            }}
          >
            <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "700" }}>
              {data?.total_students || 0} Learners
            </Text>
          </View>
        </View>

        {/* Performance & Competency Distribution Cards */}
        <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginLeft: 2 }}>
          Performance & Competency Distribution
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 18, minWidth: "100%" }}>
          {distributionItems.map((item) => {
            const isSelected = selectedBand === item.band;
            return (
              <TouchableOpacity
                key={item.band}
                onPress={() => setSelectedBand(isSelected ? null : item.band)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  minWidth: 72,
                  backgroundColor: isSelected ? (isDark ? "#21262D" : "#FFF7ED") : card,
                  borderWidth: 1,
                  borderColor: isSelected ? orange : border,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: item.color, fontSize: 18, fontWeight: "900" }}>{item.count}</Text>
                <Text style={{ color: textPrimary, fontSize: 11, fontWeight: "700", marginTop: 2 }}>{item.band}</Text>
                <Text style={{ color: textSecondary, fontSize: 9, fontWeight: "600", marginTop: 1 }} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Leaderboard Table / Cards */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginLeft: 2 }}>
          <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>
            Learner Leaderboard {selectedBand ? `(${selectedBand} Only)` : ""}
          </Text>
          {selectedBand && (
            <TouchableOpacity onPress={() => setSelectedBand(null)}>
              <Text style={{ color: orange, fontSize: 11, fontWeight: "700" }}>Clear Filter</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={orange} />
            <Text style={{ color: textSecondary, marginTop: 12, fontSize: 12 }}>Computing Rankings...</Text>
          </View>
        ) : filteredRankings.length === 0 ? (
          <View style={{ backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 16, padding: 32, alignItems: "center" }}>
            <Users size={32} color={textSecondary} />
            <Text style={{ color: textPrimary, fontSize: 14, fontWeight: "700", marginTop: 10 }}>No Learners Found</Text>
            <Text style={{ color: textSecondary, fontSize: 12, textAlign: "center", marginTop: 4 }}>
              No graded tasks or students found for this filter in your teaching scope.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filteredRankings.map((student, idx) => {
              const badge = getBadgeStyle(student.grade || student.cbc_band || "");
              const isTop3 = student.rank <= 3;
              return (
                <View
                  key={student.student_id}
                  style={{
                    backgroundColor: card,
                    borderWidth: 1,
                    borderColor: isTop3 ? (isDark ? "#D97706" : "#F59E0B") : border,
                    borderRadius: 14,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
                    {/* Rank Indicator */}
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor:
                          student.rank === 1
                            ? "#FEF3C7"
                            : student.rank === 2
                            ? "#E5E7EB"
                            : student.rank === 3
                            ? "#FFEDD5"
                            : isDark
                            ? "#21262D"
                            : "#F3F4F6",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "900",
                          fontSize: 13,
                          color:
                            student.rank === 1
                              ? "#B45309"
                              : student.rank === 2
                              ? "#4B5563"
                              : student.rank === 3
                              ? "#C2410C"
                              : textSecondary,
                        }}
                      >
                        #{student.rank}
                      </Text>
                    </View>

                    {/* Avatar */}
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        overflow: "hidden",
                        backgroundColor: isDark ? "#0F141C" : "#F6F8FA",
                        borderWidth: 1,
                        borderColor: border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {student.avatar_url && resolveAvatarUri(student.avatar_url) ? (
                        <Image source={{ uri: resolveAvatarUri(student.avatar_url)! }} style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <UserCircle size={28} color={textSecondary} />
                      )}
                    </View>

                    {/* Student Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: textPrimary, fontWeight: "800", fontSize: 13 }} numberOfLines={1}>
                        {student.full_name}
                      </Text>
                      <Text style={{ color: textSecondary, fontSize: 11, marginTop: 1 }}>
                        {student.grade_level ? student.grade_level : "Learner"} · {student.graded_tasks} Graded {student.graded_tasks === 1 ? "Task" : "Tasks"}
                      </Text>
                    </View>
                  </View>

                  {/* Score & CBC Band */}
                  <View style={{ alignItems: "flex-end", gap: 3 }}>
                    <Text style={{ color: textPrimary, fontWeight: "900", fontSize: 15 }}>
                      {student.average_score}%
                    </Text>
                    <View
                      style={{
                        backgroundColor: badge.bg,
                        borderColor: badge.border,
                        borderWidth: 1,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: badge.text, fontSize: 10, fontWeight: "800" }}>
                        {student.grade || student.cbc_band || "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
