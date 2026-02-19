import { useAuth } from "@/contexts/AuthContext";
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
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    style={{
      width: "48%",
      backgroundColor: "white",
      padding: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "#f3f4f6",
      marginBottom: 16,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2
    }}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={{ backgroundColor: "#fff7ed", padding: 12, borderRadius: 16, marginBottom: 8 }}>
      <Icon size={24} color="#f97316" />
    </View>
    <Text style={{ color: "#111827", fontWeight: "700", fontSize: 13, textAlign: "center" }}>{label}</Text>
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
    <View style={{ backgroundColor: "white", padding: 24, borderRadius: 24, margin: 16, borderWidth: 1, borderColor: "#fee2e2", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text style={{ color: "#991b1b", fontWeight: "700", fontSize: 18 }}>Technical Diagnostics</Text>
        <TouchableOpacity onPress={onClose} style={{ backgroundColor: "#f3f4f6", padding: 8, borderRadius: 999 }}>
          <Text style={{ color: "#4b5563", fontWeight: "700" }}>✕</Text>
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

      <TouchableOpacity 
        onPress={checkSession} 
        style={{ backgroundColor: "#fef2f2", padding: 12, borderRadius: 12, marginTop: 16, alignItems: "center" }}
        activeOpacity={0.6}
      >
        <Text style={{ color: "#dc2626", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>Refresh Session Info</Text>
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


  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <StatusBar barStyle="dark-content" />

      {/* Diagnostics Modal */}
      {showDebug && (
        <View className="absolute inset-0 z-50 bg-black/40 justify-center p-4">
          <DebugSessionInfo onClose={() => setShowDebug(false)} />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, padding: 24, paddingTop: 8 }}
      >
        <View>
          {/* --- 1. Header Section --- */}
          <View className="mb-2 flex-row justify-between">
            <View>
              <Text className="text-gray-500 text-base font-medium mb-1">Welcome back,</Text>
              <Text className="text-3xl font-bold text-gray-900 tracking-tight">
                {profile?.full_name?.split(" ")[0] || "Administrator"} 👋
              </Text>
            </View>
            <View className="flex-row items-center mt-2 group mb-2">
              <View className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2" />
              <Text className="text-sm text-gray-500 font-medium">School Management System</Text>
            </View>
          </View>

          <TouchableOpacity
            onLongPress={() => setShowDebug(true)}
            delayLongPress={2000}
            className="flex-row items-center mt-2 group mb-6"
          >

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
            <View className="flex-row mb-10">
              <View style={{ flex: 1, backgroundColor: "#111827", padding: 20, borderRadius: 24, marginRight: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8, minHeight: 140, justifyContent: 'space-between' }}>
                <View>
                  <View style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <IconUsers size={22} color="white" />
                  </View>
                  <Text style={{ color: "white", fontSize: 26, fontWeight: "900", letterSpacing: -0.5 }}>
                    {stats.find(s => s.label === "Total Students")?.value || "0"}
                  </Text>
                </View>
                <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2 }}>Total Students</Text>
              </View>

              <View style={{ flex: 1, backgroundColor: "#f97316", padding: 20, borderRadius: 24, marginLeft: 6, shadowColor: "#f97316", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 12, minHeight: 140, justifyContent: 'space-between' }}>
                <View>
                  <View style={{ backgroundColor: "rgba(255, 255, 255, 0.2)", width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <IconWallet size={22} color="white" />
                  </View>
                  <View>
                    <Text
                      style={{ color: "white", fontSize: 22, fontWeight: "900", letterSpacing: -1 }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {stats.find(s => s.label === "Revenue")?.value || "KES 0"}
                    </Text>
                    {stats.find(s => s.label === "Revenue")?.subValue && (
                      <Text style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 12, fontWeight: "600", marginTop: 2 }}>
                        {stats.find(s => s.label === "Revenue")?.subValue}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2 }}>Total Revenue</Text>
              </View>
            </View>
          )
          }

          {/* --- 3. Quick Actions Grid --- */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16, paddingHorizontal: 4 }}>Quick Actions</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              <QuickAction
                icon={IconUserPlus}
                label="Enroll User"
                color="#f97316"
                onPress={() => router.push("/(admin)/users/create")}
              />
              <QuickAction
                icon={IconBookOpen}
                label="Library"
                color="#f97316"
                onPress={() => router.navigate("/(admin)/management/library" as any)}
              />
              <QuickAction
                icon={IconWallet}
                label="Finance"
                color="#f97316"
                onPress={() => router.navigate("/(admin)/finance" as any)}
              />
              <QuickAction
                icon={IconBarChart3}
                label="Analytics"
                color="#f97316"
                onPress={() => router.navigate("/(admin)/management/analytics" as any)}
              />
            </View>
          </View>

          {/* --- 4. Recent Activity --- */}
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Recent Users</Text>
              <TouchableOpacity onPress={() => router.navigate("/(admin)/users")}>
                <Text style={{ color: "#f97316", fontWeight: "600", fontSize: 14 }}>View All</Text>
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
                    <View key={user.id} style={{ backgroundColor: "white", padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#f3f4f6", flex: 1, minWidth: "30%" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <View style={{ height: 40, width: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: user.role === 'student' ? '#fff7ed' : user.role === 'teacher' ? '#f3e8ff' : '#eff6ff' }}>
                          {user.role === 'student' ? <IconGraduationCap size={20} color="#f97316" /> :
                            user.role === 'teacher' ? <IconSchool size={20} color="#8b5cf6" /> :
                              <IconSettings size={20} color="#3b82f6" />}
                        </View>
                        <View style={{ backgroundColor: "#f9fafb", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ color: "#9ca3af", fontWeight: "500", fontSize: 10 }}>
                            {new Date(user.joinDate).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: "#111827", fontWeight: "700", fontSize: 16, marginBottom: 4 }} numberOfLines={1}>
                        {user.name}
                      </Text>
                      <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 4, fontWeight: "500" }}>{user.role.toUpperCase()}</Text>
                      <Text style={{ color: "#9ca3af", fontSize: 10 }}>{user.displayId}</Text>
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
                    <View key={user.id} style={{ backgroundColor: "white", padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#f3f4f6", marginRight: 16, width: 288 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <View style={{ height: 40, width: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: user.role === 'student' ? '#fff7ed' : user.role === 'teacher' ? '#f3e8ff' : '#eff6ff' }}>
                          {user.role === 'student' ? <IconGraduationCap size={20} color="#f97316" /> :
                            user.role === 'teacher' ? <IconSchool size={20} color="#8b5cf6" /> :
                              <IconSettings size={20} color="#3b82f6" />}
                        </View>
                        <View style={{ backgroundColor: "#f9fafb", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ color: "#9ca3af", fontWeight: "500", fontSize: 10 }}>
                            {new Date(user.joinDate).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: "#111827", fontWeight: "700", fontSize: 16, marginBottom: 4 }} numberOfLines={1}>
                        {user.name}
                      </Text>
                      <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 4, fontWeight: "500" }}>{user.role.toUpperCase()}</Text>
                      <Text style={{ color: "#9ca3af", fontSize: 10 }}>{user.displayId}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </ScrollView >
    </View >
  );
}
