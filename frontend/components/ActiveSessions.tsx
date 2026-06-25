import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert, Platform } from "react-native";
import { Laptop, Smartphone, Tablet, Globe, ShieldAlert, Trash2, LogOut, MapPin, Calendar, Activity } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/services/api";

interface SessionEntry {
  id: string;
  device_type: string;
  os_name: string;
  ip_address: string;
  location: string;
  login_at: string;
  last_active_at: string;
  is_current: boolean;
}

export default function ActiveSessions() {
  const { session, logout } = useAuth();
  const { isDark } = useTheme();
  
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [revokeAllLoading, setRevokeAllLoading] = useState(false);

  const fetchSessions = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await api.get("/auth/sessions");
      setSessions(response.data || []);
    } catch (err: any) {
      console.error("Failed to load active sessions:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchSessions();
    }
  }, [session, fetchSessions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSessions(true);
  };

  const handleRevoke = async (sessionId: string, isCurrent: boolean) => {
    const performRevoke = async () => {
      setActionLoading(sessionId);
      try {
        await api.post("/auth/sessions/revoke", { id: sessionId });
        if (isCurrent) {
          // If revoking current session, log out locally
          await logout();
        } else {
          // Refresh list
          await fetchSessions(true);
        }
      } catch (err: any) {
        console.error("Failed to revoke session:", err.message);
        Alert.alert("Error", "Could not revoke session. Please try again.");
      } finally {
        setActionLoading(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        isCurrent 
          ? "Are you sure you want to log out of your current session?" 
          : "Are you sure you want to terminate this session remotely?"
      );
      if (confirm) performRevoke();
    } else {
      Alert.alert(
        "Confirm Revocation",
        isCurrent 
          ? "Are you sure you want to log out of your current session?" 
          : "Are you sure you want to terminate this session remotely?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Terminate", style: "destructive", onPress: performRevoke }
        ]
      );
    }
  };

  const handleRevokeOthers = async () => {
    const performRevokeOthers = async () => {
      setRevokeAllLoading(true);
      try {
        await api.post("/auth/sessions/revoke-others");
        await fetchSessions(true);
        if (Platform.OS === 'web') {
          window.alert("Successfully logged out of all other sessions.");
        } else {
          Alert.alert("Success", "Successfully logged out of all other sessions.");
        }
      } catch (err: any) {
        console.error("Failed to revoke other sessions:", err.message);
        Alert.alert("Error", "Could not revoke other sessions. Please try again.");
      } finally {
        setRevokeAllLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm("Are you sure you want to log out of all other devices and browser sessions?");
      if (confirm) performRevokeOthers();
    } else {
      Alert.alert(
        "Confirm Bulk Logout",
        "Are you sure you want to log out of all other devices and browser sessions?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log Out Others", style: "destructive", onPress: performRevokeOthers }
        ]
      );
    }
  };

  const getDeviceIcon = (deviceType: string, osName: string) => {
    const lowercaseType = deviceType.toLowerCase();
    const lowercaseOS = osName.toLowerCase();

    if (lowercaseOS === 'ios' || lowercaseOS === 'android') {
      if (lowercaseType.includes('ipad') || lowercaseType.includes('tablet')) {
        return <Tablet size={24} color="#8b5cf6" />;
      }
      return <Smartphone size={24} color="#ff6900" />;
    }
    
    if (lowercaseType.includes('desktop') || lowercaseType.includes('mac') || lowercaseType.includes('windows') || lowercaseType.includes('linux')) {
      return <Laptop size={24} color="#3b82f6" />;
    }

    return <Globe size={24} color="#10b981" />;
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return isoString;
    }
  };

  if (loading) {
    return (
      <View className="py-12 justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text className="text-gray-400 dark:text-gray-500 mt-2 font-medium">Retrieving active sessions...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: isDark ? '#0D1117' : '#fcfcfc' }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6900" />
      }
    >
      <View className="mb-6 flex-row justify-between items-center dark:bg-[#0D1117] bg-[#fcfcfc]">
        <View className="flex-row items-center">
          <View className="bg-orange-500 w-1.5 h-6 rounded-full mr-4 shadow-sm dark:bg-[#0D1117]" />
          <Text className="text-gray-900 dark:text-white font-black text-xl tracking-tight uppercase">
            Active Sessionss
          </Text>
        </View>
        
        {sessions.length > 1 && (
          <TouchableOpacity
            disabled={revokeAllLoading}
            onPress={handleRevokeOthers}
            className="flex-row items-center bg-red-50 dark:bg-red-950/20 px-4 py-2.5 rounded-2xl border border-red-100 dark:border-red-900/30 active:opacity-75"
          >
            {revokeAllLoading ? (
              <ActivityIndicator size="small" color="#ef4444" className="mr-2" />
            ) : (
              <LogOut size={14} color="#ef4444" className="mr-2" />
            )}
            <Text className="text-red-600 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider">
              Log out of others
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text className="text-gray-400 dark:text-gray-500 text-xs mb-6 px-1">
        You are currently logged in across the following browsers and devices. Terminate any session remotely to revoke its access immediately.
      </Text>

      {sessions.length === 0 ? (
        <View className="items-center justify-center py-12 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
          <ShieldAlert size={36} color="#9ca3af" />
          <Text className="text-gray-400 dark:text-gray-500 mt-3 font-semibold">No active sessions found</Text>
        </View>
      ) : (
        sessions.map((item) => (
          <View
            key={item.id}
            className={`p-5 rounded-3xl border mb-4 ${
              item.is_current 
                ? 'bg-orange-50/20 dark:bg-orange-950/5 border-orange-200/50 dark:border-orange-900/20' 
                : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800'
            }`}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-row flex-1 mr-4">
                <View className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 items-center justify-center mr-4 border border-gray-100 dark:border-gray-800">
                  {getDeviceIcon(item.device_type, item.os_name)}
                </View>
                
                <View className="flex-1">
                  <View className="flex-row items-center flex-wrap">
                    <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight mr-2">
                      {item.device_type}
                    </Text>
                    {item.is_current && (
                      <View className="bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                        <Text className="text-[#FF6900] text-[8px] font-black uppercase tracking-wider">Current</Text>
                      </View>
                    )}
                  </View>

                  <Text className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    OS: {item.os_name} · IP: {item.ip_address}
                  </Text>
                  
                  <View className="flex-row items-center mt-3 gap-3">
                    <View className="flex-row items-center">
                      <MapPin size={12} color="#9ca3af" className="mr-1" />
                      <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold">
                        {item.location}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Calendar size={12} color="#9ca3af" className="mr-1" />
                      <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold">
                        Logged in: {formatDate(item.login_at)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center mt-1">
                    <Activity size={12} color="#10b981" className="mr-1" />
                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold">
                      Active: {formatDate(item.last_active_at)}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                disabled={actionLoading === item.id}
                onPress={() => handleRevoke(item.id, item.is_current)}
                className={`p-3 rounded-2xl border ${
                  item.is_current
                    ? 'bg-red-50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800'
                } active:opacity-75`}
              >
                {actionLoading === item.id ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Trash2 size={16} color="#ef4444" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
