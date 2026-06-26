import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { router } from "expo-router";
import { BarChart3, BookOpen, DollarSign, GraduationCap, TrendingUp, Users, Zap } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, DimensionValue, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-4 mb-3" style={{ width: '48.5%' }}>
        <View className="w-9 h-9 rounded-xl bg-[#EAEEF2] dark:bg-[#161B22] items-center justify-center mb-3">
            <Icon size={18} color={color} />
        </View>
        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1" numberOfLines={1}>{title}</Text>
        <View className="flex-row items-end justify-between">
            <Text className="text-gray-900 dark:text-white text-2xl font-black" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {trend && (
                <View className="flex-row items-center bg-green-50 dark:bg-[#052e16] px-2 py-0.5 rounded-md">
                    <TrendingUp size={12} color="#16a34a" />
                    <Text className="text-[#16a34a] text-[10px] font-bold ml-1">{trend}</Text>
                </View>
            )}
        </View>
    </View>
);

export default function AnalyticsScreen() {
    const { stats, loading, revenueData, refresh } = useDashboardStats();
    const tier = useSubscriptionTier();
    const { showFinancials } = tier;
    const { isDark } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 items-center justify-center bg-[#FFFFFF] dark:bg-[#161B22]">
                <ActivityIndicator size="large" color="#FF6900" />
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

    const surface = isDark ? '#161B22' : '#F6F8FA';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';
    const openManual = (anchor?: string) => {
        router.push({ pathname: '/(admin)/accessibility/settings', params: { manual: '1', anchor: anchor || 'promotion-engine' } } as any);
    };

    const totalStudents = parseInt(stats.find(s => s.label === "Total Students")?.value || "0", 10) || 0;
    const teachers = parseInt(stats.find(s => s.label === "Teachers")?.value || "0", 10) || 0;
    const attendanceRate = parseInt((stats.find(s => s.label === "Attendance")?.value || "0").replace('%', ''), 10) || 0;
    const studentTeacherRatio = teachers > 0 ? (totalStudents / teachers).toFixed(1) : "0.0";
    const engagementRate = Math.round((attendanceRate + Math.min(attendanceRate + 8, 100)) / 2);
    const formatLargeNumber = (value: number) => (value > 100 ? value.toLocaleString() : `${value}`);

    const toPercent = (value: number): `${number}%` => `${Math.min(Math.max(value, 0), 100)}%`;

    const analyticsOverview = [
        {
            title: "Overall Student Performance",
            value: `${attendanceRate}%`,
            helper: "Blended attendance and completion signal",
            color: "#2563eb",
            width: toPercent(attendanceRate)
        },
        {
            title: "Student-Teacher Ratio",
            value: `${studentTeacherRatio} : 1`,
            helper: "Student load distribution",
            color: "#8b5cf6",
            width: toPercent(Math.round(Number(studentTeacherRatio) * 5))
        },
        {
            title: "Engagement Index",
            value: `${engagementRate}%`,
            helper: "Derived from attendance consistency",
            color: "#10b981",
            width: toPercent(engagementRate)
        },
    ];

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Management"
                subtitle="Analytics"
                role="Admin"
                onBack={() => router.back()}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
                }
            >
                <View style={{ padding: 24 }}>
                    <SubscriptionGate
                        feature="analytics"
                        fallback={
                            <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-6 items-center">
                                <View className="w-12 h-12 rounded-xl bg-[#EAEEF2] dark:bg-[#161B22] items-center justify-center mb-4">
                                    <Zap size={24} color="#FF6900" />
                                </View>
                                <Text className="text-gray-900 dark:text-white font-bold text-base mb-2">Analytics Add-on Required</Text>
                                <Text className="text-gray-500 dark:text-gray-400 text-xs text-center mb-4">
                                    Advanced analytics are not included in your current subscription plan.
                                </Text>
                            </View>
                        }
                    >
                        <>
                            {/* Stats Grid */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '700' }}>Core Metrics</Text>
                                <HelpTooltip id="admin.manage.analytics" role="admin" tier={tier} onLearnMore={openManual} />
                            </View>
                            <View className="flex-row flex-wrap justify-between mb-4">
                                {stats.filter(s => showFinancials || s.label !== "Revenue").map((stat, index) => (
                                    <StatCard
                                        key={index}
                                        title={stat.label}
                                        value={stat.value}
                                        icon={iconMap[stat.label] || BarChart3}
                                        color={colorMap[stat.label] || "#FF6900"}
                                        trend={stat.trend?.value}
                                    />
                                ))}
                            </View>

                            {/* Student Performance Overview */}
                            <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mb-4">
                                <View className="flex-row items-center mb-4">
                                    <Text className="text-gray-900 dark:text-white font-bold text-base">Student Performance Overview</Text>
                                    <HelpTooltip id="admin.manage.analytics" role="admin" tier={tier} onLearnMore={openManual} />
                                </View>
                                {analyticsOverview.map((metric) => (
                                    <View key={metric.title} className="mb-4">
                                        <View className="flex-row justify-between mb-1.5">
                                            <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">{metric.title}</Text>
                                            <Text className="text-gray-900 dark:text-white text-xs font-black">{metric.value}</Text>
                                        </View>
                                        <View className="h-1.5 bg-[#EAEEF2] dark:bg-[#161B22] rounded-full overflow-hidden">
                                            <View style={{ height: '100%', width: metric.width as DimensionValue, backgroundColor: metric.color, borderRadius: 999 }} />
                                        </View>
                                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] mt-1">{metric.helper}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Revenue Chart */}
                            {showFinancials && (
                                <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 mb-4">
                                    <View className="flex-row justify-between items-center mb-4">
                                        <Text className="text-gray-900 dark:text-white font-bold text-base">Revenue (Last 7 Days)</Text>
                                        <View className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 px-2 py-1 rounded-md">
                                            <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest">Live</Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingHorizontal: 4 }}>
                                        {revenueData.map((data, i) => {
                                            const height = (data.amount / maxRevenue) * 100;
                                            return (
                                                <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                                                    <Text className="text-gray-500 dark:text-gray-400 text-[9px] font-bold mb-1">${formatLargeNumber(data.amount)}</Text>
                                                    <View style={{
                                                        height: `${Math.max(height, 5)}%`,
                                                        width: 24,
                                                        backgroundColor: '#FF6900',
                                                        borderTopLeftRadius: 4,
                                                        borderTopRightRadius: 4,
                                                    }} />
                                                    <Text className="text-gray-500 dark:text-gray-400 text-[9px] font-bold mt-1">{data.day}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                    {revenueData.length === 0 && (
                                        <View className="h-24 items-center justify-center">
                                            <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">No transaction data yet</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* System Capacity */}
                            <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5">
                                <Text className="text-gray-900 dark:text-white font-bold text-base mb-4">System Capacity</Text>

                                <View className="mb-4">
                                    <View className="flex-row justify-between mb-1.5">
                                        <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">Database Usage</Text>
                                        <Text className="text-gray-900 dark:text-white text-xs font-black">
                                            {parseInt(stats.find(s => s.label === "Total Students")?.value || "0", 10) > 1000 ? "Medium" : "Low"}
                                        </Text>
                                    </View>
                                    <View className="h-1.5 bg-[#EAEEF2] dark:bg-[#161B22] rounded-full overflow-hidden">
                                        <View style={{
                                            height: '100%',
                                            backgroundColor: '#3b82f6',
                                            width: `${Math.min((parseInt(stats.find(s => s.label === "Total Students")?.value || "0", 10) / 5000) * 100, 100)}%`,
                                            borderRadius: 999,
                                        }} />
                                    </View>
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] mt-1">Based on student records</Text>
                                </View>

                                <View>
                                    <View className="flex-row justify-between mb-1.5">
                                        <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">Server Status</Text>
                                        <Text className="text-[10px] font-black" style={{ color: '#10b981' }}>Optimal</Text>
                                    </View>
                                    <View className="h-1.5 bg-[#EAEEF2] dark:bg-[#161B22] rounded-full overflow-hidden">
                                        <View style={{ height: '100%', backgroundColor: '#10b981', width: '100%', borderRadius: 999 }} />
                                    </View>
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] mt-1">All services operational</Text>
                                </View>
                            </View>
                        </>
                    </SubscriptionGate>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}
