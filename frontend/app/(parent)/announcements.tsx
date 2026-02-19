import { AlertTriangle, Bell, Calendar, Info, MessageSquare } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";

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
    tagBg: "#EFF6FF",
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
    tagBg: "#F5F3FF",
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
    tagBg: "#FEF2F2",
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
    tagBg: "#ECFDF5",
    icon: <Info size={18} color="#059669" />,
  },
];

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function StudentAnnouncementsPage() {
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Announcements</Text>
        <Text className="text-gray-500 text-sm mt-1">School news and important updates · Demo Data</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {DUMMY_ANNOUNCEMENTS.map((item) => (
          <View key={item.id} className="bg-white p-6 rounded-[2.5rem] mb-5 border border-gray-100 shadow-sm">
            {/* Tag + Date Row */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View style={{ backgroundColor: item.tagBg }} className="p-2 rounded-xl">
                  {item.icon}
                </View>
                <Text className="text-gray-400 text-[10px] font-bold uppercase ml-3">{formatDate(item.created_at)}</Text>
              </View>
              <View style={{ backgroundColor: item.tagBg }} className="px-3 py-1 rounded-full">
                <Text style={{ color: item.tagColor }} className="font-bold text-[10px] uppercase">{item.tag}</Text>
              </View>
            </View>

            {/* Title + Body */}
            <Text className="text-lg font-bold text-gray-900 mb-2">{item.title}</Text>
            <Text className="text-gray-600 leading-6 mb-5">{item.message}</Text>

            {/* Author */}
            <View className="pt-4 border-t border-gray-50 flex-row items-center">
              <View className="bg-gray-100 p-2 rounded-full mr-3">
                <MessageSquare size={14} color="#6B7280" />
              </View>
              <View>
                <Text className="text-gray-700 text-xs font-semibold">{item.author}</Text>
                <Text className="text-gray-400 text-[10px]">{item.role}</Text>
              </View>
            </View>
          </View>
        ))}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
