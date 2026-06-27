import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { router } from "expo-router";
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  LogOut,
  RefreshCw,
  UserPlus,
  Wallet,
} from 'lucide-react-native';
import React, { useCallback, useState } from "react";
import { ActivityIndicator, DimensionValue, RefreshControl, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { OnboardingTracker, SubscriptionBanner, SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

// Cast icons for RN compatibility
const IconUserPlus = UserPlus as any;
const IconWallet = Wallet as any;
const IconBookOpen = BookOpen as any;
const IconBarChart3 = BarChart3 as any;
const IconLogOut = LogOut as any;
const IconCalendar = Calendar as any;
const IconClipboardList = ClipboardList as any;
const IconRefreshCw = RefreshCw as any;

interface QuickActionProps {
  icon: any;
  label: string;
  onPress: () => void;
  badge?: React.ReactNode;
}

const QuickAction = ({ icon: Icon, label, onPress, badge }: QuickActionProps) => (
  <TouchableOpacity
    className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-4 mb-3 flex-row items-center"
    style={{ width: '48.5%' }}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Icon size={18} color="#FF6900" />
    {badge && <View className="ml-2">{badge}</View>}
    <Text className="text-gray-900 dark:text-white font-bold text-sm ml-3 flex-1" numberOfLines={1}>{label}</Text>
  </TouchableOpacity>
);

export default function AdminDashboard() {
  const {
    profile,
    subscriptionPlan,
    isMain,
    logout,
  } = useAuth();
  const { stats, refresh: refreshStats } = useDashboardStats();
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const tier = useSubscriptionTier();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshStats]);

  const attendanceValue = stats.find(s => s.label === "Attendance")?.value || "0%";
  const totalStudents = parseInt(stats.find(s => s.label === "Total Students")?.value || "0");
  const planMax = subscriptionPlan === 'trial' ? 50 : subscriptionPlan === 'basic' ? 500 : subscriptionPlan === 'pro' ? 1000 : 100000;
  const capacityPct = `${Math.min((totalStudents / planMax) * 100, 100)}%`;
  const totalTeachers = parseInt(stats.find(s => s.label === "Teachers")?.value || "0");
  const totalUsers = totalStudents + totalTeachers;
  const formatLargeNumber = (value: number) => (value > 100 ? value.toLocaleString() : `${value}`);

  return (
    <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SubscriptionBanner />
      <UnifiedHeader
        title="Welcome back,"
        subtitle={profile?.full_name || "Administrator"}
        role="Admin"
        showNotification={true}
        showMainBadge={isMain}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20, paddingTop: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#FF6900"]} tintColor="#FF6900" />}
      >
        {/* ── Top Actions Row ── */}
        <View className="flex-row justify-end mb-4" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing}
            className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-4 py-2 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]"
            activeOpacity={0.7}
            style={{ opacity: refreshing ? 0.6 : 1 }}
          >
            {refreshing
              ? <ActivityIndicator size="small" color="#FF6900" />
              : <IconRefreshCw size={14} color="#FF6900" />}
            <Text className="ml-2 text-[#FF6900] font-bold text-[10px] uppercase tracking-widest">Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => { await logout(); router.replace("/(auth)/signIn"); }}
            className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-4 py-2 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]"
            activeOpacity={0.7}
          >
            <IconLogOut size={14} color="#ef4444" />
            <Text className="ml-2 text-red-500 font-bold text-[10px] uppercase tracking-widest">Logout</Text>
          </TouchableOpacity>
        </View>

        <OnboardingTracker stats={stats} />

        {/* ── Hero Inline Stats ── */}
        <View className="flex-row items-start justify-between mb-6 mt-2">
          {tier.showFinancials && (
            <View>
              <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Revenue</Text>
              <Text className="text-gray-900 dark:text-white text-3xl font-black" numberOfLines={1} adjustsFontSizeToFit>
                {stats.find(s => s.label === "Revenue")?.value || "KES 0"}
              </Text>
            </View>
          )}
          <View className="items-end">
            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Total Users</Text>
            <Text className="text-[#FF6900] text-3xl font-black">{formatLargeNumber(totalUsers)}</Text>
          </View>
        </View>

        {/* ── Institution Capacity ── */}
        <SubscriptionGate minPlan="basic">
          <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mb-4">
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-gray-900 dark:text-white font-bold text-base">Institution Capacity</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                {subscriptionPlan === 'trial' ? 'Trial Limit' : 'Scale Usage'}
              </Text>
            </View>
            <View className="h-2 bg-[#EAEEF2] dark:bg-[#161B22] rounded-full overflow-hidden mb-2">
              <View className="h-full bg-[#FF6900] rounded-full" style={{ width: capacityPct as DimensionValue }} />
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs">{formatLargeNumber(totalStudents)} enrolled</Text>
              <Text className="text-gray-900 dark:text-white font-bold text-xs">
                {subscriptionPlan === 'premium' || subscriptionPlan === 'custom' ? 'Unlimited' : `Limit: ${formatLargeNumber(planMax)}`}
              </Text>
            </View>
          </View>
        </SubscriptionGate>

        {/* ── Today's Presence ── */}
        <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-gray-900 dark:text-white font-bold text-base">Today's Presence</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Real-time Engagement</Text>
            </View>
            <Text className="text-gray-900 dark:text-white text-2xl font-black">{attendanceValue}</Text>
          </View>
          <View className="h-2 bg-[#EAEEF2] dark:bg-[#161B22] rounded-full overflow-hidden mb-2">
            <View className="h-full bg-[#FF6900] rounded-full" style={{ width: attendanceValue as DimensionValue }} />
          </View>
          <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs">
            {stats.find(s => s.label === "Attendance")?.subValue || "No data recorded today"}
          </Text>
        </View>

        {/* ── Quick Actions ── */}
        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">Quick Actions</Text>
          <View className="flex-row flex-wrap justify-between">
            <QuickAction icon={IconUserPlus} label="Enroll User" onPress={() => router.push({ pathname: "/(admin)/users/create", params: { backTo: "/(admin)" } })} />
            <SubscriptionGate feature="library">
              <QuickAction icon={IconBookOpen} label="Library" onPress={() => router.navigate({ pathname: "/(admin)/management/library", params: { backTo: "/(admin)" } } as any)} />
            </SubscriptionGate>
            <SubscriptionGate feature="finance">
              <QuickAction icon={IconWallet} label="Finance" onPress={() => router.navigate({ pathname: "/(admin)/finance", params: { backTo: "/(admin)" } } as any)} />
            </SubscriptionGate>
            <SubscriptionGate feature="analytics">
              <QuickAction icon={IconBarChart3} label="Analytics" onPress={() => router.navigate({ pathname: "/(admin)/management/analytics", params: { backTo: "/(admin)" } } as any)} />
            </SubscriptionGate>
            <QuickAction icon={IconCalendar} label="Attendance" onPress={() => router.push({ pathname: "/(admin)/attendance", params: { backTo: "/(admin)" } } as any)} />
            <QuickAction icon={IconClipboardList} label="Results & Cards" onPress={() => router.push({ pathname: "/(admin)/results", params: { backTo: "/(admin)" } } as any)} />
          </View>
        </View>

      </ScrollView>

    </View>
  );
}
