import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { Calendar, Clock, Bell, ArrowRight, BookOpen, Users, GraduationCap, School, MessageSquare, LogOut } from 'lucide-react-native';
import { router } from "expo-router";
import { useAuth } from '@/contexts/AuthContext';
import { TeacherAPI } from "@/services/TeacherService";

// Define Interface for the QuickAction props
interface QuickActionProps {
    icon: any;
    label: string;
    color: string;
    onPress?: () => void;
}

const QuickAction = ({ icon: Icon, label, color, onPress }: QuickActionProps) => (
    <TouchableOpacity
        onPress={onPress}
        className="w-[48%] bg-white p-6 rounded-3xl border border-gray-100 shadow-sm items-center mb-4 active:bg-gray-50"
    >
        <View style={{ backgroundColor: `${color}15` }} className="p-3 rounded-2xl mb-2">
            <Icon size={24} color={color} />
        </View>
        <Text className="text-gray-800 font-bold">{label}</Text>
    </TouchableOpacity>
);

export default function TeacherHome() {
    const { profile, displayId, logout } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboardData = async () => {
        try {
            const data = await TeacherAPI.getDashboardStats();
            setStats(data.stats);
            setSchedule(data.schedule);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };


    return (
        <>
            <StatusBar barStyle="dark-content" />

            <View className="flex-1 bg-gray-50">
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B00"]} tintColor="#FF6B00" />
                    }
                >
                    <View className="p-4 md:p-8">
                        {/* --- 1. Header Section --- */}
                        <View className="flex-row justify-between items-center mb-8">
                            <View>
                                <Text className="text-gray-500 text-base font-medium">
                                    Welcome back,
                                </Text>
                                <Text className="text-3xl font-bold text-gray-900">
                                    {profile?.full_name?.split(" ")[0] || 'Teacher'} 👋
                                </Text>
                                <Text className="text-sm text-gray-500 font-medium">
                                    ID: {displayId || 'Loading...'}
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-3">
                                <TouchableOpacity
                                    className="relative p-3 bg-white rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50"
                                    onPress={() => router.push("/(teacher)/management/notifications" as any)}
                                >
                                    <Bell size={22} color="#374151" />
                                    {stats?.unreadNotifications > 0 && (
                                        <View className="absolute top-3 right-3 w-4 h-4 bg-red-500 rounded-full border-2 border-white items-center justify-center">
                                            <Text className="text-white text-[8px] font-bold">{stats.unreadNotifications}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* Logout Button */}
                                <TouchableOpacity
                                    className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50"
                                    onPress={() => logout()}
                                >
                                    <LogOut size={22} color="#374151" />
                                </TouchableOpacity>
                            </View>

                        </View>

                        {/* --- 2. Quick Status Cards --- */}
                        <View className="flex-row gap-4 mb-8">
                            <View className="flex-1 bg-teacherOrange p-6 rounded-3xl shadow-lg shadow-orange-200">
                                <View className="bg-white/20 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                                    <Users size={20} color="white" />
                                </View>
                                <Text className="text-white text-3xl font-black">{stats?.studentsCount || 0}</Text>
                                <Text className="text-white/80 text-xs font-bold uppercase tracking-wider">
                                    Students
                                </Text>
                            </View>
                            <View className="flex-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <View className="bg-orange-50 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                                    <Clock size={20} color="#FF6B00" />
                                </View>
                                <Text className="text-gray-900 text-3xl font-black">
                                    {stats?.subjectsCount || 0}
                                </Text>
                                <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                                    Active Subjects
                                </Text>
                            </View>
                        </View>

                        {/* --- 3. Today's Schedule --- */}
                        <View className="flex-row justify-between items-end mb-4 ">
                            <Text className="text-xl font-bold text-gray-900">
                                Today's Schedule
                            </Text>
                            <TouchableOpacity onPress={() => router.push("/(teacher)/management/timetable" as any)}>
                                <Text className="text-teacherOrange font-semibold">View All</Text>
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="small" color="#FF6B00" className="my-8" />
                        ) : schedule.length === 0 ? (
                            <View className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 items-center justify-center mb-6">
                                <Calendar size={32} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-2 font-medium">No classes today</Text>
                            </View>
                        ) : (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="flex-row mb-6 -mx-4 px-4 pb-4"
                            >
                                {schedule.map((item: any) => (
                                    <View key={item.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mr-4 w-64">
                                        <View className="flex-row items-center mb-3">
                                            <View className="bg-orange-50 p-2 rounded-xl mr-3">
                                                <BookOpen size={18} color="#FF6B00" />
                                            </View>
                                            <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                                                {item.start_time} - {item.end_time}
                                            </Text>
                                        </View>
                                        <Text className="text-gray-900 font-bold text-lg mb-1" numberOfLines={1}>
                                            {item.subjects?.title}
                                        </Text>
                                        <Text className="text-gray-500 text-sm">
                                            {item.classes?.name} {item.room_number ? `• Room ${item.room_number}` : ''}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        {/* --- 4. Quick Actions Grid --- */}
                        <View className="mt-2">
                            <Text className="text-xl font-bold text-gray-900 mb-4">
                                Quick Actions
                            </Text>
                            <View className="flex-row flex-wrap justify-between">
                                <QuickAction
                                    icon={GraduationCap}
                                    label="Grades"
                                    color="#1a1a1a"
                                    onPress={() => router.push("/(teacher)/management/grades" as any)}
                                />
                                <QuickAction
                                    icon={School}
                                    label="Classes"
                                    color="#8b5cf6"
                                    onPress={() => router.push("/(teacher)/classes" as any)}
                                />
                                <QuickAction
                                    icon={ArrowRight}
                                    label="Assignments"
                                    color="#f43f5e"
                                    onPress={() => router.push("/(teacher)/management/assignments" as any)}
                                />
                                <QuickAction
                                    icon={MessageSquare}
                                    label="Messages"
                                    color="#0891b2"
                                    onPress={() => router.push("/(teacher)/management/messages" as any)}
                                />
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
