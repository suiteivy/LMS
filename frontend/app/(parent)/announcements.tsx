import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { ParentService } from "@/services/ParentService";
import { useLocalSearchParams } from "expo-router";
import { router } from "expo-router";
import { AlertTriangle, Bell, Calendar, ChevronRight, Info, MessageSquare } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useParentStudentContext } from "@/hooks/useParentStudentContext";

const getNotificationConfig = (type: string) => {
  switch (type) {
    case "urgent":
      return { tag: "Urgent", color: "#dc2626", bg: "bg-red-50", icon: <AlertTriangle size={18} color="#dc2626" /> };
    case "event":
      return { tag: "Event", color: "#7c3aed", bg: "bg-purple-50", icon: <Bell size={18} color="#7c3aed" /> };
    case "academic":
      return { tag: "Academic", color: "#2563eb", bg: "bg-blue-50", icon: <Calendar size={18} color="#2563eb" /> };
    default:
      return { tag: "Info", color: "#059669", bg: "bg-emerald-50", icon: <Info size={18} color="#059669" /> };
  }
};

export default function StudentAnnouncementsPage() {
  const tier = useSubscriptionTier();
  const params = useLocalSearchParams();
  const { studentId, ready } = useParentStudentContext(params as any, { autoInjectParams: true, persistWhenParamPresent: true });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const fetchAnnouncements = async () => {
    if (!studentId) {
      setAnnouncements([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await ParentService.getStudentAnnouncements(studentId);
      setAnnouncements(data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    fetchAnnouncements();
  }, [ready, studentId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-navy">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }
  return (
    <View className="flex-1 bg-gray-50 dark:bg-navy">
      <UnifiedHeader
        title="Announcements"
        subtitle="Archives"
        role="Parent/Guardian"
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
          <View className="px-2 mb-8 flex-row justify-between items-center">
            <Text className="text-gray-900 dark:text-white font-bold text-2xl tracking-tighter">School Registry</Text>
            <View className="flex-row items-center">
              <HelpTooltip id="parent.announcements.feed" role="parent" tier={tier} onLearnMore={(a) => router.push({ pathname: '/(parent)/accessibility/settings', params: { manual: '1', anchor: a || 'parent-workflow' } } as any)} />
              <View className="bg-orange-50 dark:bg-orange-950/30 px-3 py-1 rounded-full ml-2">
                <Text className="text-[#FF6900] text-[8px] font-black uppercase tracking-widest">{announcements.length} Updates</Text>
              </View>
            </View>
          </View>

          {announcements.length === 0 ? (
            <View className="bg-[#FFFFFF] dark:bg-[#0D1117]-surface p-12 rounded-xl items-center border border-[#D0D7DE] dark:border-[#21262D] border-dashed mt-4">
              <Bell size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
              <Text className="text-gray-500 dark:text-gray-400 font-bold text-center mt-6">No announcements recorded</Text>
            </View>
          ) : (
            announcements.map((item) => {
              const config = getNotificationConfig(item.type);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  className="bg-[#FFFFFF] dark:bg-[#0D1117]-surface p-8 rounded-xl mb-6 border border-[#D0D7DE] dark:border-[#21262D] shadow-sm"
                >
                  {/* Tag + Date Row */}
                  <View className="flex-row items-center justify-between mb-6">
                    <View className="flex-row items-center">
                      <View className={`${config.bg} dark:bg-gray-800 p-3 rounded-xl shadow-sm`}>
                        {config.icon}
                      </View>
                      <View className="ml-4">
                        <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">{config.tag}</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{new Date(item.created_at).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <ChevronRight size={16} color="#D1D5DB" />
                  </View>

                  {/* Title + Body */}
                  <Text className="text-xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">{item.title}</Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm leading-[22px] mb-8 font-medium">{item.message}</Text>

                  {/* Author (Simplified for notifications) */}
                  <View className="pt-6 border-t border-[#D0D7DE] dark:border-[#21262D] flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="bg-gray-50 dark:bg-gray-800 w-10 h-10 rounded-full items-center justify-center border border-[#D0D7DE] dark:border-[#21262D] mr-3">
                        <MessageSquare size={14} color="#FF6900" />
                      </View>
                      <View>
                        <Text className="text-gray-900 dark:text-white text-xs font-bold tracking-tight">System Notification</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-[8px] font-bold uppercase tracking-widest mt-0.5">{item.type}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
