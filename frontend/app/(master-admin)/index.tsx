import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/libs/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { SettingsService } from '@/services/SettingsService';
import { DashboardStatCardSkeleton } from '@/components/ui/skeletons';
import { CacheService } from '@/services/CacheService';

/*
  Calls the master_admin backend to fetch platform-wide stats
*/

export default function MasterDashboard() {
    const { isDark } = useTheme();
    const { logout } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
    const [maintenanceMessage, setMaintenanceMessage] = useState('System maintenance is in progress. Please try again later.');
    const [maintenanceLoading, setMaintenanceLoading] = useState(false);
    const [sweepPreviewLoading, setSweepPreviewLoading] = useState(false);
    const [sweepRunLoading, setSweepRunLoading] = useState(false);
    const [sweepPreview, setSweepPreview] = useState<any>(null);

    const fetchMaintenanceMode = useCallback(async () => {
        try {
            const data = await SettingsService.getMasterMaintenanceMode();
            setMaintenanceEnabled(!!data.enabled);
            setMaintenanceMessage(data.message || 'System maintenance is in progress. Please try again later.');
        } catch (err) {
            console.error('Failed to fetch maintenance mode:', err);
        }
    }, []);

    const setMaintenanceMode = useCallback(async (enabled: boolean) => {
        try {
            setMaintenanceLoading(true);
            const response = await SettingsService.updateMasterMaintenanceMode(enabled, maintenanceMessage);
            setMaintenanceEnabled(!!response.maintenance?.enabled);
            setMaintenanceMessage(response.maintenance?.message || maintenanceMessage);
            Toast.show({
                type: 'success',
                text1: enabled ? 'Maintenance Enabled' : 'Maintenance Disabled',
                text2: enabled ? 'All institutions are now globally paused.' : 'Global access has been restored.',
            });
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Update Failed',
                text2: err?.response?.data?.error || 'Could not update maintenance mode.',
            });
        } finally {
            setMaintenanceLoading(false);
        }
    }, [maintenanceMessage]);

    const fetchStats = useCallback(async () => {
        try {
            setFetchError(null);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setFetchError('No active session. Please sign in again.');
                return;
            }

            // Hydrate from cache first if not yet loaded
            if (!stats) {
                const cached = await CacheService.get<any>('master_admin_platform_stats', { allowStale: true });
                if (cached.data) {
                    setStats(cached.data);
                    setLoading(false);
                }
            }

            let backendUrl = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_URL || "http://localhost:4001").replace(/\/api\/?$/, '');
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
                CacheService.set('master_admin_platform_stats', data, 5 * 60 * 1000);
            } else {
                console.error("Failed to fetch platform stats:", data);
                setFetchError(data?.error || 'Failed to load platform stats.');
            }
        } catch (err) {
            console.error(err);
            setFetchError('Network error while loading platform stats.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [stats]);

    const previewLifecycleSweep = useCallback(async () => {
        try {
            setSweepPreviewLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            let backendUrl = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_URL || "http://localhost:4001").replace(/\/api\/?$/, '');
            if (Platform.OS === 'android') backendUrl = backendUrl.replace('localhost', '10.0.2.2');

            const res = await fetch(`${backendUrl}/api/master-admin/subscriptions/lifecycle-sweep/preview`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                },
            });
            const data = await res.json();
            if (!res.ok) {
                Toast.show({ type: 'error', text1: 'Lifecycle Preview Failed', text2: data?.error || 'Unable to preview lifecycle sweep.' });
                return;
            }
            setSweepPreview(data);
        } catch (err) {
            console.error('previewLifecycleSweep error:', err);
            Toast.show({ type: 'error', text1: 'Lifecycle Preview Failed', text2: 'Unable to preview lifecycle sweep.' });
        } finally {
            setSweepPreviewLoading(false);
        }
    }, []);

    const runLifecycleSweep = useCallback(async () => {
        try {
            setSweepRunLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            let backendUrl = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_URL || "http://localhost:4001").replace(/\/api\/?$/, '');
            if (Platform.OS === 'android') backendUrl = backendUrl.replace('localhost', '10.0.2.2');

            const res = await fetch(`${backendUrl}/api/master-admin/subscriptions/lifecycle-sweep`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: 'application/json',
                },
            });
            const data = await res.json();
            if (!res.ok) {
                Toast.show({ type: 'error', text1: 'Lifecycle Sweep Failed', text2: data?.error || 'Unable to run lifecycle sweep.' });
                return;
            }

            Toast.show({
                type: 'success',
                text1: 'Lifecycle Sweep Complete',
                text2: `Scanned ${data?.scanned || 0}, warnings ${data?.warnings?.length || 0}, expired ${data?.changed?.length || 0}`,
            });
            await previewLifecycleSweep();
            await fetchStats();
        } catch (err) {
            console.error('runLifecycleSweep error:', err);
            Toast.show({ type: 'error', text1: 'Lifecycle Sweep Failed', text2: 'Unable to run lifecycle sweep.' });
        } finally {
            setSweepRunLoading(false);
        }
    }, [fetchStats, previewLifecycleSweep]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
    };

    useEffect(() => {
        fetchStats();
        fetchMaintenanceMode();

        const channel = supabase
            .channel('master-admin-dashboard-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchStats)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchStats, fetchMaintenanceMode]);

    return (
            <SafeAreaView className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]" edges={['top', 'left', 'right']}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, paddingTop: 14 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6900" colors={["#FF6900"]} />}
            >
                {/* Top actions */}
                <View className="flex-row justify-end mb-6 px-2" style={{ gap: 8, marginTop: 2 }}>
                    <TouchableOpacity
                        onPress={onRefresh}
                        disabled={refreshing || loading}
                        className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-4 py-2 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]"
                        activeOpacity={0.7}
                        style={{ opacity: (refreshing || loading) ? 0.6 : 1 }}
                    >
                        {refreshing ? (
                            <ActivityIndicator size="small" color="#FF6900" />
                        ) : (
                            <MaterialCommunityIcons name="refresh" size={14} color="#FF6900" />
                        )}
                        <Text style={{ marginLeft: 8, color: '#FF6900', fontWeight: 'bold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Refresh</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={async () => {
                            await logout();
                            router.replace("/(auth)/signIn");
                        }}
                        className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-4 py-2 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]"
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="logout" size={14} color="#ef4444" />
                        <Text style={{ marginLeft: 8, color: '#ef4444', fontWeight: 'bold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Logout</Text>
                    </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#ffffff' : '#111827', marginBottom: 16 }}>Overview</Text>

                <View className="bg-[#F6F8FA] dark:bg-[#0F141C] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mb-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center">
                            <MaterialCommunityIcons name="tools" size={20} color="#FF6900" style={{ marginRight: 8 }} />
                            <Text className="text-gray-900 dark:text-white font-bold text-base">Global Maintenance</Text>
                        </View>
                        <View className="px-2 py-1 rounded-full" style={{ backgroundColor: maintenanceEnabled ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }}>
                            <Text style={{ color: maintenanceEnabled ? '#ef4444' : '#22c55e', fontSize: 11, fontWeight: '700' }}>
                                {maintenanceEnabled ? 'ENABLED' : 'DISABLED'}
                            </Text>
                        </View>
                    </View>
                    <Text className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                        Platform-wide maintenance.
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                        Message: {maintenanceMessage}
                    </Text>
                    <View className="flex-row" style={{ gap: 10 }}>
                        <TouchableOpacity
                            disabled={maintenanceLoading || maintenanceEnabled}
                            onPress={() => setMaintenanceMode(true)}
                            className="flex-1 rounded-xl px-3 py-3 items-center"
                            style={{
                                backgroundColor: (maintenanceLoading || maintenanceEnabled) ? 'rgba(239,68,68,0.2)' : '#ef4444',
                                opacity: (maintenanceLoading || maintenanceEnabled) ? 0.6 : 1,
                            }}
                        >
                            <Text className="text-white font-bold text-xs uppercase tracking-widest">Disable All</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            disabled={maintenanceLoading || !maintenanceEnabled}
                            onPress={() => setMaintenanceMode(false)}
                            className="flex-1 rounded-xl px-3 py-3 items-center"
                            style={{
                                backgroundColor: (maintenanceLoading || !maintenanceEnabled) ? 'rgba(34,197,94,0.2)' : '#22c55e',
                                opacity: (maintenanceLoading || !maintenanceEnabled) ? 0.6 : 1,
                            }}
                        >
                            <Text className="text-white font-bold text-xs uppercase tracking-widest">Enable All</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="bg-[#F6F8FA] dark:bg-[#0F141C] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mb-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center">
                            <MaterialCommunityIcons name="calendar-clock" size={20} color="#FF6900" style={{ marginRight: 8 }} />
                            <Text className="text-gray-900 dark:text-white font-bold text-base">Subscription Lifecycle Sweep</Text>
                        </View>
                    </View>

                    <Text className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                        Preview unpaid non-beta institutions near expiry, then run sweep to send alerts and auto-expire when overdue.
                    </Text>

                    <View className="flex-row" style={{ gap: 10 }}>
                        <TouchableOpacity
                            disabled={sweepPreviewLoading || sweepRunLoading}
                            onPress={previewLifecycleSweep}
                            className="flex-1 rounded-xl px-3 py-3 items-center"
                            style={{
                                backgroundColor: (sweepPreviewLoading || sweepRunLoading) ? 'rgba(255,105,0,0.2)' : '#FF6900',
                                opacity: (sweepPreviewLoading || sweepRunLoading) ? 0.6 : 1,
                            }}
                        >
                            <Text className="text-white font-bold text-xs uppercase tracking-widest">{sweepPreviewLoading ? 'Loading…' : 'Preview'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            disabled={sweepRunLoading || sweepPreviewLoading}
                            onPress={runLifecycleSweep}
                            className="flex-1 rounded-xl px-3 py-3 items-center"
                            style={{
                                backgroundColor: (sweepRunLoading || sweepPreviewLoading) ? 'rgba(34,197,94,0.2)' : '#22c55e',
                                opacity: (sweepRunLoading || sweepPreviewLoading) ? 0.6 : 1,
                            }}
                        >
                            <Text className="text-white font-bold text-xs uppercase tracking-widest">{sweepRunLoading ? 'Running…' : 'Run Sweep'}</Text>
                        </TouchableOpacity>
                    </View>

                    {sweepPreview ? (
                        <View style={{ marginTop: 10 }}>
                            <Text className="text-gray-500 dark:text-gray-400 text-xs">Scanned: {sweepPreview.scanned || 0}</Text>
                            <Text className="text-gray-500 dark:text-gray-400 text-xs">Warnings: {sweepPreview.warnings_count || 0}</Text>
                            <Text className="text-gray-500 dark:text-gray-400 text-xs">To Expire: {sweepPreview.expire_count || 0}</Text>
                        </View>
                    ) : null}
                </View>

                {loading && !stats ? (
                    <View className="mt-2">
                        <DashboardStatCardSkeleton loading={loading} count={8} label="Fetching live platform stats..." />
                    </View>
                ) : stats ? (
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
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Open Support</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-black">{stats.openSupportTickets || 0}</Text>
                        </View>
                        <View className="w-[48%] mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Students</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-black">{stats.totalStudents || 0}</Text>
                        </View>
                        <View className="w-[48%] mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Teachers</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-black">{stats.totalTeachers || 0}</Text>
                        </View>
                        <View className="w-[48%] mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Admins</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-black">{stats.totalAdmins || 0}</Text>
                        </View>
                        <View className="w-[48%] mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Master Admins</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-black">{stats.totalMasterAdmins || 0}</Text>
                        </View>
                    </View>
                ) : (
                    <View className="bg-[#F6F8FA] dark:bg-[#0F141C] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mt-2">
                        <Text className="text-gray-900 dark:text-white font-bold text-base mb-1">Unable to load stats</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-sm">{fetchError || 'Something went wrong while loading dashboard data.'}</Text>
                        <TouchableOpacity
                            onPress={onRefresh}
                            className="mt-4 bg-[#FF6900] px-4 py-3 rounded-lg items-center"
                        >
                            <Text className="text-white font-bold text-xs uppercase tracking-widest">Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View className="bg-[#F6F8FA] dark:bg-[#0F141C] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mt-2">
                    <View className="flex-row items-center mb-3">
                        <MaterialCommunityIcons name="office-building-outline" size={20} color="#FF6900" style={{ marginRight: 8 }} />
                        <Text className="text-gray-900 dark:text-white font-bold text-base">Recently Enrolled Institutions</Text>
                    </View>
                    {(stats?.recentInstitutions || []).length > 0 ? (
                        (stats.recentInstitutions as any[]).map((inst) => (
                            <View key={inst.id} className="py-2 border-b border-[#D0D7DE] dark:border-[#21262D]">
                                <Text className="text-gray-900 dark:text-white font-semibold">{inst.name}</Text>
                                <Text className="text-gray-500 dark:text-gray-400 text-xs">
                                    {inst.subscription_plan || 'trial'}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text className="text-gray-500 dark:text-gray-400 text-sm">No recent institutions available.</Text>
                    )}
                </View>

                <View className="bg-[#F6F8FA] dark:bg-[#0F141C] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mt-4">
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
