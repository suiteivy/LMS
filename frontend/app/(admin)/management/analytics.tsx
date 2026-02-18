import React, { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Users, BookOpen, GraduationCap, DollarSign, TrendingUp, Calendar, ArrowLeft, BarChart3 } from "lucide-react-native";
import { router } from "expo-router";

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex-1 min-w-[160px] m-1">
        <View className={`p-3 rounded-2xl mb-4 self-start`} style={{ backgroundColor: `${color}15` }}>
            <Icon size={24} color={color} />
        </View>
        <Text className="text-gray-500 text-sm font-medium" numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
        <View className="flex-row items-end justify-between mt-1">
            <Text className="text-gray-900 text-2xl font-bold" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {trend && (
                <View className="flex-row items-center bg-green-50 px-2 py-0.5 rounded-full">
                    <TrendingUp size={12} color="#16a34a" />
                    <Text className="text-green-700 text-xs font-bold ml-1">{trend}</Text>
                </View>
            )}
        </View>
    </View>
);

export default function AnalyticsScreen() {
    const { stats, loading, revenueData, refresh } = useDashboardStats();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0D9488" />
            </View>
        );
    }

    // Map icons to stat keys
    const iconMap: any = {
        "Total Students": GraduationCap,
        "Active Subjects": BookOpen,
        "Teachers": Users,
        "Revenue": DollarSign
    };

    const colorMap: any = {
        "Total Students": "#3b82f6",
        "Active Subjects": "#10b981",
        "Teachers": "#8b5cf6",
        "Revenue": "#f59e0b"
    };

    // Calculate max amount for chart scaling
    const maxRevenue = Math.max(...revenueData.map(d => d.amount), 100);

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0D9488"]} />
            }
        >
            <View className="p-6">
                {/* Header */}
                <View className="flex-row items-center mb-6">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 mr-4"
                    >
                        <ArrowLeft size={20} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-extrabold text-gray-900">Analytics</Text>
                        <Text className="text-gray-500 text-sm">Real-time system performance insights</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View className="flex-row flex-wrap -m-1 mb-6">
                    {stats.map((stat, index) => (
                        <StatCard
                            key={index}
                            title={stat.label}
                            value={stat.value}
                            icon={iconMap[stat.label] || BarChart3}
                            color={colorMap[stat.label] || "#0D9488"}
                            trend={stat.trend?.value}
                        />
                    ))}
                </View>

                {/* Revenue Overview (Last 7 Days) */}
                <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-lg font-bold text-gray-900">Revenue (Last 7 Days)</Text>
                        <View className="bg-teal-50 px-3 py-1 rounded-full">
                            <Text className="text-teal-600 text-xs font-bold">Live Data</Text>
                        </View>
                    </View>

                    {/* Dynamic Bar Chart */}
                    <View className="flex-row items-end justify-between h-48 px-2">
                        {revenueData.map((data, i) => {
                            const height = (data.amount / maxRevenue) * 100;
                            return (
                                <View key={i} className="items-center flex-1">
                                    <View className="mb-2">
                                        <Text className="text-[8px] text-gray-400 font-bold">${data.amount}</Text>
                                    </View>
                                    <View
                                        style={{ height: `${Math.max(height, 5)}%` }}
                                        className="w-8 bg-teal-600 rounded-t-lg opacity-80"
                                    />
                                    <Text className="text-gray-400 text-[10px] mt-2 font-medium">{data.day}</Text>
                                </View>
                            );
                        })}
                    </View>
                    {revenueData.length === 0 && (
                        <View className="h-40 justify-center items-center">
                            <Text className="text-gray-400">No transaction data yet</Text>
                        </View>
                    )}
                </View>

                {/* System Activity */}
                <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <Text className="text-lg font-bold text-gray-900 mb-4">System Capacity</Text>
                    <View className="space-y-4">
                        <View className="mb-4">
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-sm text-gray-600 font-medium">Database Usage</Text>
                                <Text className="text-sm text-gray-900 font-bold">
                                    {parseInt(stats.find(s => s.label === "Total Students")?.value || "0") > 1000 ? "Medium" : "Low"}
                                </Text>
                            </View>
                            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-blue-500"
                                    style={{ width: `${Math.min((parseInt(stats.find(s => s.label === "Total Students")?.value || "0") / 5000) * 100, 100)}%` }}
                                />
                            </View>
                            <Text className="text-xs text-gray-400 mt-1">Based on student records</Text>
                        </View>
                        <View>
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-sm text-gray-600 font-medium">Server Status</Text>
                                <Text className="text-sm text-teal-600 font-bold">Optimal</Text>
                            </View>
                            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <View className="h-full bg-teal-500 w-[100%]" />
                            </View>
                            <Text className="text-xs text-gray-400 mt-1">All services operational</Text>
                        </View>
                    </View>
                </View>
            </View>
            <View className="h-10" />
        </ScrollView>
    );
}
