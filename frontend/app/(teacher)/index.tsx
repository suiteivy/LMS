import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from "@/contexts/ThemeContext";
import { TeacherAPI } from "@/services/TeacherService";
import { router } from "expo-router";
import { ArrowRight, BookOpen, Calendar, Clock, GraduationCap, MessageSquare, School, Users } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

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
        className="w-[48%] bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm items-center mb-4 active:bg-gray-50 dark:active:bg-gray-900"
    >
        <View style={{ backgroundColor: `${color}15` }} className="p-3 rounded-2xl mb-2">
            <Icon size={24} color={color} />
        </View>
        <Text className="text-gray-800 dark:text-gray-200 font-bold">{label}</Text>
    </TouchableOpacity>
);

export default function TeacherHome() {
    const { profile, displayId, signOut, isInitializing, session } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { isDark } = useTheme();

    const fetchDashboardData = async () => {
        if (isInitializing || !session) return;

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
        if (!isInitializing && session) {
            fetchDashboardData();
        }
    }, [isInitializing, session]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };


    return (
        <View className="flex-1 bg-white dark:bg-black">
            <UnifiedHeader
                title="Welcome back,"
                subtitle={profile?.full_name?.split(" ")[0] || 'Teacher'}
                role="Teacher"
                showNotification={true}
            />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100, padding: 24, paddingTop: 10 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
                }
            >
                <View>
                    {/* --- 2. Quick Status Cards --- */}
                    <View className="flex-row gap-4 mb-8">
                        <View className="flex-1 bg-[#FF6900] p-6 rounded-3xl shadow-lg">
                            <View className="bg-white/20 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                                <Users size={20} color="white" />
                            </View>
                            <Text className="text-white text-3xl font-bold">{stats?.studentsCount || 0}</Text>
                            <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                                Students
                            </Text>
                        </View>
                        <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <View className="bg-orange-50 dark:bg-orange-950/30 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                                <Clock size={20} color="#FF6900" />
                            </View>
                            <Text className="text-gray-900 dark:text-white text-3xl font-bold">
                                {stats?.subjectsCount || 0}
                            </Text>
                            <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                Active Subjects
                            </Text>
                        </View>
                    </View>

                    {/* --- 3. Today's Schedule --- */}
                    <View className="flex-row justify-between items-end mb-4 ">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white">
                            Today's Schedule
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/(teacher)/management/timetable" as any)}>
                            <Text className="text-[#FF6900] font-semibold">View All</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="small" color="#FF6900" className="my-8" />
                    ) : schedule.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 items-center justify-center mb-6">
                            <Calendar size={32} color="#D1D5DB" />
                            <Text className="text-gray-400 dark:text-gray-500 mt-2 font-medium">No classes today</Text>
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="flex-row mb-6 -mx-4 px-4 pb-4"
                        >
                            {schedule.map((item: any) => (
                                <View key={item.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mr-4 w-64">
                                    <View className="flex-row items-center mb-3">
                                        <View className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded-xl mr-3">
                                            <BookOpen size={18} color="#FF6900" />
                                        </View>
                                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                            {item.start_time} - {item.end_time}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-900 dark:text-white font-bold text-lg mb-1" numberOfLines={1}>
                                        {item.subjects?.title}
                                    </Text>
                                    <Text className="text-gray-600 dark:text-gray-300 text-sm">
                                        {item.classes?.name} {item.room_number ? `• Room ${item.room_number}` : ''}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* --- 4. Quick Actions Grid --- */}
                    <View className="mt-2">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Quick Actions
                        </Text>
                        <View className="flex-row flex-wrap justify-between">
                            <QuickAction
                                icon={GraduationCap}
                                label="Grades"
                                color={isDark ? "#ff6900" : "#ffffff"}
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
    );
}
