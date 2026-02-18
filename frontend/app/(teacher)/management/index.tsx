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
    MessageSquare,
    ChevronRight,
    ArrowLeft
} from 'lucide-react-native';
import { router } from "expo-router";

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
        onPress={() => router.push(route as any)}
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

export default function ManagementIndex() {
    const features: FeatureCardProps[] = [
        {
            icon: GraduationCap,
            title: "Grades",
            description: "View and update student grades",
            color: "#1a1a1a",
            bgColor: "#f3f4f6", // gray-100
            route: "/(teacher)/management/grades",
            badge: "12 pending"
        },
        {
            icon: ClipboardList,
            title: "Assignments",
            description: "Create assignments and view submissions",
            color: "#f97316",
            bgColor: "#ffedd5",
            route: "/(teacher)/management/assignments",
            badge: "5 new"
        },
        {
            icon: CalendarCheck,
            title: "Attendance",
            description: "Mark and track student attendance",
            color: "#8b5cf6",
            bgColor: "#ede9fe",
            route: "/(teacher)/management/attendance"
        },
        {
            icon: Megaphone,
            title: "Announcements",
            description: "Post updates to your students",
            color: "#ec4899",
            bgColor: "#fce7f3",
            route: "/(teacher)/management/announcements"
        },
        {
            icon: BarChart3,
            title: "Analytics",
            description: "Track performance and insights",
            color: "#3b82f6",
            bgColor: "#dbeafe",
            route: "/(teacher)/management/analytics"
        },
        {
            icon: Wallet,
            title: "Earnings",
            description: "View payment history and earnings",
            color: "#22c55e",
            bgColor: "#dcfce7",
            route: "/(teacher)/management/earnings"
        },
        {
            icon: BookOpen,
            title: "Resources",
            description: "Upload and manage Subject materials",
            color: "#eab308",
            bgColor: "#fef9c3",
            route: "/(teacher)/management/resources"
        },
        {
            icon: MessageSquare,
            title: "Messages",
            description: "Chat with students and parents",
            color: "#0891b2",
            bgColor: "#ecfeff",
            route: "/(teacher)/management/messages"
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
                            <Text className="text-2xl font-bold text-gray-900">Management</Text>
                        </View>
                        <Text className="text-gray-500 mb-6 ml-10">
                            Access all your teaching tools
                        </Text>

                        {/* Quick Stats Row */}
                        <View className="flex-row gap-3 mb-6">
                            <View className="flex-1 bg-teacherOrange p-4 rounded-2xl">
                                <Text className="text-white text-xs uppercase">Pending Grades</Text>
                                <Text className="text-white text-2xl font-bold">12</Text>
                            </View>
                            <View className="flex-1 bg-orange-500 p-4 rounded-2xl">
                                <Text className="text-orange-100 text-xs uppercase">Submissions</Text>
                                <Text className="text-white text-2xl font-bold">28</Text>
                            </View>
                            <View className="flex-1 bg-purple-600 p-4 rounded-2xl">
                                <Text className="text-purple-100 text-xs uppercase">Today</Text>
                                <Text className="text-white text-2xl font-bold">3</Text>
                            </View>
                        </View>

                        {/* Feature Cards */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">Tools & Features</Text>
                        {features.map((feature, index) => (
                            <FeatureCard key={index} {...feature} />
                        ))}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
