import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { supabase } from "@/libs/supabase";
import { router } from "expo-router";
import {
  UserPlus,
  Bell,
  Users,
  Wallet,
  LayoutGrid,
  Settings,
  ArrowRight,
  School,
  GraduationCap,
  BookOpen,
  BarChart3,
  LogOut
} from 'lucide-react-native';
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User } from "@/types/types";

interface QuickActionProps {
  icon: any;
  label: string;
  color: string;
  onPress: () => void;
}

// Cast icons to any to avoid nativewind interop issues
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

const QuickAction = ({ icon: Icon, label, color, onPress }: QuickActionProps) => (
  <TouchableOpacity
    className="w-full sm:w-[48%] lg:w-[23%] bg-white p-6 rounded-3xl border border-gray-100 shadow-sm items-center mb-4 active:bg-gray-50"
    onPress={onPress}
  >
    <View style={{ backgroundColor: `${color}15` }} className="p-3 rounded-2xl mb-2">
      <Icon size={24} color={color} />
    </View>
    <Text className="text-gray-800 font-bold text-center">{label}</Text>
  </TouchableOpacity>
);

// --- DEBUG COMPONENT ---
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

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <View className="bg-white p-6 rounded-3xl m-4 border border-red-100 shadow-lg">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-red-800 font-bold text-lg">Technical Diagnostics</Text>
        <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full">
          <Text className="text-gray-600 font-bold">✕</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-gray-50 p-4 rounded-xl space-y-2">
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500 font-medium">Status:</Text>
          <Text className="text-xs text-gray-900 font-mono">{debugInfo.status}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500 font-medium">User:</Text>
          <Text className="text-xs text-gray-900 font-mono">{debugInfo.user}</Text>
        </View>
        <View>
          <Text className="text-xs text-gray-500 font-medium mb-1">Token:</Text>
          <Text className="text-[10px] text-gray-400 font-mono" numberOfLines={2}>{debugInfo.token}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={checkSession} className="bg-red-50 p-3 rounded-xl mt-4 items-center active:bg-red-100">
        <Text className="text-red-600 text-xs font-bold uppercase tracking-wider">Refresh Session Info</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { stats, loading: statsLoading } = useDashboardStats();
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Fetch recent users for the "Recent Activity" horizontal scroll
  const fetchRecentUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from("users")
        .select(`
  *,
  students(id),
  teachers(id),
  admins(id)
    `)
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
            name: u.full_name,
            email: u.email,
            role: u.role,
            status: u.status,
            joinDate: u.created_at,
          } as User;
        });
        setRecentUsers(users);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error.message);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentUsers();
  }, [fetchRecentUsers]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
    } else {
      router.replace("/(auth)/signIn");
    }
  };

  return (
    <View className="flex-1 bg-gray-50/50">
      <StatusBar barStyle="dark-content" />

      {/* Diagnostics Modal */}
      {showDebug && (
        <View className="absolute inset-0 z-50 bg-black/20 justify-center backdrop-blur-sm p-4">
          <DebugSessionInfo onClose={() => setShowDebug(false)} />
        </View>
      )}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="p-6 pt-2">
          {/* --- 1. Header Section --- */}
          <View className="flex-row justify-between items-start mb-8">
            <View>
              <Text className="text-gray-500 text-base font-medium mb-1">Welcome back,</Text>
              <Text className="text-3xl font-bold text-gray-900 tracking-tight">
                {profile?.full_name?.split(" ")[0] || "Administrator"} 👋
              </Text>
            </View>

            <TouchableOpacity
              className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50"
              onPress={handleLogout}
            >
              <IconLogOut size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onLongPress={() => setShowDebug(true)}
            delayLongPress={2000}
            className="flex-row items-center mt-2 group mb-6"
          >
            <View className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2" />
            <Text className="text-sm text-gray-500 font-medium">School Management System</Text>
            <View className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-400 opacity-0 group-active:opacity-100">
              <Text className="text-[10px] text-gray-400">v1.0</Text>
            </View>
          </TouchableOpacity>


          {/* --- 2. Quick Status Cards --- */}
          {statsLoading ? (
            <View className="flex-row mb-8">
              <View className="flex-1 bg-gray-200 h-32 rounded-3xl animate-pulse mr-2" />
              <View className="flex-1 bg-gray-200 h-32 rounded-3xl animate-pulse ml-2" />
            </View>
          ) : (
            <View className="flex-row mb-8">
              <View className="flex-1 bg-gray-900 p-6 rounded-3xl shadow-lg shadow-gray-200 mr-2">
                <View className="bg-white/10 w-10 h-10 rounded-2xl items-center justify-center mb-4">
                  <IconUsers size={20} color="white" />
                </View>
                <Text className="text-white text-3xl font-black mb-1">
                  {stats.find(s => s.label === "Total Students")?.value || "0"}
                </Text>
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Students</Text>
              </View>

              <View className="flex-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm ml-2">
                <View className="bg-teal-50 w-10 h-10 rounded-2xl items-center justify-center mb-4">
                  <IconWallet size={20} color="#0D9488" />
                </View>
                <View>
                  <Text className="text-gray-900 text-3xl font-black mb-1">
                    {stats.find(s => s.label === "Revenue")?.value || "KES 0"}
                  </Text>
                  {stats.find(s => s.label === "Revenue")?.subValue && (
                    <Text className="text-gray-400 text-xs font-medium mb-1">
                      {stats.find(s => s.label === "Revenue")?.subValue}
                    </Text>
                  )}
                </View>
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Revenue</Text>
              </View>
            </View>
          )}

          {/* --- 3. Quick Actions Grid --- */}
          <View className="mb-10">
            <Text className="text-lg font-bold text-gray-900 mb-4 px-1">Quick Actions</Text>
            <View className="flex-row flex-wrap gap-4">
              <QuickAction
                icon={IconUserPlus}
                label="Enroll User"
                color="#3b82f6"
                onPress={() => router.push("/(admin)/users/create")}
              />
              <QuickAction
                icon={IconBookOpen}
                label="Library"
                color="#eab308"
                onPress={() => router.push("/(admin)/management/library" as any)}
              />
              <QuickAction
                icon={IconWallet}
                label="Finance"
                color="#10b981"
                onPress={() => router.push("/(admin)/finance" as any)}
              />
              <QuickAction
                icon={IconBarChart3}
                label="Analytics"
                color="#8b5cf6"
                onPress={() => router.push("/(admin)/management/analytics" as any)}
              />
            </View>
          </View>

          {/* --- 4. Recent Activity --- */}
          <View>
            <View className="flex-row justify-between items-end mb-5 px-1">
              <Text className="text-lg font-bold text-gray-900">Recent Users</Text>
              <TouchableOpacity onPress={() => router.push("/(admin)/users")}>
                <Text className="text-blue-600 font-semibold text-sm">View All</Text>
              </TouchableOpacity>
            </View>

            {loadingUsers ? (
              <View className="h-40 items-center justify-center">
                <Text className="text-gray-400">Loading users...</Text>
              </View>
            ) : recentUsers.length === 0 ? (
              <View className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 items-center justify-center mb-6">
                <View className="w-12 h-12 bg-gray-50 rounded-full items-center justify-center mb-3">
                  <IconUsers size={24} color="#9ca3af" />
                </View>
                <Text className="text-gray-500 font-medium">No recent activity detected</Text>
                <Text className="text-gray-400 text-xs mt-1 text-center">New users will appear here once they join the platform.</Text>
              </View>
            ) : (
              <>
                {/* Desktop View */}
                <View className="hidden lg:flex flex-row flex-wrap gap-4">
                  {recentUsers.map((user) => (
                    <View key={user.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex-1 min-w-[30%]">
                      <View className="flex-row items-center justify-between mb-4">
                        <View className={`h-10 w-10 rounded-2xl items-center justify-center ${user.role === 'student' ? 'bg-orange-50' :
                          user.role === 'teacher' ? 'bg-purple-50' : 'bg-blue-50'
                          }`}>
                          {user.role === 'student' ? <IconGraduationCap size={20} color="#f97316" /> :
                            user.role === 'teacher' ? <IconSchool size={20} color="#8b5cf6" /> :
                              <IconSettings size={20} color="#3b82f6" />}
                        </View>
                        <View className="bg-gray-50 px-2 py-1 rounded-lg">
                          <Text className="text-gray-400 font-medium text-[10px]">
                            {new Date(user.joinDate).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-gray-900 font-bold text-base mb-1" numberOfLines={1}>
                        {user.name}
                      </Text>
                      <Text className="text-gray-500 text-xs mb-1 font-medium">{user.role.toUpperCase()}</Text>
                      <Text className="text-gray-400 text-[10px]">{user.displayId}</Text>
                    </View>
                  ))}
                </View>

                {/* Mobile View */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-row -mx-6 px-6 lg:hidden"
                  contentContainerStyle={{ paddingRight: 24 }}
                >
                  {loadingUsers ? (
                    <Text className="text-gray-400">Loading users...</Text>
                  ) : recentUsers.map((user) => (
                    <View key={user.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mr-4 w-72">
                      <View className="flex-row items-center justify-between mb-4">
                        <View className={`h-10 w-10 rounded-2xl items-center justify-center ${user.role === 'student' ? 'bg-orange-50' :
                          user.role === 'teacher' ? 'bg-purple-50' : 'bg-blue-50'
                          }`}>
                          {user.role === 'student' ? <IconGraduationCap size={20} color="#f97316" /> :
                            user.role === 'teacher' ? <IconSchool size={20} color="#8b5cf6" /> :
                              <IconSettings size={20} color="#3b82f6" />}
                        </View>
                        <View className="bg-gray-50 px-2 py-1 rounded-lg">
                          <Text className="text-gray-400 font-medium text-[10px]">
                            {new Date(user.joinDate).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-gray-900 font-bold text-base mb-1" numberOfLines={1}>
                        {user.name}
                      </Text>
                      <Text className="text-gray-500 text-xs mb-1 font-medium">{user.role.toUpperCase()}</Text>
                      <Text className="text-gray-400 text-[10px]">{user.displayId}</Text>
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
