import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import {
    GraduationCap,
    ClipboardList,
    CalendarCheck,
    Megaphone,
    BarChart3,
    Wallet,
    BookOpen,
    ChevronRight,
    ArrowLeft,
    Users,
    Settings,
    FileText,
    Shield
} from 'lucide-react-native';
import { router } from "expo-router";
import { useDashboardStats } from "@/hooks/useDashboardStats";

interface FeatureCardProps {
    icon: any;
    title: string;
    description: string;
    color: string;
    bgColor: string;
    route: string;
    badge?: string;
}

const FeatureCard = ({ icon: Icon, title, description, color, bgColor, route, badge }: FeatureCardProps) => (
    <TouchableOpacity
        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-3 flex-row items-center active:bg-gray-50"
        onPress={() => {
            if (route === '#') {
                alert('Coming Soon');
            } else {
                router.push(route as any);
            }
        }}
    >
        <View style={{ backgroundColor: bgColor }} className="p-3 rounded-xl mr-4">
            <Icon size={24} color={color} />
        </View>
        <View className="flex-1">
            <View className="flex-row items-center">
                <Text className="text-gray-900 font-bold text-base">{title}</Text>
                {badge && (
                    <View className="ml-2 bg-red-500 px-2 py-0.5 rounded-full">
                        <Text className="text-white text-xs font-bold">{badge}</Text>
                    </View>
                )}
            </View>
            <Text className="text-gray-500 text-sm mt-0.5">{description}</Text>
        </View>
        <ChevronRight size={20} color="#9CA3AF" />
    </TouchableOpacity>
);

export default function AdminManagement() {
    const { stats, loading } = useDashboardStats();

    // Map stats to our display row
    const getStatValue = (label: string) => stats.find(s => s.label === label)?.value || "0";

    const features: FeatureCardProps[] = [
        {
            icon: BarChart3,
            title: "System Analytics",
            description: "View system-wide performance and stats",
            color: "#3b82f6",
            bgColor: "#dbeafe",
            route: "/(admin)/management/analytics" as any
        },
        {
            icon: BookOpen,
            title: "Library Management",
            description: "Manage books and resources",
            color: "#eab308",
            bgColor: "#fef9c3",
            route: "/(admin)/management/library" as any
        },
        {
            icon: ClipboardList,
            title: "Subjects & Curricula",
            description: "Manage subjects and course structures",
            color: "#8b5cf6",
            bgColor: "#ede9fe",
            route: "/(admin)/management/subjects" as any
        },
        {
            icon: Shield,
            title: "Roles & Permissions",
            description: "Configure system access levels",
            color: "#ec4899",
            bgColor: "#fce7f3",
            route: "#" // Future feature
        },
        {
            icon: FileText,
            title: "Reports & Logs",
            description: "View activity logs and generate reports",
            color: "#64748b",
            bgColor: "#f1f5f9",
            route: "/(admin)/finance/bursaries/reports" as any
        },
        {
            icon: CalendarCheck,
            title: "Attendance Management",
            description: "View and manage staff attendance",
            color: "#10b981",
            bgColor: "#d1fae5",
            route: "/(admin)/attendance/teachers/index" as any
        }
    ];

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
                        {/* Header */}
                        <View className="flex-row items-center mb-2">
                            <TouchableOpacity
                                className="p-2 mr-2"
                                onPress={() => router.back()}
                            >
                                <ArrowLeft size={24} color="#374151" />
                            </TouchableOpacity>
                            <Text className="text-2xl font-bold text-gray-900">Admin Management</Text>
                        </View>
                        <Text className="text-gray-500 mb-6 ml-10">
                            Central control for all system features
                        </Text>

                        {/* Quick Stats Row */}
                        <View className="flex-row gap-3 mb-6">
                            <View className="flex-1 bg-gray-900 p-4 rounded-2xl shadow-sm">
                                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">System Status</Text>
                                <View className="flex-row items-center mt-1">
                                    <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                                    <Text className="text-white text-lg font-bold">Healthy</Text>
                                </View>
                            </View>
                            <View className="flex-1 bg-blue-600 p-4 rounded-2xl shadow-sm">
                                <Text className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">Total Students</Text>
                                <Text className="text-white text-2xl font-black mt-1">{loading ? "..." : getStatValue("Total Students")}</Text>
                            </View>
                            <View className="flex-1 bg-orange-500 p-4 rounded-2xl shadow-sm">
                                <Text className="text-orange-100 text-[10px] font-bold uppercase tracking-wider">Teachers</Text>
                                <Text className="text-white text-2xl font-black mt-1">{loading ? "..." : getStatValue("Teachers")}</Text>
                            </View>
                        </View>

                        {/* Feature Cards */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">System Tools</Text>
                        {features.map((feature, index) => (
                            <FeatureCard key={index} {...feature} />
                        ))}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
