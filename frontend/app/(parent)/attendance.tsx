import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { ParentService } from "@/services/ParentService";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar as CalendarIcon, CheckCircle2, Clock, Search, XCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";

// ─── Demo fallback ───────────────────────────────────────────────────────────
const DEMO_ATTENDANCE = [
  { id: "1", date: "2026-02-18", status: "present", subject: { title: "Mathematics" } },
  { id: "2", date: "2026-02-18", status: "present", subject: { title: "English" } },
  { id: "3", date: "2026-02-17", status: "late", subject: { title: "Biology" } },
  { id: "4", date: "2026-02-17", status: "present", subject: { title: "History" } },
  { id: "5", date: "2026-02-14", status: "present", subject: { title: "Physics" } },
  { id: "6", date: "2026-02-13", status: "absent", subject: { title: "Chemistry" } },
  { id: "7", date: "2026-02-13", status: "present", subject: { title: "Mathematics" } },
  { id: "8", date: "2026-02-12", status: "present", subject: { title: "English" } },
];
// ─────────────────────────────────────────────────────────────────────────────

// Return only data (no JSX) — icons are rendered inline in JSX below
type StatusConfig = { bg: string; text: string; label: string; iconName: "present" | "absent" | "late" | "default" };
const getStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case "present": return { bg: "#ECFDF5", text: "#047857", label: "Present", iconName: "present" };
    case "absent": return { bg: "#FFF1F2", text: "#BE123C", label: "Absent", iconName: "absent" };
    case "late": return { bg: "#FFFBEB", text: "#B45309", label: "Late", iconName: "late" };
    default: return { bg: "#F9FAFB", text: "#374151", label: status, iconName: "default" };
  }
};

const StatusIcon = ({ name }: { name: StatusConfig["iconName"] }) => {
  if (name === "present") return <CheckCircle2 size={18} color="#10B981" />;
  if (name === "absent") return <XCircle size={18} color="#F43F5E" />;
  if (name === "late") return <Clock size={18} color="#F59E0B" />;
  return <CalendarIcon size={18} color="#6B7280" />;
};

const formatDate = (dateStr: string) => {
  try {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Invalid Date";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch (e) {
    return "Error Date";
  }
};

const computeStats = (records: any[]) => {
  const total = records.length;
  const present = records.filter(r => r.status === "present").length;
  const absent = records.filter(r => r.status === "absent").length;
  const late = records.filter(r => r.status === "late").length;
  const pct = total > 0 ? `${Math.round((present / total) * 100)}%` : "0%";
  return { total, present, absent, late, pct };
};

export default function StudentAttendancePage() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const { isDemo } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<any[]>([]);

  const loadAttendance = async () => {
    if (isDemo || !studentId) {
      setRecords(DEMO_ATTENDANCE);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await ParentService.getStudentAttendance(studentId);
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [studentId, isDemo]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendance();
  };

  const stats = computeStats(records);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <UnifiedHeader
        title="Intelligence"
        subtitle="Compliance"
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
          {loading ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#FF6900" />
            </View>
          ) : (
            <>
              {/* Attendance Hero */}
              <View className="bg-gray-900 p-8 rounded-[48px] shadow-2xl mb-8">
                <View className="flex-row justify-between items-center mb-10">
                  <View>
                    <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Academic Presence</Text>
                    <Text className="text-white text-6xl font-black tracking-tighter">{stats.pct}</Text>
                    <Text className="text-[#FF6900] text-xs font-bold mt-2 uppercase tracking-widest">
                      {stats.total} Sessions Tracked
                    </Text>
                  </View>
                  <View className="w-16 h-16 rounded-full bg-[#FF6900] items-center justify-center shadow-lg">
                    <CalendarIcon size={32} color="white" />
                  </View>
                </View>

                {/* Stats Grid */}
                <View className="flex-row justify-between pt-8 border-t border-white/10">
                  <View className="items-center">
                    <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Present</Text>
                    <Text className="text-emerald-400 font-bold text-xl mt-1">{stats.present}</Text>
                  </View>
                  <View className="items-center border-x border-white/10 px-10">
                    <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Absent</Text>
                    <Text className="text-rose-400 font-bold text-xl mt-1">{stats.absent}</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Late</Text>
                    <Text className="text-amber-400 font-bold text-xl mt-1">{stats.late}</Text>
                  </View>
                </View>
              </View>

              {/* History Section */}
              <View className="px-2 flex-row justify-between items-center mb-6">
                <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Daily Log Entry</Text>
                <TouchableOpacity className="bg-white dark:bg-[#1a1a1a] p-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <Search size={16} color="#FF6900" />
                </TouchableOpacity>
              </View>

              {records.length === 0 ? (
                <View className="bg-white dark:bg-[#1a1a1a] p-10 rounded-[32px] border border-gray-50 dark:border-gray-800 items-center">
                  <CalendarIcon size={32} color="#FF6900" />
                  <Text className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest mt-4 text-center">
                    No attendance records yet
                  </Text>
                </View>
              ) : (
                records.map((item, idx) => {
                  const config = getStatusConfig(item.status);
                  const subjectName = item.subject?.title ?? item.subject ?? "—";
                  return (
                    <View key={item.id ?? idx} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] mb-4 flex-row items-center border border-gray-50 dark:border-gray-800 shadow-sm">
                      <View
                        style={{ backgroundColor: config.bg }}
                        className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                      >
                        <StatusIcon name={config.iconName} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">{formatDate(item.date)}</Text>
                          <View
                            style={{ backgroundColor: config.bg }}
                            className="px-2 py-0.5 rounded-full"
                          >
                            <Text
                              style={{ color: config.text }}
                              className="font-black uppercase text-[8px] tracking-widest"
                            >
                              {config.label}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Unit: {subjectName}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
