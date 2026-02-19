import { Calendar as CalendarIcon, CheckCircle2, Clock, XCircle } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";

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
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

export default function StudentAttendancePage() {
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Attendance History</Text>
        <Text className="text-gray-500 text-sm mt-1">Ethan Kamau — Term 1, 2026 · Demo Data</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Overall Rate Banner */}
        <View className="bg-orange-500 p-6 rounded-3xl mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-blue-100 text-xs font-bold uppercase mb-1">Overall Rate</Text>
            <Text className="text-white text-4xl font-black">{STATS.pct}</Text>
            <Text className="text-blue-200 text-xs mt-1">{STATS.total} school days recorded</Text>
          </View>
          <CalendarIcon size={48} color="rgba(255,255,255,0.3)" />
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-3 mb-8">
          <View className="flex-1 bg-white p-5 rounded-[2.5rem] border border-gray-100 items-center shadow-sm">
            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Present</Text>
            <Text className="text-emerald-500 text-3xl font-black">{STATS.present}</Text>
          </View>
          <View className="flex-1 bg-white p-5 rounded-[2.5rem] border border-gray-100 items-center shadow-sm">
            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Absent</Text>
            <Text className="text-rose-500 text-3xl font-black">{STATS.absent}</Text>
          </View>
          <View className="flex-1 bg-white p-5 rounded-[2.5rem] border border-gray-100 items-center shadow-sm">
            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Late</Text>
            <Text className="text-amber-500 text-3xl font-black">{STATS.late}</Text>
          </View>
        </View>

        {/* History */}
        <Text className="text-lg font-bold text-gray-900 mb-4 ml-2">Recent Records</Text>
        {DUMMY_ATTENDANCE.map((item) => {
          const config = getStatusConfig(item.status);
          return (
            <View key={item.id} className="bg-white p-4 rounded-3xl mb-3 flex-row items-center border border-gray-100 shadow-sm">
              <View className={`p-3 rounded-2xl mr-4 ${config.bg}`}>
                {config.icon}
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-gray-900 font-bold">{formatDate(item.date)}</Text>
                  <Text className={`font-black uppercase text-[10px] ${config.text}`}>{config.label}</Text>
                </View>
                <Text className="text-gray-400 text-sm">Subject: {item.subject}</Text>
              </View>
            </View>
          );
        })}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
