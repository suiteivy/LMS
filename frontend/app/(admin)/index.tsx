import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { supabase } from "@/libs/supabase";
import { User } from "@/types/types";
import { router } from "expo-router";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  ClipboardList,
  GraduationCap,
  LayoutGrid,
  LogOut,
  RefreshCw,
  School,
  Settings,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, DimensionValue, RefreshControl, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { AddonRequestModal, AddonRequestButton, OnboardingTracker, SubscriptionBanner, SubscriptionGate, SubscriptionBadge } from "@/components/shared/SubscriptionComponents";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

// Cast icons for RN compatibility
const IconUserPlus = UserPlus as any;
const IconBell = Bell as any;
const IconUsers = Users as any;
const IconWallet = Wallet as any;
const IconLayoutGrid = LayoutGrid as any;
const IconSettings = Settings as any;
const IconArrowRight = ArrowRight as any;
const IconSchool = School as any;
const IconGraduationCap = GraduationCap as any;
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
    isDemo,
    subscriptionPlan,
    subscriptionStatus,
    isMain,
    addonMessaging,
    addonLibrary,
    addonFinance,
    addonAnalytics,
    addonBursary,
    logout,
  } = useAuth();
  const { stats, loading: statsLoading, refresh: refreshStats } = useDashboardStats();
  const { isDark } = useTheme();
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tier = useSubscriptionTier();

  const activeFeatures = [
    tier.showFinancials && tier.hasFinance && 'Finance',
    tier.hasLibrary && 'Library',
    tier.hasAnalytics && 'Analytics',
    tier.hasMessaging && 'Messaging',
    tier.showFinancials && tier.hasBursary && 'Bursary',
    tier.hasDiary && 'Diary',
  ].filter(Boolean).join(', ');

  const fetchRecentUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      if (!profile?.institution_id) { setRecentUsers([]); return; }
      const { data, error } = await supabase
        .from("users")
        .select(`*, students(id), teachers(id), admins(id)`)
        .eq("institution_id", profile.institution_id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      if (data) {
        const users = data.map((u: any) => {
          let displayId = u.id;
          if (u.role === 'student' && u.students?.[0]?.id) displayId = u.students[0].id;
          else if (u.role === 'teacher' && u.teachers?.[0]?.id) displayId = u.teachers[0].id;
          else if (u.role === 'admin' && u.admins?.[0]?.id) displayId = u.admins[0].id;
          return {
            id: u.id, displayId,
            name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown User',
            first_name: u.first_name || '', last_name: u.last_name || '',
            email: u.email || 'No Email', role: u.role,
            status: u.status, joinDate: u.created_at || new Date().toISOString(),
          } as User;
        });
        setRecentUsers(users);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [profile?.institution_id]);

  useEffect(() => {
    if (profile) fetchRecentUsers();
  }, [fetchRecentUsers, profile]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshStats(), fetchRecentUsers()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshStats, fetchRecentUsers]);

  const attendanceValue = stats.find(s => s.label === "Attendance")?.value || "0%";
  const totalStudents = parseInt(stats.find(s => s.label === "Total Students")?.value || "0");
  const planMax = subscriptionPlan === 'trial' ? 50 : subscriptionPlan === 'basic' ? 500 : subscriptionPlan === 'pro' ? 1000 : 100000;
  const capacityPct = `${Math.min((totalStudents / planMax) * 100, 100)}%`;

  return (
    <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
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
        <View className="flex-row gap-8 mb-6 mt-2">
          <View>
            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Students</Text>
            <Text className="text-gray-900 dark:text-white text-3xl font-black">
              {stats.find(s => s.label === "Total Students")?.value || "0"}
            </Text>
          </View>
          {tier.showFinancials && (
            <View>
              <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Revenue</Text>
              <Text className="text-gray-900 dark:text-white text-3xl font-black" numberOfLines={1} adjustsFontSizeToFit>
                {stats.find(s => s.label === "Revenue")?.value || "KES 0"}
              </Text>
            </View>
          )}
          <View>
            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Attendance</Text>
            <Text className="text-[#FF6900] text-3xl font-black">{attendanceValue}</Text>
          </View>
        </View>

        {/* ── Plan / Modules Card ── */}
        <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mb-4">
          <View className="flex-row items-center mb-4">
            <Zap size={18} color="#FF6900" fill="#FF6900" />
            <Text className="text-gray-900 dark:text-white font-bold text-base ml-3">Enhance Your Plan</Text>
            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-auto">Get modules</Text>
          </View>
          <View className="flex-row items-center border-t border-[#D0D7DE] dark:border-[#21262D] pt-4">
            <View>
              <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase mb-1">Base Plan</Text>
              <Text className="text-gray-900 dark:text-white font-bold text-sm">{tier.plan.toUpperCase()}</Text>
            </View>
            <View className="h-8 w-[1px] bg-[#D0D7DE] dark:bg-[#21262D] mx-4" />
            <View className="flex-1">
              <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase mb-1">Active Modules</Text>
              <Text className="text-gray-900 dark:text-white font-bold text-xs" numberOfLines={1}>
                {activeFeatures || "Core Modules Only"}
              </Text>
            </View>
          </View>
          <AddonRequestButton style={{ marginTop: 16 }} onPress={() => setRequestModalVisible(true)} />
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
            <View className="h-2 bg-[#EAEEF2] dark:bg-[#1C2128] rounded-full overflow-hidden mb-2">
              <View className="h-full bg-[#FF6900] rounded-full" style={{ width: capacityPct as DimensionValue }} />
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs">{totalStudents} enrolled</Text>
              <Text className="text-gray-900 dark:text-white font-bold text-xs">
                {subscriptionPlan === 'premium' || subscriptionPlan === 'custom' ? 'Unlimited' : `Limit: ${planMax}`}
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
          <View className="h-2 bg-[#EAEEF2] dark:bg-[#1C2128] rounded-full overflow-hidden mb-2">
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
            <QuickAction icon={IconUserPlus} label="Enroll User" onPress={() => router.push("/(admin)/users/create")} />
            <SubscriptionGate feature="library">
              <QuickAction icon={IconBookOpen} label="Library" onPress={() => router.navigate("/(admin)/management/library" as any)} />
            </SubscriptionGate>
            <SubscriptionGate feature="finance">
              <QuickAction icon={IconWallet} label="Finance" onPress={() => router.navigate("/(admin)/finance" as any)} />
            </SubscriptionGate>
            <SubscriptionGate feature="analytics">
              <QuickAction icon={IconBarChart3} label="Analytics" onPress={() => router.navigate("/(admin)/management/analytics" as any)} />
            </SubscriptionGate>
            <QuickAction icon={IconCalendar} label="Attendance" onPress={() => router.push("/(admin)/attendance" as any)} />
            <QuickAction icon={IconClipboardList} label="Results & Cards" onPress={() => router.push("/(admin)/results" as any)} />
          </View>
        </View>

        {/* ── Recent Users ── */}
        <View>
          <View className="flex-row justify-between items-end mb-3">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">Recent Users</Text>
            <TouchableOpacity onPress={() => router.navigate("/(admin)/users")} activeOpacity={0.7}>
              <Text className="text-[#FF6900] font-bold text-sm">View All</Text>
            </TouchableOpacity>
          </View>

          {loadingUsers ? (
            <ActivityIndicator color="#FF6900" className="my-6" />
          ) : recentUsers.length === 0 ? (
            <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-6 items-center justify-center mb-4">
              <IconUsers size={40} color={isDark ? "#4B5563" : "#9CA3AF"} />
              <Text className="text-gray-500 dark:text-gray-400 mt-2 text-xs uppercase tracking-widest font-bold">No recent activity</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4 -mx-5 px-5">
              {recentUsers.map((user) => (
                <View key={user.id} className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-4 mr-3 min-w-[200px]">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-xl bg-[#EAEEF2] dark:bg-[#1C2128] items-center justify-center mr-2">
                        {user.role === 'student'
                          ? <IconGraduationCap size={16} color="#FF6900" />
                          : user.role === 'teacher'
                            ? <IconSchool size={16} color="#FF6900" />
                            : <IconSettings size={16} color="#FF6900" />}
                      </View>
                      <Text className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest">{user.role}</Text>
                    </View>
                    <Text className="text-gray-500 dark:text-gray-400 font-bold text-[10px]">
                      {user.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                  <Text className="text-gray-900 dark:text-white font-bold text-base mb-1" numberOfLines={1}>{user.name}</Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs font-mono">{user.displayId}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      <AddonRequestModal
        visible={requestModalVisible}
        onClose={() => setRequestModalVisible(false)}
        currentAddons={{
          library: addonLibrary,
          messaging: addonMessaging,
          finance: addonFinance,
          analytics: addonAnalytics,
          bursary: addonBursary,
        }}
      />
    </View>
  );
}
