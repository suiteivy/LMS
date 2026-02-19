import { useAuth } from '@/contexts/AuthContext';
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
import { ActivityIndicator, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';

export default function ParentIndex() {
  const { profile, loading, logout } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return <ParentDashboard user={profile} logout={logout} />;
}

// ── Dummy data ────────────────────────────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────

function ParentDashboard({ user, logout }: any) {
  const [showNotification, setShowNotification] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [linkedStudents, setLinkedStudents] = useState<any[]>(DUMMY_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<any>(DUMMY_STUDENTS[0]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentData, setStudentData] = useState<any>(DUMMY_STUDENT_DATA[DUMMY_STUDENTS[0].id]);

  useEffect(() => {
    if (selectedStudent) {
      setStudentData(DUMMY_STUDENT_DATA[selectedStudent.id] || {});
    }
  }, [selectedStudent]);

  const closeModal = () => setActiveModal(null);

  if (loadingStudents) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-gray-400 mt-2">Loading your children...</Text>
      </View>
    );
  }

  if (linkedStudents.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-8">
        <UserCircle size={60} color="#d1d5db" />
        <Text className="text-xl font-bold text-gray-800 mt-4 text-center">No Students Linked</Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/signIn")}
          className="mt-8 bg-orange-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 bg-gray-50">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="p-4 md:p-8">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-gray-500 text-base font-medium">Parent Portal</Text>
                <Text className="text-3xl font-bold text-gray-900">Hello, {user?.full_name?.split(" ")[0]} 👋</Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  await logout();
                  router.replace("/(auth)/signIn");
                }}
                className="flex-row items-center bg-red-50 px-3 py-2 rounded-xl border border-red-100"
              >
                <LogOut size={18} color="#ef4444" />
                <Text className="ml-2 text-red-600 font-semibold text-sm">Logout</Text>
              </TouchableOpacity>
            </View>

            {linkedStudents.length > 1 && (
              <View className="mb-6">
                <Text className="text-gray-500 font-medium mb-2">Select Child</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {linkedStudents.map((stu) => (
                    <TouchableOpacity
                      key={stu.id}
                      onPress={() => setSelectedStudent(stu)}
                      className={`mr-3 px-4 py-2 rounded-full border ${selectedStudent?.id === stu.id ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-200'}`}
                    >
                      <Text className={`font-semibold ${selectedStudent?.id === stu.id ? 'text-white' : 'text-gray-600'}`}>{stu.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View className="bg-orange-500 p-6 rounded-3xl shadow-lg mb-8 flex-row items-center">
              <View className="bg-white/20 p-3 rounded-2xl mr-4">
                <UserCircle size={30} color="white" />
              </View>
              <View>
                <Text className="text-orange-100 text-xs font-bold uppercase tracking-wider">Currently Viewing</Text>
                <Text className="text-white text-xl font-bold">{selectedStudent?.name}</Text>
                <Text className="text-orange-50 text-sm">Grade {selectedStudent?.grade_level || 'N/A'}</Text>
              </View>
            </View>

            <View className="flex-row gap-4 mb-8">
              <MetricCard
                icon={TrendingUp}
                value={studentData.performance?.average_grade || "N/A"}
                label="Avg Grade"
                color="#f97316"
              />
              <MetricCard
                icon={CheckCircle}
                value={studentData.attendance?.overall_percentage ? `${studentData.attendance.overall_percentage}%` : "N/A"}
                label="Attendance"
                color="#059669"
              />
            </View>

            <SectionHeader title="Recent Updates" actionLabel="History" onAction={() => setActiveModal("reports")} />
            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-8">
              <Text className="text-gray-500 text-sm">No recent updates for {selectedStudent?.name}.</Text>
            </View>

            <Text className="text-xl font-bold text-gray-900 mb-4">Management</Text>
            <View className="flex-row flex-wrap justify-between">
              <QuickAction
                icon={CreditCard}
                label="Fees & Billing"
                color="#2563eb"
                onPress={() => router.navigate({ pathname: "/(parent)/finance" as any, params: { studentId: selectedStudent.id } })}
              />
              <QuickAction
                icon={Calendar}
                label="Attendance"
                color="#7c3aed"
                onPress={() => router.navigate({ pathname: "/(parent)/attendance" as any, params: { studentId: selectedStudent.id } })}
              />
              <QuickAction
                icon={MessageSquare}
                label="Messages"
                color="#0891b2"
                onPress={() => router.navigate("/(parent)/messages" as any)}
              />
              <QuickAction
                icon={FileText}
                label="Academic Records"
                color="#ea580c"
                onPress={() => router.navigate({ pathname: "/(parent)/grades" as any, params: { studentId: selectedStudent.id } })}
              />
            </View>

            <SectionHeader title="Announcements" actionLabel="View All" onAction={() => router.push("/(parent)/announcements" as any)} />
            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-8">
              <Text className="text-gray-500 text-sm">Tap "View All" to check latest school updates.</Text>
            </View>
          </View>
        </ScrollView>

      </View>
    </>
  );
}

const MetricCard = ({ icon: Icon, value, label, color }: any) => (
  <View className="flex-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
    <Icon size={20} color={color} />
    <Text className="text-gray-900 text-2xl font-bold mt-2">{value}</Text>
    <Text className="text-gray-400 text-xs font-medium uppercase">{label}</Text>
  </View>
);

const SectionHeader = ({ title, actionLabel, onAction }: any) => (
  <View className="flex-row justify-between items-end mb-4">
    <Text className="text-xl font-bold text-gray-900">{title}</Text>
    <TouchableOpacity onPress={onAction}><Text className="text-orange-500 font-semibold">{actionLabel}</Text></TouchableOpacity>
  </View>
);

const QuickAction = ({ icon: Icon, label, color, onPress }: any) => (
  <TouchableOpacity onPress={onPress} className="w-[48%] bg-white p-6 rounded-3xl border border-gray-100 shadow-sm items-center mb-4 active:bg-gray-50">
    <View style={{ backgroundColor: `${color}15` }} className="p-3 rounded-2xl mb-2">
      <Icon size={24} color={color} />
    </View>
    <Text className="text-gray-800 font-bold text-center text-xs">{label}</Text>
  </TouchableOpacity>
);

