import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Modal } from 'react-native';
import { 
  User, TrendingUp, CheckCircle, FileText, CreditCard, 
  Calendar, MessageSquare, X,
  LogOut
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Notifications from '../../components/Notifications';
import { router } from 'expo-router';

// --- 1. MAIN PAGE ENTRY ---
export default function ParentIndex() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return <ParentDashboard user={profile} />;
}


function ParentDashboard({ user }: any) {
  const [showNotification, setShowNotification] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const closeModal = () => setActiveModal(null);

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="p-4 md:p-8">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-gray-500 text-base font-medium">
                  Parent Portal
                </Text>
                <Text className="text-3xl font-bold text-gray-900">
                  Hello, {user?.full_name?.split(" ")[0] || "Sarah"} 👋
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/signIn")}
                className="flex-row items-center bg-red-50 px-3 py-2 rounded-xl border border-red-100 active:bg-red-100"
              >
                <LogOut size={18} color="#ef4444" strokeWidth={2.5} />
                <Text className="ml-2 text-red-600 font-semibold text-sm">
                  Logout
                </Text>
              </TouchableOpacity>
            </View>

            {/* Child Status Card */}
            <View className="bg-orange-500 p-6 rounded-3xl shadow-lg mb-8 flex-row items-center">
              <View className="bg-white/20 p-3 rounded-2xl mr-4">
                <User size={30} color="white" />
              </View>
              <View>
                <Text className="text-orange-100 text-xs font-bold uppercase tracking-wider">
                  Currently Viewing
                </Text>
                <Text className="text-white text-xl font-bold">
                  Alex Reed (Grade 11)
                </Text>
              </View>
            </View>

            {/* Metrics */}
            <View className="flex-row gap-4 mb-8">
              <MetricCard
                icon={TrendingUp}
                value="A-"
                label="Avg Grade"
                color="#f97316"
              />
              <MetricCard
                icon={CheckCircle}
                value="Paid"
                label="Fees Status"
                color="#059669"
              />
            </View>

            {/* Recent Updates */}
            <SectionHeader
              title="Recent Updates"
              actionLabel="History"
              onAction={() => setActiveModal("reports")}
            />
            <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-8">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <FileText size={18} color="#4b5563" />
                  <Text className="ml-2 font-bold text-gray-800">
                    Mid-Term Report Card
                  </Text>
                </View>
                <Text className="text-gray-400 text-xs">2d ago</Text>
              </View>
              <Text className="text-gray-500 text-sm">
                Mathematics and Science grades have been updated.
              </Text>
            </View>

            {/* Quick Actions Grid */}
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Management
            </Text>
            <View className="flex-row flex-wrap justify-between">
              <QuickAction
                icon={CreditCard}
                label="Fees & Billing"
                color="#2563eb"
                onPress={() => setActiveModal("billing")}
              />
              <QuickAction
                icon={Calendar}
                label="Attendance"
                color="#7c3aed"
                onPress={() => setActiveModal("attendance")}
              />
              <QuickAction
                icon={MessageSquare}
                label="Contact School"
                color="#0891b2"
                onPress={() => setActiveModal("contact")}
              />
              <QuickAction
                icon={FileText}
                label="Reports"
                color="#ea580c"
                onPress={() => setActiveModal("reports")}
              />
            </View>
          </View>
        </ScrollView>

        {/* Modals Mapping */}
        <DashboardModal
          visible={activeModal === "billing"}
          title="Billing & Fees"
          onClose={closeModal}
        >
          <BillingContent />
        </DashboardModal>
        <DashboardModal
          visible={activeModal === "attendance"}
          title="Attendance"
          onClose={closeModal}
        >
          <AttendanceContent />
        </DashboardModal>
        <DashboardModal
          visible={activeModal === "reports"}
          title="Academic Reports"
          onClose={closeModal}
        >
          <ReportsContent />
        </DashboardModal>
        <DashboardModal
          visible={activeModal === "contact"}
          title="Contact Administration"
          onClose={closeModal}
        >
          <ContactContent />
        </DashboardModal>

        <Notifications
          visible={showNotification}
          onClose={() => setShowNotification(false)}
        />
      </View>
    </>
  );
}

// --- 3. REUSABLE SUB-COMPONENTS ---

const MetricCard = ({ icon: Icon, value, label, color }: any) => (
  <View className="flex-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
    <Icon size={20} color={color} />
    <Text className="text-gray-900 text-2xl font-bold mt-2">{value}</Text>
    <Text className="text-gray-400 text-xs font-medium uppercase">{label}</Text>
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

const SectionHeader = ({ title, actionLabel, onAction }: any) => (
  <View className="flex-row justify-between items-end mb-4">
    <Text className="text-xl font-bold text-gray-900">{title}</Text>
    <TouchableOpacity onPress={onAction}><Text className="text-orange-500 font-semibold">{actionLabel}</Text></TouchableOpacity>
  </View>
);

const DashboardModal = ({ visible, title, onClose, children }: any) => (
  <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
    <View className="flex-1 justify-end bg-black/50">
      <View className="bg-white rounded-t-[40px] h-[75%] p-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-gray-900">{title}</Text>
          <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full"><X size={20} color="#374151" /></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </View>
  </Modal>
);

// --- 4. CONTENT COMPONENTS ---

const BillingContent = () => (
  <View>
    <View className="bg-orange-50 p-6 rounded-3xl mb-4">
      <Text className="text-orange-500 font-bold uppercase text-[10px]">Status: Paid</Text>
      <Text className="text-3xl font-black text-gray-900">$0.00</Text>
      <Text className="text-gray-500">Current Outstanding Balance</Text>
    </View>
    <Text className="font-bold text-gray-800 mb-2">History</Text>
    {['Term 1 Tuition', 'Exam Fees', 'Sports Gear'].map((item, idx) => (
      <View key={idx} className="flex-row justify-between py-4 border-b border-gray-50">
        <Text className="text-gray-600">{item}</Text>
        <Text className="font-bold text-green-500">Paid</Text>
      </View>
    ))}
  </View>
);

const AttendanceContent = () => (
  <View>
    <View className="flex-row justify-between mb-6">
      <View className="items-center bg-blue-50 p-4 rounded-3xl flex-1 mr-2"><Text className="text-2xl font-black text-blue-600">92%</Text><Text className="text-blue-400 text-xs">Present</Text></View>
      <View className="items-center bg-red-50 p-4 rounded-3xl flex-1 ml-2"><Text className="text-2xl font-black text-red-600">3</Text><Text className="text-red-400 text-xs">Absences</Text></View>
    </View>
    <Text className="font-bold text-gray-800 mb-2 text-center text-gray-400 italic">No recent absences to report.</Text>
  </View>
);

const ReportsContent = () => (
  <View>
    {['Mid-Term Report', 'Progress Report Q1', 'Final Grade Sheet'].map((report, idx) => (
      <TouchableOpacity key={idx} className="bg-gray-50 p-5 rounded-2xl mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center"><FileText size={20} color="orange" /><Text className="ml-3 font-semibold text-gray-800">{report}</Text></View>
        <Text className="text-orange-500 font-bold">PDF</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const ContactContent = () => (
  <View>
    <Text className="text-gray-500 mb-4">Select a department to message directly:</Text>
    {['Class Teacher', 'Accounting', 'Principal', 'Transport'].map((dept, idx) => (
      <TouchableOpacity key={idx} className="border border-gray-100 p-4 rounded-2xl mb-3 flex-row justify-between items-center">
        <Text className="font-bold text-gray-700">{dept}</Text><MessageSquare size={18} color="#D1D5DB" />
      </TouchableOpacity>
    ))}
  </View>
);