import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ParentService } from "@/services/ParentService";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar as CalendarIcon, CheckCircle2, Clock, Search, XCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";


const getStatusConfig = (status: string) => {
  switch (status) {
    case "present": return { icon: <CheckCircle2 size={18} color="#10B981" />, bg: "bg-emerald-50", text: "text-emerald-700", label: "Present" };
    case "absent": return { icon: <XCircle size={18} color="#F43F5E" />, bg: "bg-rose-50", text: "text-rose-700", label: "Absent" };
    case "late": return { icon: <Clock size={18} color="#F59E0B" />, bg: "bg-amber-50", text: "text-amber-700", label: "Late" };
    default: return { icon: <CalendarIcon size={18} color="#6B7280" />, bg: "bg-gray-50", text: "text-gray-700", label: status };
  }
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export default function StudentAttendancePage() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0, pct: "0%" });

  const fetchAttendanceData = async () => {
    if (!studentId) return;
    try {
      const data = await ParentService.getStudentAttendance(studentId);
      setAttendanceLogs(data);

      const total = data.length;
      const present = data.filter((a: any) => a.status === 'present').length;
      const absent = data.filter((a: any) => a.status === 'absent').length;
      const late = data.filter((a: any) => a.status === 'late').length;
      const pct = total > 0 ? `${Math.round(((present + late) / total) * 100)}%` : "0%";

      setStats({ present, absent, late, total, pct });
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [studentId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendanceData();
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
          {/* Attendance Hero */}
          <View className="bg-gray-900 p-8 rounded-[48px] shadow-2xl mb-8">
            <View className="flex-row justify-between items-center mb-10">
              <View>
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Academic Presence</Text>
                <Text className="text-white text-6xl font-black tracking-tighter">{stats.pct}</Text>
                <Text className="text-[#FF6900] text-xs font-bold mt-2 uppercase tracking-widest">{stats.total} Sessions Tracked</Text>
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

          {attendanceLogs.map((item: any) => {
            const config = getStatusConfig(item.status);
            return (
              <View key={item.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] mb-4 flex-row items-center border border-gray-50 dark:border-gray-800 shadow-sm">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${config.bg}`}>
                  {config.icon}
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">{formatDate(item.date)}</Text>
                    <View className={`${config.bg} px-2 py-0.5 rounded-full`}>
                      <Text className={`font-black uppercase text-[8px] tracking-widest ${config.text}`}>{config.label}</Text>
                    </View>
                  </View>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Unit: {item.subject?.title || 'Unknown'}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
