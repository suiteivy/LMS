import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { router } from "expo-router";
import { Calendar as CalendarIcon, CheckCircle2, Clock, Search, XCircle } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const DUMMY_ATTENDANCE = [
  { id: "1", date: "2026-02-18", status: "present", subject: "Mathematics" },
  { id: "2", date: "2026-02-18", status: "present", subject: "English" },
  { id: "3", date: "2026-02-17", status: "late", subject: "Biology" },
  { id: "4", date: "2026-02-17", status: "present", subject: "History" },
  { id: "5", date: "2026-02-14", status: "present", subject: "Physics" },
  { id: "6", date: "2026-02-13", status: "absent", subject: "Chemistry" },
  { id: "7", date: "2026-02-13", status: "present", subject: "Mathematics" },
  { id: "8", date: "2026-02-12", status: "present", subject: "English" },
  { id: "9", date: "2026-02-11", status: "present", subject: "Biology" },
  { id: "10", date: "2026-02-10", status: "present", subject: "History" },
  { id: "11", date: "2026-02-07", status: "absent", subject: "Physics" },
  { id: "12", date: "2026-02-06", status: "present", subject: "Mathematics" },
];

const STATS = { present: 22, absent: 2, late: 1, total: 25, pct: "92%" };

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
      >
        <View className="p-4 md:p-8">
          {/* Attendance Hero */}
          <View className="bg-gray-900 p-8 rounded-[48px] shadow-2xl mb-8">
            <View className="flex-row justify-between items-center mb-10">
              <View>
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Academic Presence</Text>
                <Text className="text-white text-6xl font-black tracking-tighter">{STATS.pct}</Text>
                <Text className="text-[#FF6900] text-xs font-bold mt-2 uppercase tracking-widest">{STATS.total} Sessions Tracked</Text>
              </View>
              <View className="w-16 h-16 rounded-full bg-[#FF6900] items-center justify-center shadow-lg">
                <CalendarIcon size={32} color="white" />
              </View>
            </View>

            {/* Stats Grid */}
            <View className="flex-row justify-between pt-8 border-t border-white/10">
              <View className="items-center">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Present</Text>
                <Text className="text-emerald-400 font-bold text-xl mt-1">{STATS.present}</Text>
              </View>
              <View className="items-center border-x border-white/10 px-10">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Absent</Text>
                <Text className="text-rose-400 font-bold text-xl mt-1">{STATS.absent}</Text>
              </View>
              <View className="items-center">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Late</Text>
                <Text className="text-amber-400 font-bold text-xl mt-1">{STATS.late}</Text>
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

          {DUMMY_ATTENDANCE.map((item) => {
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
                  <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Unit: {item.subject}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
