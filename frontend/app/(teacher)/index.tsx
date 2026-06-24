import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from "@/contexts/ThemeContext";
import { TeacherAPI } from "@/services/TeacherService";
import { router } from "expo-router";
import { ArrowRight, BookOpen, Calendar, GraduationCap, MessageSquare, School } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { SubscriptionBanner, SubscriptionGate, SubscriptionBadge } from '@/components/shared/SubscriptionComponents';

interface QuickActionProps {
    icon: any;
    label: string;
    color: string;
    onPress?: () => void;
    badge?: React.ReactNode;
}

const QuickAction = ({ icon: Icon, label, color, onPress, badge }: QuickActionProps) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-4 mr-3 mb-3 min-w-[140px]"
        >
            <View className="flex-row items-center mb-3">
                <Icon size={20} color={color} />
                {badge && <View className="ml-2">{badge}</View>}
            </View>
            <Text className="text-gray-900 dark:text-white font-bold">{label}</Text>
        </TouchableOpacity>
    );
};

export default function TeacherHome() {
    const { profile, displayId, signOut, isInitializing, session, isDemo, logout } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { isDark } = useTheme();

    // Switcher/Role state
    const [roles, setRoles] = useState<string[]>([]);
    const [classTeacherOf, setClassTeacherOf] = useState<any[]>([]);
    const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
    const [mode, setMode] = useState<'subject' | 'class'>('subject');
    const [selectedSubjectTitle, setSelectedSubjectTitle] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    const fetchDashboardData = async () => {
        if (!isDemo && (isInitializing || !session)) return;

        try {
            setLoading(true);
            const data = await TeacherAPI.getDashboardStats();
            // for testing
            console.log('Dashboard data: ', JSON.stringify(data, null, 2))
            setStats(data.stats);
            setSchedule(data.schedule);
            const fetchedRoles = data.roles || [];
            setRoles(fetchedRoles);
            setClassTeacherOf(data.classTeacherOf || []);
            
            // If Class Teacher but not Subject Teacher, default to class mode
            if (!fetchedRoles.includes('Subject Teacher') && fetchedRoles.includes('Class Teacher')) {
                setMode('class');
            }
            
            const fetchedSubjects = data.assignedSubjects || [];
            setAssignedSubjects(fetchedSubjects);
            
            if (fetchedSubjects.length > 0) {
                const initialSubject = fetchedSubjects[0];
                setSelectedSubjectTitle(initialSubject.title);
                if (initialSubject.class) {
                    setSelectedClassId(initialSubject.class.id);
                }
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };


    useEffect(() => {
        if (isInitializing) return;
        if (isDemo || session) {
            fetchDashboardData();
        } else {
            setLoading(false);
        }
    }, [isInitializing, session, isDemo]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const handleSelectSubject = (title: string) => {
        setSelectedSubjectTitle(title);
        const classesForSub = assignedSubjects.filter(s => s.title === title).map(s => s.class).filter(Boolean);
        if (classesForSub.length > 0) {
            setSelectedClassId(classesForSub[0].id);
        } else {
            setSelectedClassId('');
        }
    };

    const uniqueSubjectTitles = Array.from(new Set(assignedSubjects.map(s => s.title)));
    const activeAssignment = assignedSubjects.find(s => s.title === selectedSubjectTitle && s.class?.id === selectedClassId);

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <SubscriptionBanner />
            <UnifiedHeader
                title="Welcome back,"
                subtitle={profile?.full_name || 'Teacher Portal'}
                role="Teacher"
                showNotification={true}
            />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20, paddingTop: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
                }
            >
                {/* --- 2. Hero Inline Stats --- */}
                <View className="flex-row gap-8 mb-6 mt-2">
                    <View>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">
                            Students
                        </Text>
                        <Text className="text-gray-900 dark:text-white text-3xl font-black">
                            {stats?.studentsCount ?? 0}
                        </Text>
                    </View>
                    <View>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">
                            Subjects
                        </Text>
                        <Text className="text-gray-900 dark:text-white text-3xl font-black">
                            {stats?.subjectsCount || 0}
                        </Text>
                    </View>
                </View>

                {/* --- 3. Today's Schedule --- */}
                <View className="flex-row justify-between items-end mb-3">
                    <Text className="text-lg font-bold text-gray-900 dark:text-white">
                        Today&apos;s Schedule
                    </Text>
                    <TouchableOpacity onPress={() => router.push("/(teacher)/management/timetable" as any)} activeOpacity={0.7}>
                        <Text className="text-[#FF6900] font-bold text-sm">View All</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="small" color="#FF6900" className="my-6" />
                ) : schedule.length === 0 ? (
                    <View className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-6 items-center justify-center mb-6">
                        <Calendar size={40} color={isDark ? "#4B5563" : "#9CA3AF"} />
                        <Text className="text-gray-500 dark:text-gray-400 mt-2 text-xs uppercase tracking-widest font-bold">No classes today</Text>
                    </View>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="flex-row mb-6 -mx-5 px-5"
                    >
                        {schedule.map((item: any) => (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.7}
                                className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-4 mr-3 min-w-[220px]"
                            >
                                <View className="flex-row items-center mb-2">
                                    <View className="mr-2">
                                        <BookOpen size={16} color="#FF6900" />
                                    </View>
                                    <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">
                                        {item.start_time} - {item.end_time}
                                    </Text>
                                </View>
                                <Text className="text-gray-900 dark:text-white font-bold text-base mb-1" numberOfLines={1}>
                                    {item.subjects?.title}
                                </Text>
                                <Text className="text-gray-500 dark:text-gray-400 text-sm">
                                    {item.classes?.display_name} {item.room_number ? `• ${item.room_number}` : ''}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* --- 4. Quick Actions Grid --- */}
                <View className="mb-2">
                    <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                        Quick Actions
                    </Text>
                    <View className="flex-row flex-wrap -mr-3">
                        <QuickAction
                            icon={GraduationCap}
                            label="Grades"
                            color="#FF6900"
                            onPress={() => router.push("/(teacher)/management/grades" as any)}
                        />
                        <SubscriptionGate>
                            <QuickAction
                                icon={School}
                                label="Classes"
                                color="#FF6900"
                                onPress={() => router.push("/(teacher)/classes" as any)}
                                badge={<SubscriptionBadge />}
                            />
                        </SubscriptionGate>
                        <QuickAction
                            icon={ArrowRight}
                            label="Assignments"
                            color="#FF6900"
                            onPress={() => router.push("/(teacher)/management/assignments" as any)}
                        />
                        <SubscriptionGate>
                            <QuickAction
                                icon={MessageSquare}
                                label="Messages"
                                color="#FF6900"
                                onPress={() => router.push("/(teacher)/management/messages" as any)}
                                badge={<SubscriptionBadge />}
                            />
                        </SubscriptionGate>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
