import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { router } from "expo-router";
import { BarChart3, BookOpen, DollarSign, GraduationCap, TrendingUp, Users } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";

const StatCard = ({ title, value, icon: Icon, color, trend, isDark }: any) => (
    <View style={{
        backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: isDark ? '#2c2c2c' : '#f3f4f6',
        flex: 1,
        minWidth: 160,
        margin: 4,
    }}>
        <View style={{ backgroundColor: `${color}20`, padding: 12, borderRadius: 16, marginBottom: 16, alignSelf: 'flex-start' }}>
            <Icon size={24} color={color} />
        </View>
        <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 13, fontWeight: '500' }} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: isDark ? '#f1f1f1' : '#111827', fontSize: 24, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {trend && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#052e16' : '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                    <TrendingUp size={12} color="#16a34a" />
                    <Text style={{ color: '#16a34a', fontSize: 11, fontWeight: 'bold', marginLeft: 4 }}>{trend}</Text>
                </View>
            )}
        </View>
    </View>
);

export default function AnalyticsScreen() {
    const { stats, loading, revenueData, refresh } = useDashboardStats();
    const { isDark } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    const iconMap: any = {
        "Total Students": GraduationCap,
        "Active Subjects": BookOpen,
        "Teachers": Users,
        "Revenue": DollarSign,
    };

    const colorMap: any = {
        "Total Students": "#3b82f6",
        "Active Subjects": "#10b981",
        "Teachers": "#8b5cf6",
        "Revenue": "#FF6B00",
    };

    const maxRevenue = Math.max(...revenueData.map(d => d.amount), 100);

    const surface = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#f3f4f6';
    const textPrimary = isDark ? '#f1f1f1' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
            <UnifiedHeader
                title="Management"
                subtitle="Analytics"
                role="Admin"
                onBack={() => router.back()}
            />
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B00"]} tintColor="#FF6B00" />
                }
            >
                <View style={{ padding: 24 }}>
                    {/* Stats Grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 24 }}>
                        {stats.map((stat, index) => (
                            <StatCard
                                key={index}
                                title={stat.label}
                                value={stat.value}
                                icon={iconMap[stat.label] || BarChart3}
                                color={colorMap[stat.label] || "#FF6B00"}
                                trend={stat.trend?.value}
                                isDark={isDark}
                            />
                        ))}
                    </View>

                    {/* Revenue Chart */}
                    <View style={{ backgroundColor: surface, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: border, marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: textPrimary }}>Revenue (Last 7 Days)</Text>
                            <View style={{ backgroundColor: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                                <Text style={{ color: '#FF6B00', fontSize: 11, fontWeight: 'bold' }}>Live Data</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 192, paddingHorizontal: 8 }}>
                            {revenueData.map((data, i) => {
                                const height = (data.amount / maxRevenue) * 100;
                                return (
                                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                                        <Text style={{ fontSize: 8, color: textSecondary, fontWeight: 'bold', marginBottom: 8 }}>${data.amount}</Text>
                                        <View style={{
                                            height: `${Math.max(height, 5)}%`,
                                            width: 32,
                                            backgroundColor: '#FF6B00',
                                            borderTopLeftRadius: 8,
                                            borderTopRightRadius: 8,
                                            opacity: 0.9,
                                        }} />
                                        <Text style={{ color: textSecondary, fontSize: 10, marginTop: 8, fontWeight: '500' }}>{data.day}</Text>
                                    </View>
                                );
                            })}
                        </View>
                        {revenueData.length === 0 && (
                            <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ color: textSecondary }}>No transaction data yet</Text>
                            </View>
                        )}
                    </View>

                    {/* System Capacity */}
                    <View style={{ backgroundColor: surface, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: border }}>
                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: textPrimary, marginBottom: 16 }}>System Capacity</Text>

                        <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ fontSize: 13, color: textSecondary, fontWeight: '500' }}>Database Usage</Text>
                                <Text style={{ fontSize: 13, color: textPrimary, fontWeight: 'bold' }}>
                                    {parseInt(stats.find(s => s.label === "Total Students")?.value || "0") > 1000 ? "Medium" : "Low"}
                                </Text>
                            </View>
                            <View style={{ height: 8, backgroundColor: isDark ? '#2c2c2c' : '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                                <View style={{
                                    height: '100%',
                                    backgroundColor: '#3b82f6',
                                    width: `${Math.min((parseInt(stats.find(s => s.label === "Total Students")?.value || "0") / 5000) * 100, 100)}%`,
                                    borderRadius: 999,
                                }} />
                            </View>
                            <Text style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>Based on student records</Text>
                        </View>

                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ fontSize: 13, color: textSecondary, fontWeight: '500' }}>Server Status</Text>
                                <Text style={{ fontSize: 13, color: '#10b981', fontWeight: 'bold' }}>Optimal</Text>
                            </View>
                            <View style={{ height: 8, backgroundColor: isDark ? '#2c2c2c' : '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                                <View style={{ height: '100%', backgroundColor: '#10b981', width: '100%', borderRadius: 999 }} />
                            </View>
                            <Text style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>All services operational</Text>
                        </View>
                    </View>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}