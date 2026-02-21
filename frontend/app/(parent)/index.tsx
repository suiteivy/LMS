import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import {
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  LogOut,
  MessageSquare,
  TrendingUp,
  UserCircle
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function ParentIndex() {
  const { profile, loading, logout } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  return <ParentDashboard user={profile} logout={logout} />;
}

const DUMMY_STUDENTS = [
  { id: "s1", name: "Ethan Kamau", grade_level: "9" },
  { id: "s2", name: "Aisha Kamau", grade_level: "6" },
];

const DUMMY_STUDENT_DATA: Record<string, any> = {
  s1: {
    performance: { average_grade: "A-" },
    attendance: { overall_percentage: 92 },
  },
  s2: {
    performance: { average_grade: "B+" },
    attendance: { overall_percentage: 87 },
  },
};

function ParentDashboard({ user, logout }: any) {
  const { isDark } = useTheme();
  const [linkedStudents, setLinkedStudents] = useState<any[]>(DUMMY_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<any>(DUMMY_STUDENTS[0]);
  const [studentData, setStudentData] = useState<any>(DUMMY_STUDENT_DATA[DUMMY_STUDENTS[0].id]);

  useEffect(() => {
    if (selectedStudent) {
      setStudentData(DUMMY_STUDENT_DATA[selectedStudent.id] || {});
    }
  }, [selectedStudent]);

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <UnifiedHeader
        title="Intelligence"
        subtitle="Parent Portal"
        role="Parent"
        showNotification={true}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <View className="p-4 md:p-8">
          {/* Log out link in subtle position */}
          <View className="flex-row justify-end mb-6 px-2">
            <TouchableOpacity
              onPress={async () => {
                await logout();
                router.replace("/(auth)/signIn");
              }}
              className="flex-row items-center bg-white dark:bg-[#1a1a1a] px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <LogOut size={14} color="#ef4444" />
              <Text className="ml-2 text-red-600 font-bold text-[10px] uppercase tracking-widest">Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Child Selection Hero */}
          <View className="bg-gray-900 dark:bg-[#1a1a1a] p-8 rounded-[48px] shadow-2xl mb-8">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Child Profile</Text>
                <Text className="text-white text-3xl font-black tracking-tighter">{selectedStudent?.name}</Text>
                <View className="bg-[#FF6900]/20 self-start px-3 py-1 rounded-full mt-2">
                  <Text className="text-[#FF6900] text-[10px] font-bold tracking-widest uppercase">Grade {selectedStudent?.grade_level}</Text>
                </View>
              </View>
              <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center border border-white/10">
                <UserCircle size={32} color="white" />
              </View>
            </View>

            {linkedStudents.length > 1 && (
              <View className="border-t border-white/10 pt-6">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-4">Switch Student</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {linkedStudents.map((stu) => (
                    <TouchableOpacity
                      key={stu.id}
                      onPress={() => setSelectedStudent(stu)}
                      className={`mr-3 px-6 py-2.5 rounded-2xl border ${selectedStudent?.id === stu.id ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-white/5 border-white/10'}`}
                    >
                      <Text className={`font-bold text-xs ${selectedStudent?.id === stu.id ? 'text-white' : 'text-gray-400'}`}>{stu.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Metrics Row */}
          <View className="flex-row gap-4 mb-8">
            <MetricCard
              icon={TrendingUp}
              value={studentData.performance?.average_grade || "N/A"}
              label="Academic Avg"
              color="#FF6900"
            />
            <MetricCard
              icon={CheckCircle}
              value={studentData.attendance?.overall_percentage ? `${studentData.attendance.overall_percentage}%` : "N/A"}
              label="Attendance"
              color="#10B981"
            />
          </View>

          {/* Management Portal */}
          <View className="px-2 mb-6">
            <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Academic Oversight</Text>
          </View>

          <View className="flex-row flex-wrap justify-between px-1">
            <QuickAction
              icon={CreditCard}
              label="Finances"
              color="#2563eb"
              isDark={isDark}
              onPress={() => router.navigate({ pathname: "/(parent)/finance" as any, params: { studentId: selectedStudent.id } })}
            />
            <QuickAction
              icon={Calendar}
              label="Attendance"
              color="#7c3aed"
              isDark={isDark}
              onPress={() => router.navigate({ pathname: "/(parent)/attendance" as any, params: { studentId: selectedStudent.id } })}
            />
            <QuickAction
              icon={MessageSquare}
              label="Messaging"
              color="#0891b2"
              isDark={isDark}
              onPress={() => router.navigate("/(parent)/messages" as any)}
            />
            <QuickAction
              icon={FileText}
              label="Transcript"
              color="#ea580c"
              isDark={isDark}
              onPress={() => router.navigate({ pathname: "/(parent)/grades" as any, params: { studentId: selectedStudent.id } })}
            />
          </View>

          {/* Updates Section */}
          <SectionHeader title="Institutional Updates" actionLabel="Archive" onAction={() => router.push("/(parent)/announcements" as any)} />
          <View className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm mb-8 items-center border-dashed">
            <Text className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest italic text-center">No unread notifications for {selectedStudent?.name.split(" ")[0]}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const MetricCard = ({ icon: Icon, value, label, color }: any) => (
  <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] border border-gray-50 dark:border-gray-800 shadow-sm">
    <View className={`w-10 h-10 rounded-2xl items-center justify-center mb-4`} style={{ backgroundColor: `${color}10` }}>
      <Icon size={20} color={color} />
    </View>
    <Text className="text-gray-900 dark:text-white text-3xl font-black tracking-tighter">{value}</Text>
    <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-[2px] mt-1">{label}</Text>
  </View>
);

const SectionHeader = ({ title, actionLabel, onAction }: any) => (
  <View className="flex-row justify-between items-center mb-6 px-4">
    <Text className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{title}</Text>
    <TouchableOpacity onPress={onAction} className="bg-orange-50 dark:bg-orange-950/30 px-4 py-2 rounded-xl">
      <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-widest">{actionLabel}</Text>
    </TouchableOpacity>
  </View>
);

const QuickAction = ({ icon: Icon, label, color, onPress, isDark }: any) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="w-[48%] bg-white dark:bg-[#1a1a1a] p-8 rounded-[40px] border border-gray-50 dark:border-gray-800 shadow-sm items-center mb-4 active:bg-gray-50 dark:active:bg-gray-900">
    <View style={{ backgroundColor: isDark ? `${color}25` : `${color}10` }} className="p-4 rounded-3xl mb-3 shadow-inner">
      <Icon size={24} color={color} />
    </View>
    <Text className="text-gray-900 dark:text-gray-200 font-bold text-xs uppercase tracking-widest">{label}</Text>
  </TouchableOpacity>
);
