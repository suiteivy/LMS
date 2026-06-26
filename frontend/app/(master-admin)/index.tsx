import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/libs/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

/*
  Calls the master_admin backend to fetch platform-wide stats
*/

export default function MasterDashboard() {
    const { isDark } = useTheme();
    const { logout } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            let backendUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
            if (Platform.OS === 'android') {
                backendUrl = backendUrl.replace('localhost', '10.0.2.2');
            }

            const res = await fetch(`${backendUrl}/api/master-admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();
            if (res.ok) {
                setStats(data);
            } else {
                console.error("Failed to fetch platform stats:", data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-[#FFFFFF] dark:bg-navy" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="px-5 pt-3 pb-5">
                <View className="flex-row items-center gap-3">
                    <View className="mr-2">
                        <MaterialCommunityIcons name="shield-crown" size={24} color="#FF6900" />
                    </View>
                    <View>
                        <Text className="text-gray-900 dark:text-white text-2xl font-black">Platform Admin</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mt-1">Global Platform Control</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6900" colors={["#FF6900"]} />}
            >
                {/* Log out link */}
                <View className="flex-row justify-end mb-6 px-2">
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
                        className="flex-row items-center bg-white dark:bg-[#13103A] px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800"
                    >
                        <MaterialCommunityIcons name="logout" size={14} color="#ef4444" />
                        <Text style={{ marginLeft: 8, color: '#ef4444', fontWeight: 'bold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Logout</Text>
                    </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#ffffff' : '#111827', marginBottom: 16 }}>Overview</Text>

                {stats ? (
                    <View className="flex-row flex-wrap justify-between">
                        <View className="w-[48%] mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Institutions</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-black">{stats.totalInstitutions || 0}</Text>
                        </View>
                        <View className="w-[48%] mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Subscriptions</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-black">{stats.activeSubscriptions || 0}</Text>
                        </View>
                        <View className="w-[48%] mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Total Users</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-black">{stats.totalUsers || 0}</Text>
                        </View>
                        <View className="w-[48%] mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Revenue</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-black" adjustsFontSizeToFit numberOfLines={1}>
                                KES {(stats.totalRevenue || 0).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Failed to load stats.</Text>
                )}

                <View className="bg-[#F6F8FA] dark:bg-navy border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mt-4">
                    <View className="flex-row items-center mb-3">
                        <MaterialCommunityIcons name="information" size={20} color="#FF6900" style={{ marginRight: 8 }} />
                        <Text className="text-gray-900 dark:text-white font-bold text-base">Admin Privileges</Text>
                    </View>
                    <Text className="text-gray-500 dark:text-gray-400 text-sm">
                        You have full read access to all registered institutions on the platform. Manage subscriptions, dispatch app updates, and oversee global operations from the bottom tabs.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
