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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User } from "@/types/types";

// Define Interface for the QuickAction props
interface QuickActionProps {
  icon: any;
  label: string;
  color: string;
  onPress: () => void;
}

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
const DebugSessionInfo = () => {
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
    <View>
      <Text className="text-xs text-red-700 font-mono">Status: {debugInfo.status}</Text>
      <Text className="text-xs text-red-700 font-mono">User: {debugInfo.user}</Text>
      <Text className="text-xs text-red-700 font-mono">Token: {debugInfo.token}</Text>
      <TouchableOpacity onPress={checkSession} className="bg-red-100 p-2 rounded mt-2 items-center">
        <Text className="text-red-800 text-xs font-bold">Refresh Session Info</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { stats, loading: statsLoading } = useDashboardStats();
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

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
    <>
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="p-4 md:p-8">
            {/* --- 1. Header Section --- */}
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-gray-500 text-base font-medium">Welcome back,</Text>
                <Text className="text-3xl font-bold text-gray-900">Administrator 👋</Text>
                <Text className="text-sm text-gray-500 font-medium pt-1">School Management System</Text>
              </View>

              <TouchableOpacity
                className="relative p-2 bg-white rounded-full border border-gray-100 shadow-sm active:opacity-70"
                onPress={handleLogout}
              >
                <LogOut size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* --- DEBUG SECTION --- */}
            <View className="bg-red-50 p-4 rounded-xl border border-red-200 mb-6">
              <Text className="text-red-800 font-bold mb-2">Technical Diagnostics</Text>
              <DebugSessionInfo />
            </View>


            {/* --- 2. Quick Status Cards --- */}
            <View className="flex-row gap-4 mb-8">
              {statsLoading ? (
                <View className="flex-1 bg-gray-200 h-24 rounded-3xl animate-pulse" />
              ) : (
                <>
                  <View className="flex-1 bg-gray-900 p-5 rounded-3xl shadow-sm">
                    <Users size={20} color="white" />
                    <Text className="text-white text-2xl font-black mt-2">
                      {stats.find(s => s.label === "Total Students")?.value || "0"}
                    </Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">Total Students</Text>
                  </View>
                  <View className="flex-1 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <Wallet size={20} color="#0D9488" />
                    <Text className="text-gray-900 text-2xl font-black mt-2">
                      {stats.find(s => s.label === "Revenue")?.value || "$0"}
                    </Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">Total Revenue</Text>
                  </View>
                </>
              )}
            </View>

            {/* --- 3. Recent Activity (Horizontal Scroll) --- */}
            <View className="flex-row justify-between items-end mb-4 ">
              <Text className="text-xl font-bold text-gray-900">Recent Users</Text>
              <TouchableOpacity onPress={() => router.push("/(admin)/users")}>
                <Text className="text-orange-500 font-semibold">View All</Text>
              </TouchableOpacity>
            </View>

            <View className="hidden lg:flex flex-row flex-wrap gap-4 mb-6">
              {loadingUsers ? (
                <Text className="text-gray-400">Loading users...</Text>
              ) : recentUsers.map((user) => (
                <View key={user.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm w-[31%]">
                  <View className="flex-row items-center mb-3">
                    <View className={`p - 2 rounded - xl mr - 3 ${user.role === 'student' ? 'bg-orange-100' :
                      user.role === 'teacher' ? 'bg-purple-100' : 'bg-blue-100'
                      } `}>
                      {user.role === 'student' ? <GraduationCap size={20} color="#f97316" /> :
                        user.role === 'teacher' ? <School size={20} color="#8b5cf6" /> :
                          <Settings size={20} color="#3b82f6" />}
                    </View>
                    <Text className="text-gray-400 font-bold text-[10px] uppercase">
                      {user.role} • {new Date(user.joinDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-gray-900 font-bold text-lg mb-1" numberOfLines={1}>
                    {user.name}
                  </Text>
                  <Text className="text-gray-500 text-sm">{user.displayId}</Text>
                </View>
              ))}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row mb-6 -mx-4 px-4 pb-4 lg:hidden"
            >
              {loadingUsers ? (
                <Text className="ml-4 text-gray-400">Loading users...</Text>
              ) : recentUsers.map((user) => (
                <View key={user.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mr-4 w-64">
                  <View className="flex-row items-center mb-3">
                    <View className={`p - 2 rounded - xl mr - 3 ${user.role === 'student' ? 'bg-orange-100' :
                      user.role === 'teacher' ? 'bg-purple-100' : 'bg-blue-100'
                      } `}>
                      {user.role === 'student' ? <GraduationCap size={20} color="#f97316" /> :
                        user.role === 'teacher' ? <School size={20} color="#8b5cf6" /> :
                          <Settings size={20} color="#3b82f6" />}
                    </View>
                    <Text className="text-gray-400 font-bold text-[10px] uppercase">
                      {user.role} • {new Date(user.joinDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-gray-900 font-bold text-lg mb-1" numberOfLines={1}>
                    {user.name}
                  </Text>
                  <Text className="text-gray-500 text-sm">{user.displayId}</Text>
                </View>
              ))}
            </ScrollView>

            {/* --- 4. Quick Actions Grid --- */}
            <View className="mt-2">
              <Text className="text-xl font-bold text-gray-900 mb-4">Quick Actions</Text>
              <View className="flex-row flex-wrap justify-between">
                <QuickAction
                  icon={UserPlus}
                  label="Enroll User"
                  color="#3b82f6"
                  onPress={() => router.push("/(admin)/users/create")}
                />
                <QuickAction
                  icon={BookOpen}
                  label="Library Inventory"
                  color="#eab308"
                  onPress={() => router.push("/(admin)/management/library" as any)}
                />
                <QuickAction
                  icon={Wallet}
                  label="Process Payouts"
                  color="#10b981"
                  onPress={() => router.push("/(admin)/finance" as any)}
                />
                <QuickAction
                  icon={BarChart3}
                  label="System Analytics"
                  color="#8b5cf6"
                  onPress={() => router.push("/(admin)/management/analytics" as any)}
                />
              </View>
            </View>

          </View>
        </ScrollView>
      </View>
    </>
  );
}
