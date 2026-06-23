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
  ClipboardList,
  GraduationCap,
  LayoutGrid,
  LogOut,
  School,
  Settings,
  UserPlus,
  Users,
  Wallet,
  RefreshCw,
  Calendar
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, StatusBar, DimensionValue } from "react-native";
import { SubscriptionBanner, SubscriptionGate, OnboardingTracker, SubscriptionBadge, AddonRequestModal, AddonRequestButton } from "@/components/shared/SubscriptionComponents";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

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
const IconCalendar = Calendar as any;
const IconClipboardList = ClipboardList as any;
const IconRefreshCw = RefreshCw as any;

const QuickAction = ({ icon: Icon, label, onPress, badge }: QuickActionProps) => {
  const { isDark } = useTheme();
  return (
    <TouchableOpacity
      className="bg-white dark:bg-[#1a1a1a] py-3 px-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex-row items-center active:opacity-70"
      style={{
        boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 3, color: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)' }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.3 : 0.04,
        shadowRadius: 3,
        elevation: 1,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded-xl mr-3">
        <Icon size={16} color="#FF6B00" />
      </View>
      <Text className="text-gray-900 dark:text-gray-200 font-bold text-xs">{label}</Text>
      {badge}
    </TouchableOpacity>
  );
};

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
    logout
  } = useAuth();
  const { stats, loading: statsLoading, refresh: refreshStats } = useDashboardStats();
  const { isDark } = useTheme();
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [refreshingOverview, setRefreshingOverview] = useState(false);

  const fetchRecentUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);

      if (!profile?.institution_id) {
        setRecentUsers([]);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(`*, students(id), teachers(id), admins(id)`)
        .eq("institution_id", profile.institution_id)   // ← scope to this institution only
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
            name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown User',
            first_name: u.first_name || '',
            last_name: u.last_name || '',
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
  }, [profile?.institution_id]);

  useEffect(() => {
    if (profile) {
      fetchRecentUsers();
    }
  }, [fetchRecentUsers, profile]);

  const handleRefreshOverview = useCallback(async () => {
    setRefreshingOverview(true);
    try {
      await Promise.all([refreshStats(), fetchRecentUsers()]);
    } finally {
      setRefreshingOverview(false);
    }
  }, [refreshStats, fetchRecentUsers]);

  // Theme-aware color tokens
  const cardBg = isDark ? '#0F0B2E' : '#111827';
  const surfaceBg = isDark ? '#13103A' : '#ffffff';
  const surfaceBorder = isDark ? '#1A1650' : '#f3f4f6';
  const textPrimary = isDark ? '#f9fafb' : '#111827';
  const textMuted = isDark ? '#6b7280' : '#6b7280';

  const tier = useSubscriptionTier();

  // Create a comma-separated list of active add-ons/features
  const activeFeatures = [
    tier.showFinancials && tier.hasFinance && 'Finance',
    tier.hasLibrary && 'Library',
    tier.hasAnalytics && 'Analytics',
    tier.hasMessaging && 'Messaging',
    tier.showFinancials && tier.hasBursary && 'Bursary',
    tier.hasDiary && 'Diary',
  ].filter(Boolean).join(', ');

  return (
    <View className="flex-1 bg-white dark:bg-navy">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <UnifiedHeader
        title="Welcome back,"
        subtitle={profile?.full_name || "Administrator"}
        role="Admin"
        showNotification={true}
        showMainBadge={isMain}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, padding: 24, paddingTop: 10 }}
      >
        <View>
          {/* Log out link */}
          <View className="flex-row justify-end mb-6 px-2" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={handleRefreshOverview}
              disabled={refreshingOverview}
              style={{
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 1,
                  blurRadius: 2,
                  color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.05)',
                }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.4 : 0.05,
                shadowRadius: 2,
                elevation: 1,
                opacity: refreshingOverview ? 0.7 : 1,
              }}
              className="flex-row items-center bg-white dark:bg-[#1a1a2e] px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800"
            >
              {refreshingOverview ? (
                <ActivityIndicator size="small" color="#FF6B00" />
              ) : (
                <IconRefreshCw size={14} color="#FF6B00" />
              )}
              <Text className="ml-2 text-orange-500 font-bold text-[10px] uppercase tracking-widest">Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                await logout();
                router.replace("/(auth)/signIn");
              }}
              style={{
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 1,
                  blurRadius: 2,
                  color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.05)',
                }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.4 : 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
              className="flex-row items-center bg-white dark:bg-[#1a1a2e] px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800"
            >
              <IconLogOut size={14} color="#ef4444" />
              <Text className="ml-2 text-red-600 font-bold text-[10px] uppercase tracking-widest">Logout</Text>
            </TouchableOpacity>
          </View>
          <OnboardingTracker stats={stats} />

          <View className="flex-row mb-10">
            <View style={{
              flex: 1, backgroundColor: cardBg,
              padding: 20, borderRadius: 24, 
              marginRight: tier.showFinancials ? 6 : 0,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              boxShadow: [{
                offsetX: 0,
                offsetY: 8,
                blurRadius: 10,
                color: 'rgba(0, 0, 0, 0.15)',
              }],
              elevation: 8,
              minHeight: 140,
              justifyContent: 'space-between',
              borderWidth: isDark ? 1 : 0,
              borderColor: '#1f2937',
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

            {tier.showFinancials && (
              <View style={{
                flex: 1, backgroundColor: "#FF6B00",
                padding: 20, borderRadius: 24, marginLeft: 6,
                shadowColor: "#FF6B00",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 8,
                  blurRadius: 10,
                  color: 'rgba(255, 107, 0, 0.25)',
                }],
                elevation: 12,
                minHeight: 140,
                justifyContent: 'space-between',
              }}>
                <View>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.2)", width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <IconWallet size={22} color="white" />
                  </View>
                  <Text style={{ color: "white", fontSize: 22, fontWeight: "700", letterSpacing: -1 }} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.find(s => s.label === "Revenue")?.value || "KES 0"}
                  </Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.2 }}>
                  Total Revenue
                </Text>
              </View>
            )}
          </View>



          {/* Institution Capacity */}
          <SubscriptionGate minPlan="basic">
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
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 4,
                  blurRadius: 10,
                  color: 'rgba(0, 0, 0, 0.05)',
                }],
                elevation: 2
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Institution Capacity</Text>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#FF6B00', textTransform: 'uppercase', letterSpacing: 1 }}>{subscriptionPlan === 'trial' ? 'Trial Limit' : 'Scale Usage'}</Text>
                  </View>
                </View>

                <View style={{ height: 12, backgroundColor: isDark ? '#1A1650' : '#f3f4f6', borderRadius: 6, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: surfaceBorder }}>
                  <View style={{
                    height: '100%',
                    width: `${Math.min((parseInt(stats.find(s => s.label === "Total Students")?.value || "0") / (subscriptionPlan === 'trial' ? 50 : subscriptionPlan === 'basic' ? 500 : subscriptionPlan === 'pro' ? 1000 : 100000)) * 100, 100)}%`,
                    backgroundColor: '#FF6B00',
                    borderRadius: 6
                  }} />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textMuted }}>
                    {stats.find(s => s.label === "Total Students")?.value || "0"} Students enrolled
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>
                    {subscriptionPlan === 'premium' || subscriptionPlan === 'custom' ? 'Unlimited' : `Limit: ${subscriptionPlan === 'trial' ? '50' : subscriptionPlan === 'basic' ? '500' : '1000'}`}
                  </Text>
                </View>
              </View>
            </View>
          </SubscriptionGate>

          {/* Today's Presence (Attendance Rate) */}
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
              boxShadow: [{
                offsetX: 0,
                offsetY: 4,
                blurRadius: 10,
                color: 'rgba(0, 0, 0, 0.05)',
              }],
              elevation: 2
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary, letterSpacing: -0.5 }}>Today&apos;s Presence</Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 1 }}>Real-time Engagement</Text>
                </View>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#8b5cf6' }}>
                  {stats.find(s => s.label === "Attendance")?.value || "0%"}
                </Text>
              </View>

              <View style={{ height: 12, backgroundColor: isDark ? '#1A1650' : '#f3f4f6', borderRadius: 6, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: surfaceBorder }}>
                <View style={{
                  height: '100%',
                  width: (stats.find(s => s.label === "Attendance")?.value || "0%") as DimensionValue,
                  backgroundColor: '#8b5cf6',
                  borderRadius: 6
                }} />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: textMuted }}>
                {stats.find(s => s.label === "Attendance")?.subValue || "No data recorded today"}
              </Text>
            </View>
          </View>

          <View className="mb-10">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4 px-1">Quick Actions</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
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
              <View className="bg-white dark:bg-[#0F0B2E] p-8 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 items-center justify-center mb-6">
                <View className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full items-center justify-center mb-3">
                  <IconUsers size={24} color="#9ca3af" />
                </View>
                <Text className="text-gray-500 dark:text-gray-400 font-medium">No recent activity detected</Text>
              </View>
            ) : (
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
            )}
          </View>
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
