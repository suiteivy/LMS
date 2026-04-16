import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/libs/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

/*
  Calls the master_admin backend to fetch platform-wide stats
*/

export default function MasterDashboard() {
    const { isDark } = useTheme();
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

    useEffect(() => {
        fetchStats();
    }, []);

    const themeColors = {
        bg: isDark ? '#0F0B2E' : '#f8fafc',
        card: isDark ? '#13103A' : '#ffffff',
        text: isDark ? '#ffffff' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
        primary: '#FF6B00'
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        );
    }

    const StatCard = ({ title, value, icon, color = themeColors.primary }: any) => (
        <View style={{
            backgroundColor: themeColors.card,
            padding: 20,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: themeColors.border,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 8, color: 'rgba(0, 0, 0, 0.1)' }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 2
        }}>
            <View style={{
                width: 48, height: 48, borderRadius: 12, backgroundColor: `${color}15`,
                alignItems: 'center', justifyContent: 'center', marginRight: 16
            }}>
                <MaterialCommunityIcons name={icon} size={24} color={color} />
            </View>
            <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: themeColors.subtext, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: themeColors.text }}>{value}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ backgroundColor: `${themeColors.primary}20`, padding: 8, borderRadius: 10 }}>
                        <MaterialCommunityIcons name="shield-crown" size={24} color={themeColors.primary} />
                    </View>
                    <View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: themeColors.text }}>Platform Admin</Text>
                        <Text style={{ fontSize: 14, color: themeColors.subtext, marginTop: 2 }}>Global Platform Control</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
            >
                <Text style={{ fontSize: 18, fontWeight: '700', color: themeColors.text, marginBottom: 16 }}>Overview</Text>

                {stats ? (
                    <>
                        <StatCard
                            title="Registered Institutions"
                            value={stats.totalInstitutions || 0}
                            icon="domain"
                            color="#3b82f6"
                        />
                        <StatCard
                            title="Active Subscriptions"
                            value={stats.activeSubscriptions || 0}
                            icon="check-decagram"
                            color="#10b981"
                        />
                        <StatCard
                            title="Total Users"
                            value={stats.totalUsers || 0}
                            icon="account-group"
                            color="#8b5cf6"
                        />
                        <StatCard
                            title="Platform Revenue (Recorded)"
                            value={`KES ${(stats.totalRevenue || 0).toLocaleString()}`}
                            icon="currency-usd"
                            color={themeColors.primary}
                        />
                    </>
                ) : (
                    <Text style={{ color: themeColors.subtext }}>Failed to load stats.</Text>
                )}

                <View style={{ marginTop: 24, backgroundColor: themeColors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: themeColors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <MaterialCommunityIcons name="information" size={24} color={themeColors.primary} style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text }}>Master Platform Admin Privileges</Text>
                    </View>
                    <Text style={{ color: themeColors.subtext, lineHeight: 22 }}>
                        You have full read access to all registered institutions on the platform. Manage subscriptions, dispatch app updates, and oversee global operations from the bottom tabs.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
