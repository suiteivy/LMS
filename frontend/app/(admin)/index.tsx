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
  GraduationCap,
  LayoutGrid,
  LogOut,
  School,
  Settings,
  UserPlus,
  Users,
  Wallet
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, StatusBar } from "react-native";
import { SubscriptionBanner, SubscriptionGate, OnboardingTracker, SubscriptionBadge } from "@/components/shared/SubscriptionComponents";

interface QuickActionProps {
  icon: any;
  label: string;
  onPress: () => void;
  badge?: React.ReactNode;
}

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

const QuickAction = ({ icon: Icon, label, onPress, badge }: QuickActionProps) => (
  <TouchableOpacity
    className="w-[48%] bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 items-center shadow-sm active:opacity-70"
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-2xl mb-2">
      <Icon size={24} color="#FF6B00" />
    </View>
    <View className="flex-row items-center justify-center">
      <Text className="text-gray-900 dark:text-gray-200 font-bold text-[13px] text-center">{label}</Text>
      {badge}
    </View>
  </TouchableOpacity>
);

const DebugSessionInfo = ({ onClose }: { onClose: () => void }) => {
  const [debugInfo, setDebugInfo] = useState<any>({ status: 'Loading...', token: '...' });

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setDebugInfo({
        status: session ? 'Active' : 'No Session',
        token: session?.access_token ? `${session.access_token.substring(0, 15)}...` : 'None',
        user: session?.user?.email || 'None'
      });
    } catch (e: any) {
      setDebugInfo({ status: 'Error', error: e.message });
    }
  };

  useEffect(() => { checkSession(); }, []);

  return (
    <View className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl m-4 border border-red-100 dark:border-red-900/30 shadow-lg">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-red-800 dark:text-red-400 font-bold text-lg">Technical Diagnostics</Text>
        <TouchableOpacity onPress={onClose} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
          <Text className="text-gray-600 dark:text-gray-400 font-bold">✕</Text>
        </TouchableOpacity>
      </View>
      <View className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl space-y-2">
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500 font-medium">Status:</Text>
          <Text className="text-xs text-gray-900 dark:text-white font-mono">{debugInfo.status}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500 font-medium">User:</Text>
          <Text className="text-xs text-gray-900 dark:text-white font-mono">{debugInfo.user}</Text>
        </View>
        <View>
          <Text className="text-xs text-gray-500 font-medium mb-1">Token:</Text>
          <Text className="text-[10px] text-gray-400 dark:text-gray-500 font-mono" numberOfLines={2}>{debugInfo.token}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={checkSession}
        className="bg-red-50 dark:bg-red-950/20 p-3 rounded-xl mt-4 items-center"
        activeOpacity={0.6}
      >
        <Text className="text-red-600 text-xs font-bold uppercase tracking-widest">Refresh Session Info</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function AdminDashboard() {
  const { profile, isDemo, signOut, subscriptionPlan, subscriptionStatus } = useAuth();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { isDark } = useTheme();
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const fetchRecentUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);

      if (isDemo) {
        // High-quality mock data for Admin Demo Mode
        const mockUsers: User[] = [
          { id: 'u1', displayId: 'STU-101', name: 'Emily Davis', email: 'emily@demo.com', role: 'student', joinDate: new Date().toISOString() },
          { id: 'u2', displayId: 'TEA-001', name: 'John Smith', email: 'john@demo.com', role: 'teacher', joinDate: new Date(Date.now() - 86400000).toISOString() },
          { id: 'u3', displayId: 'STU-102', name: 'Robert Wilson', email: 'robert@demo.com', role: 'student', joinDate: new Date(Date.now() - 172800000).toISOString() },
          { id: 'u4', displayId: 'TEA-002', name: 'Sarah Parker', email: 'sarah@demo.com', role: 'teacher', joinDate: new Date(Date.now() - 259200000).toISOString() },
          { id: 'u5', displayId: 'ADM-001', name: 'Michael Brown', email: 'michael@demo.com', role: 'admin', joinDate: new Date(Date.now() - 345600000).toISOString() },
        ];
        setRecentUsers(mockUsers);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(`*, students(id), teachers(id), admins(id)`)
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
            id: u.id,
            displayId,
            name: u.full_name || 'Unknown User',
            email: u.email || 'No Email',
            role: u.role,
            status: u.status,
            joinDate: u.created_at || new Date().toISOString(),
          } as User;
        });
        setRecentUsers(users);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [isDemo]);

  useEffect(() => {
    if (isDemo || profile) {
      fetchRecentUsers();
    }
  }, [fetchRecentUsers, profile, isDemo]);

  // Theme-aware color tokens
  const cardBg = isDark ? '#121212' : '#111827';
  const surfaceBg = isDark ? '#1a1a1a' : '#ffffff';
  const surfaceBorder = isDark ? '#1f2937' : '#f3f4f6';
  const textPrimary = isDark ? '#f9fafb' : '#111827';
  const textMuted = isDark ? '#6b7280' : '#6b7280';
  const textSubtle = isDark ? '#9ca3af' : '#9ca3af';
  const badgeBg = isDark ? '#1f2937' : '#f9fafb';

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SubscriptionBanner />
      <UnifiedHeader
        title="Welcome back,"
        subtitle={profile?.full_name?.split(" ")[0] || "Administrator"}
        role="Admin"
        showNotification={true}
      />

      {showDebug && (
        <View className="absolute inset-0 z-50 bg-black/40 justify-center p-4">
          <DebugSessionInfo onClose={() => setShowDebug(false)} />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, padding: 24, paddingTop: 10 }}
      >
        <View>
          {/* Onboarding Tracker */}
          <OnboardingTracker stats={stats} />

          {/* Stat Cards */}
          {statsLoading ? (
            <View className="flex-row mb-8">
              <View className="flex-1 bg-gray-200 dark:bg-gray-800 h-32 rounded-3xl mr-2" />
              <View className="flex-1 bg-gray-200 dark:bg-gray-800 h-32 rounded-3xl ml-2" />
            </View>
          ) : (
            <View className="flex-row mb-10">
              {/* Students Card */}
              <View style={{
                flex: 1, backgroundColor: cardBg,
                padding: 20, borderRadius: 24, marginRight: 6,
                shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15, shadowRadius: 10, elevation: 8,
                minHeight: 140, justifyContent: 'space-between',
                borderWidth: isDark ? 1 : 0, borderColor: '#1f2937',
              }}>
                <View>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.1)", width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <IconUsers size={22} color="white" />
                  </View>
                  <Text style={{ color: "white", fontSize: 26, fontWeight: "700", letterSpacing: -0.5 }}>
                    {stats.find(s => s.label === "Total Students")?.value || "0"}
                  </Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.2 }}>
                  Total Students
                </Text>
              </View>

              {/* Revenue Card — always orange */}
              <View style={{
                flex: 1, backgroundColor: "#FF6B00",
                padding: 20, borderRadius: 24, marginLeft: 6,
                shadowColor: "#FF6B00", shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25, shadowRadius: 10, elevation: 12,
                minHeight: 140, justifyContent: 'space-between',
              }}>
                <View>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.2)", width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <IconWallet size={22} color="white" />
                  </View>
                  <Text style={{ color: "white", fontSize: 22, fontWeight: "700", letterSpacing: -1 }} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.find(s => s.label === "Revenue")?.value || "KES 0"}
                  </Text>
                  {stats.find(s => s.label === "Revenue")?.subValue && (
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "500", marginTop: 2 }}>
                      {stats.find(s => s.label === "Revenue")?.subValue}
                    </Text>
                  )}
                </View>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.2 }}>
                  Total Revenue
                </Text>
              </View>
            </View>
          )}

          {/* Subscription Usage */}
          <View style={{ marginBottom: 32 }}>
            <View style={{
              backgroundColor: surfaceBg,
              padding: 24,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: surfaceBorder,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Capacity Usage</Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>{(subscriptionPlan || 'trial').toUpperCase()} PLAN</Text>
                </View>
                <SubscriptionBadge />
              </View>

              <View style={{ height: 10, backgroundColor: isDark ? '#333' : '#f3f4f6', borderRadius: 5, overflow: 'hidden', marginBottom: 16 }}>
                <View style={{
                  height: '100%',
                  width: `${Math.min((parseInt(stats.find(s => s.label === "Total Students")?.value || "0") / (subscriptionPlan === 'trial' ? 50 : subscriptionPlan === 'basic' ? 500 : subscriptionPlan === 'pro' ? 1000 : 100000)) * 100, 100)}%`,
                  backgroundColor: '#FF6B00',
                  borderRadius: 5
                }} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: textMuted }}>
                  {stats.find(s => s.label === "Total Students")?.value || "0"} Students enrolled
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>
                  {subscriptionPlan === 'premium' ? 'No Limit' : `Limit: ${subscriptionPlan === 'trial' ? '50' : subscriptionPlan === 'basic' ? '500' : '1000'}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mb-10">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4 px-1">Quick Actions</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              <SubscriptionGate>
                <QuickAction icon={IconUserPlus} label="Enroll User" onPress={() => router.push("/(admin)/users/create")} badge={<SubscriptionBadge />} />
              </SubscriptionGate>
              <QuickAction icon={IconBookOpen} label="Library" onPress={() => router.navigate("/(admin)/management/library" as any)} />
              <SubscriptionGate minPlan="pro">
                <QuickAction icon={IconWallet} label="Finance" onPress={() => router.navigate("/(admin)/finance" as any)} badge={<SubscriptionBadge />} />
              </SubscriptionGate>
              <QuickAction icon={IconBarChart3} label="Analytics" onPress={() => router.navigate("/(admin)/management/analytics" as any)} />
            </View>
          </View>

          {/* Recent Users */}
          <View>
            <View className="flex-row justify-between items-end mb-5 px-1">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Recent Users</Text>
              <TouchableOpacity onPress={() => router.navigate("/(admin)/users")}>
                <Text className="text-orange-500 font-bold text-sm">View All</Text>
              </TouchableOpacity>
            </View>

            {loadingUsers ? (
              <View className="h-40 items-center justify-center">
                <ActivityIndicator color="#FF6900" />
              </View>
            ) : recentUsers.length === 0 ? (
              <View className="bg-white dark:bg-[#121212] p-8 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 items-center justify-center mb-6">
                <View className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full items-center justify-center mb-3">
                  <IconUsers size={24} color="#9ca3af" />
                </View>
                <Text className="text-gray-500 dark:text-gray-400 font-medium">No recent activity detected</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-xs mt-1 text-center">New users will appear here once they join.</Text>
              </View>
            ) : (
              <>
                {/* Mobile ScrollView */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-6 px-6" contentContainerStyle={{ paddingRight: 24 }}>
                  {recentUsers.map((user) => (
                    <View key={user.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mr-4 w-72">
                      <View className="flex-row items-center justify-between mb-4">
                        <View className={`h-10 w-10 rounded-xl items-center justify-center ${user.role === 'student' ? 'bg-orange-50 dark:bg-orange-950/30' : user.role === 'teacher' ? 'bg-purple-50 dark:bg-purple-950/30' : 'bg-blue-50 dark:bg-blue-950/30'}`}>
                          {user.role === 'student' ? <IconGraduationCap size={20} color="#FF6B00" /> :
                            user.role === 'teacher' ? <IconSchool size={20} color="#8b5cf6" /> :
                              <IconSettings size={20} color="#3b82f6" />}
                        </View>
                        <View className="bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
                          <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px]">
                            {user.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A'}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-gray-900 dark:text-white font-bold text-base mb-1" numberOfLines={1}>{user.name}</Text>
                      <Text className="text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-1">{user.role}</Text>
                      <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-mono">{user.displayId}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}