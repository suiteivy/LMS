import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { router } from "expo-router";
import { AlertTriangle, Bell, Calendar, ChevronRight, Info, MessageSquare } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const DUMMY_ANNOUNCEMENTS = [
  {
    id: "1",
    title: "Term 1 Exams Schedule Released",
    message: "The final examination timetable for Term 1, 2026 has been published. Exams begin on March 10th. Students should collect printed copies from the administration office. Parents are encouraged to review the schedule and support their children's preparation.",
    created_at: "2026-02-17T09:00:00Z",
    author: "Mrs. Josephine Waweru",
    role: "Principal",
    tag: "Academic",
    tagColor: "#2563eb",
    tagBg: "bg-blue-50",
    icon: <Calendar size={18} color="#2563eb" />,
  },
  {
    id: "2",
    title: "Parent-Teacher Conference — Feb 28",
    message: "We kindly invite all parents to attend the Term 1 Parent-Teacher Conference scheduled for February 28th, 2026 from 9:00 AM to 1:00 PM. This is an opportunity to meet your child's teachers, review academic progress, and discuss any concerns.",
    created_at: "2026-02-15T10:30:00Z",
    author: "Admin Office",
    role: "Administration",
    tag: "Event",
    tagColor: "#7c3aed",
    tagBg: "bg-purple-50",
    icon: <Bell size={18} color="#7c3aed" />,
  },
  {
    id: "3",
    title: "School Fees Deadline — March 1",
    message: "This is a reminder that all outstanding school fees for Term 1 must be settled by March 1st, 2026. Students with unpaid balances after this date may be unable to sit for end-of-term exams. Please contact the bursar's office for payment plans.",
    created_at: "2026-02-12T08:00:00Z",
    author: "Bursar's Office",
    role: "Finance",
    tag: "Urgent",
    tagColor: "#dc2626",
    tagBg: "bg-red-50",
    icon: <AlertTriangle size={18} color="#dc2626" />,
  },
  {
    id: "4",
    title: "New Digital Library Access",
    message: "Cloudora LMS now includes access to over 2,000 digital textbooks and reference materials via the Library module. Students can access these from their devices using their school login. Parents are encouraged to support digital learning at home.",
    created_at: "2026-02-08T14:00:00Z",
    author: "Mr. David Ochieng",
    role: "ICT Coordinator",
    tag: "Info",
    tagColor: "#059669",
    tagBg: "bg-emerald-50",
    icon: <Info size={18} color="#059669" />,
  },
];

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function StudentAnnouncementsPage() {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <UnifiedHeader
        title="Intelligence"
        subtitle="Archives"
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
          <View className="px-2 mb-8 flex-row justify-between items-center">
            <Text className="text-gray-900 dark:text-white font-bold text-2xl tracking-tighter">School Registry</Text>
            <View className="bg-orange-50 dark:bg-orange-950/30 px-3 py-1 rounded-full">
              <Text className="text-[#FF6900] text-[8px] font-black uppercase tracking-widest">{DUMMY_ANNOUNCEMENTS.length} Updates</Text>
            </View>
          </View>

          {DUMMY_ANNOUNCEMENTS.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[48px] mb-6 border border-gray-50 dark:border-gray-800 shadow-sm"
            >
              {/* Tag + Date Row */}
              <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center">
                  <View className={`${item.tagBg} dark:bg-gray-800 p-3 rounded-2xl shadow-sm`}>
                    {item.icon}
                  </View>
                  <View className="ml-4">
                    <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">{item.tag}</Text>
                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">{formatDate(item.created_at)}</Text>
                  </View>
                </View>
                <ChevronRight size={16} color="#D1D5DB" />
              </View>

              {/* Title + Body */}
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">{item.title}</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-sm leading-[22px] mb-8 font-medium">{item.message}</Text>

              {/* Author */}
              <View className="pt-6 border-t border-gray-50 dark:border-gray-800 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="bg-gray-50 dark:bg-gray-800 w-10 h-10 rounded-full items-center justify-center border border-gray-100 dark:border-gray-700 mr-3">
                    <MessageSquare size={14} color="#FF6900" />
                  </View>
                  <View>
                    <Text className="text-gray-900 dark:text-white text-xs font-bold tracking-tight">{item.author}</Text>
                    <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mt-0.5">{item.role}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
