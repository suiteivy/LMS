import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from "@/contexts/ThemeContext";
import { TeacherAPI } from "@/services/TeacherService";
import { router } from "expo-router";
import { ArrowRight, BookOpen, Calendar, Clock, GraduationCap, MessageSquare, School, Users, LogOut, ShieldAlert } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { SubscriptionBanner, SubscriptionGate, SubscriptionBadge } from '@/components/shared/SubscriptionComponents';
import { formatClassLabel } from '@/utils/classLabel';

// Define Interface for the QuickAction props
interface QuickActionProps {
    icon: any;
    label: string;
    color: string;
    onPress?: () => void;
    badge?: React.ReactNode;
}

const QuickAction = ({ icon: Icon, label, color, onPress, badge }: QuickActionProps) => {
    const { isDark } = useTheme();
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                minHeight: 135, 
                justifyContent: 'center', 
                alignItems: 'center',
                boxShadow: [{
                    offsetX: 0,
                    offsetY: 1,
                    blurRadius: 1.5,
                    color: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.08)',
                }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.3 : 0.08,
                shadowRadius: 1.5,
                elevation: 1,
            }}
            className="bg-white dark:bg-[#161B22] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 items-center mb-4 active:bg-gray-50 dark:active:bg-gray-900"
        >
            <View style={{ backgroundColor: `${color}15` }} className="p-3 rounded-2xl mb-2">
                <Icon size={24} color={color} />
            </View>
            <Text className="text-gray-800 dark:text-gray-200 font-bold text-center">{label}</Text>
            <View className="mt-1 h-5 items-center justify-center">
                {badge && 
                (<View className="mt-1 h-5 items-center justify-center">
                    {badge}
                </View>)}
            </View>
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
            if (isDemo) {
                // High-quality mock data for Teacher Demo Mode
                setStats({
                    studentsCount: 42,
                    subjectsCount: 4
                });
                setSchedule([
                    {
                        id: 'demo-1',
                        start_time: '08:00:00',
                        end_time: '09:30:00',
                        subjects: { title: 'Advanced Mathematics' },
                        classes: { name: 'Grade 12A' },
                        room_number: 'Lecture Hall A'
                    },
                    {
                        id: 'demo-2',
                        start_time: '10:00:00',
                        end_time: '11:30:00',
                        subjects: { title: 'Theoretical Physics' },
                        classes: { name: 'Grade 12B' },
                        room_number: 'Science Lab 2'
                    },
                    {
                        id: 'demo-3',
                        start_time: '13:30:00',
                        end_time: '15:00:00',
                        subjects: { title: 'Software Engineering' },
                        classes: { name: 'Computer Sc 1' },
                        room_number: 'CS Lab 101'
                    }
                ]);

                const mockRoles = ['Subject Teacher', 'Class Teacher', 'Head of Department'];
                const mockCT = [{ id: 'class-demo-1', grade_level: 12, level_label: 'Grade', stream: 'A' }];
                const mockAssigned = [
                    {
                        id: "subj-demo-1",
                        title: "Advanced Mathematics",
                        class: { id: "class-demo-1", grade_level: 12, level_label: 'Grade', stream: 'A' },
                        timetable: [
                            { day_of_week: "Monday", start_time: "08:00:00", end_time: "09:30:00", room_number: "Lecture Hall A" },
                            { day_of_week: "Wednesday", start_time: "08:00:00", end_time: "09:30:00", room_number: "Lecture Hall A" }
                        ]
                    },
                    {
                        id: "subj-demo-2",
                        title: "Theoretical Physics",
                        class: { id: "class-demo-2", grade_level: 12, level_label: 'Grade', stream: 'B' },
                        timetable: [
                            { day_of_week: "Tuesday", start_time: "10:00:00", end_time: "11:30:00", room_number: "Science Lab 2" }
                        ]
                    },
                    {
                        id: "subj-demo-3",
                        title: "Advanced Mathematics",
                        class: { id: "class-demo-2", grade_level: 12, level_label: 'Grade', stream: 'B' },
                        timetable: [
                            { day_of_week: "Thursday", start_time: "08:00:00", end_time: "09:30:00", room_number: "Lecture Hall B" }
                        ]
                    }
                ];

                setRoles(mockRoles);
                setClassTeacherOf(mockCT);
                setAssignedSubjects(mockAssigned);

                // Initialize switcher selectors
                setSelectedSubjectTitle("Advanced Mathematics");
                setSelectedClassId("class-demo-1");
                return;
            }

            const data = await TeacherAPI.getDashboardStats();
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
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
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
                contentContainerStyle={{ paddingBottom: 100, padding: 24, paddingTop: 10 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
                }
            >
                <View>
                    {/* Log out link & Role Badges */}
                    <View className="flex-row justify-between items-center mb-6 px-2 flex-wrap gap-2">
                        <View className="flex-row gap-1.5 flex-wrap">
                            {roles.map(r => (
                                <View key={r} className="bg-orange-500/10 px-3 py-1 rounded-xl border border-orange-500/20">
                                    <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-wider">{r}</Text>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity
                            onPress={async () => {
                                await logout();
                                router.replace("/(auth)/signIn");
                            }}
                            style={{
                                boxShadow: [{
                                    offsetX: 0,
                                    offsetY: 1,
                                    blurRadius: 2,
                                    color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.05)',
                                }],
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isDark ? 0.4 : 0.05,
                                shadowRadius: 2,
                                elevation: 1,
                            }}
                            className="flex-row items-center bg-white dark:bg-[#161B22] px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800"
                        >
                            <LogOut size={14} color="#ef4444" />
                            <Text className="ml-2 text-red-600 font-bold text-[10px] uppercase tracking-widest">Logout</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- 2. Quick Status Cards --- */}
                    <View className="flex-row gap-4 mb-8">
                        <View 
                            style={{
                                boxShadow: [{
                                    offsetX: 0,
                                    offsetY: 8,
                                    blurRadius: 12,
                                    color: 'rgba(255, 105, 0, 0.3)',
                                }],
                                shadowColor: "#FF6900",
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.3,
                                shadowRadius: 12,
                                elevation: 12,
                            }}
                            className="flex-1 bg-[#FF6900] p-6 rounded-3xl"
                        >
                            <View className="bg-white/20 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                                <Users size={20} color="white" />
                            </View>
                            <Text className="text-white text-3xl font-bold">{stats?.studentsCount || 0}</Text>
                            <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                                Students Taught
                            </Text>
                        </View>
                        <View 
                            style={{
                                boxShadow: [{
                                    offsetX: 0,
                                    offsetY: 1,
                                    blurRadius: 2,
                                    color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)',
                                }],
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isDark ? 0.4 : 0.08,
                                shadowRadius: 2,
                                elevation: 2,
                            }}
                            className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-6 rounded-3xl border border-gray-100 dark:border-gray-800"
                        >
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

                    {/* --- 3. Switcher Card (Subjects / Classes / CT Mode) --- */}
                    <View className="bg-white dark:bg-[#161B22] rounded-[32px] border border-gray-100 dark:border-gray-800 p-5 mb-8 shadow-sm">
                        {/* Mode Selector - Tabs */}
                        {roles.includes('Class Teacher') && (
                            <View className="flex-row bg-gray-105 dark:bg-[#161B22] rounded-2xl p-1 mb-5">
                                <TouchableOpacity 
                                    onPress={() => setMode('subject')}
                                    className={`flex-1 py-2.5 rounded-xl items-center ${mode === 'subject' ? 'bg-[#FF6900]' : 'bg-transparent'}`}
                                >
                                    <Text className={`font-bold text-xs uppercase tracking-wider ${mode === 'subject' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                        Subject Teacher Mode
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => setMode('class')}
                                    className={`flex-1 py-2.5 rounded-xl items-center ${mode === 'class' ? 'bg-[#FF6900]' : 'bg-transparent'}`}
                                >
                                    <Text className={`font-bold text-xs uppercase tracking-wider ${mode === 'class' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                        Class Teacher Mode
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {mode === 'subject' ? (
                            <View>
                                {/* Subject Selector Pills */}
                                <Text className="text-gray-400 dark:text-gray-550 text-[10px] font-bold uppercase tracking-wider mb-2">My Subjects</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                                    {uniqueSubjectTitles.map((title) => (
                                        <TouchableOpacity
                                            key={title}
                                            onPress={() => handleSelectSubject(title)}
                                            className={`px-4 py-2 rounded-xl mr-2 border ${
                                                selectedSubjectTitle === title 
                                                    ? 'bg-orange-50 dark:bg-[#FF6900]/10 border-[#FF6900]' 
                                                    : 'bg-gray-50 dark:bg-[#161B22] border-gray-100 dark:border-gray-800'
                                            }`}
                                        >
                                            <Text className={`text-xs font-bold ${selectedSubjectTitle === title ? 'text-[#FF6900]' : 'text-gray-750 dark:text-gray-300'}`}>
                                                {title}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Class Selector Pills */}
                                {selectedSubjectTitle ? (
                                    <>
                                        <Text className="text-gray-400 dark:text-gray-550 text-[10px] font-bold uppercase tracking-wider mb-2">Classes Taught</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                                            {assignedSubjects
                                                .filter(s => s.title === selectedSubjectTitle)
                                                .map(s => s.class)
                                                .filter(Boolean)
                                                .map((cls) => (
                                                    <TouchableOpacity
                                                        key={cls.id}
                                                        onPress={() => setSelectedClassId(cls.id)}
                                                        className={`px-4 py-2 rounded-xl mr-2 border ${
                                                            selectedClassId === cls.id 
                                                                ? 'bg-orange-50 dark:bg-[#FF6900]/10 border-[#FF6900]' 
                                                                : 'bg-gray-50 dark:bg-[#161B22] border-gray-100 dark:border-gray-800'
                                                        }`}
                                                    >
                                                        <Text className={`text-xs font-bold ${selectedClassId === cls.id ? 'text-[#FF6900]' : 'text-gray-750 dark:text-gray-300'}`}>
                                                            {formatClassLabel(cls)}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))
                                            }
                                        </ScrollView>
                                    </>
                                ) : null}

                                {/* Timetable slots */}
                                <View className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                                    <Text className="text-gray-400 dark:text-gray-550 text-[10px] font-bold uppercase tracking-wider mb-3">Weekly Timetable Schedule</Text>
                                    {activeAssignment?.timetable && activeAssignment.timetable.length > 0 ? (
                                        activeAssignment.timetable.map((slot: any, idx: number) => (
                                            <View key={idx} className="flex-row items-center gap-3 bg-gray-50 dark:bg-[#161B22] border border-gray-100 dark:border-gray-800 p-3 rounded-2xl mb-2">
                                                <View className="bg-orange-500/10 p-2 rounded-xl">
                                                    <Clock size={14} color="#FF6900" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-gray-900 dark:text-white font-bold text-xs">{slot.day_of_week}</Text>
                                                    <Text className="text-gray-450 dark:text-gray-500 text-[10px]">{slot.start_time} - {slot.end_time}</Text>
                                                </View>
                                                {slot.room_number && (
                                                    <View className="bg-gray-100 dark:bg-[#161B22] px-2 py-1 rounded-lg">
                                                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-semibold">Room {slot.room_number}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        ))
                                    ) : (
                                        <View className="items-center justify-center py-6 bg-gray-50 dark:bg-[#161B22] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                            <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold">No timetable slots scheduled</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ) : (
                            /* Class Teacher Dashboard Mode */
                            <View>
                                <Text className="text-gray-400 dark:text-gray-550 text-[10px] font-bold uppercase tracking-wider mb-2">Designated Classes</Text>
                                {classTeacherOf && classTeacherOf.length > 0 ? (
                                    classTeacherOf.map((cls) => (
                                        <View key={cls.id} className="bg-orange-50/20 dark:bg-orange-950/10 border border-orange-100/20 dark:border-gray-800 p-4 rounded-3xl mb-3">
                                            <View className="flex-row items-center gap-3 mb-3">
                                                <View className="bg-orange-500/10 p-2 rounded-xl">
                                                    <School size={16} color="#FF6900" />
                                                </View>
                                                <View>
                                                    <Text className="text-gray-900 dark:text-white font-black text-sm">{formatClassLabel(cls)}</Text>
                                                    <Text className="text-gray-450 dark:text-gray-500 text-[10px]">Class Teacher Designated Scoping</Text>
                                                </View>
                                            </View>
                                            
                                            <View className="flex-row gap-2 mt-2">
                                                <TouchableOpacity 
                                                    onPress={() => router.push("/(teacher)/classes" as any)}
                                                    className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 py-2.5 rounded-xl items-center active:bg-[#F6F8FA] dark:active:bg-gray-900"
                                                >
                                                    <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs">Attendance & Roster</Text>
                                                </TouchableOpacity>
                                                
                                                <TouchableOpacity 
                                                    onPress={() => router.push("/(teacher)/students" as any)}
                                                    className="flex-1 bg-[#FF6900] py-2.5 rounded-xl items-center active:bg-orange-600"
                                                >
                                                    <Text className="text-white font-bold text-xs">Student Profiles</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <View className="items-center justify-center py-6 bg-gray-50 dark:bg-[#161B22] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                        <Text className="text-gray-400 dark:text-gray-550 text-xs font-semibold">No assigned classes as Class Teacher</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* --- 4. Today's Schedule --- */}
                    <View className="flex-row justify-between items-end mb-4 ">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white">
                            Today&apos;s Schedule
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/(teacher)/management/timetable" as any)}>
                            <Text className="text-[#FF6900] font-semibold">View All</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="small" color="#FF6900" className="my-8" />
                    ) : schedule.length === 0 ? (
                        <View className="bg-white dark:bg-[#161B22] p-8 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 items-center justify-center mb-6">
                            <Calendar size={32} color="#D1D5DB" />
                            <Text className="text-gray-400 dark:text-gray-550 mt-2 font-medium">No classes today</Text>
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="flex-row mb-6 -mx-4 px-4 pb-4"
                        >
                            {schedule.map((item: any) => (
                                <View 
                                    key={item.id} 
                                    style={{
                                        boxShadow: [{
                                            offsetX: 0,
                                            offsetY: 1,
                                            blurRadius: 2,
                                            color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)',
                                        }],
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: isDark ? 0.4 : 0.08,
                                        shadowRadius: 2,
                                        elevation: 2,
                                    }}
                                    className="bg-white dark:bg-[#161B22] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mr-4 w-64"
                                >
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
                                    <Text className="text-gray-650 dark:text-gray-300 text-sm">
                                        {item.classes?.name} {item.room_number ? ` \u00B7 Room ${item.room_number}` : ''}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* --- 5. Quick Actions Grid --- */}
                    <View className="mt-2">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Quick Actions
                        </Text>
                        <View className="flex-row flex-wrap justify-between">
                            <View className="w-[48%] ">
                                <QuickAction
                                    icon={GraduationCap}
                                    label="Grades"
                                    color={isDark ? "#ff6900" : "#1a1a1a"}
                                    onPress={() => router.push("/(teacher)/management/grades" as any)}
                                />
                            </View>
                            <View className="w-[48%]">
                                <SubscriptionGate>
                                    <QuickAction
                                        icon={School}
                                        label="Classes"
                                        color="#8b5cf6"
                                        onPress={() => router.push("/(teacher)/classes" as any)}
                                    />
                                </SubscriptionGate>
                            </View>
                            <View className="w-[48%]">
                                <QuickAction
                                    icon={ArrowRight}
                                    label="Assignments"
                                    color="#f43f5e"
                                    onPress={() => router.push("/(teacher)/management/assignments" as any)}
                                />
                            </View>
                            <View className="w-[48%]">
                                <SubscriptionGate>
                                    <QuickAction
                                        icon={MessageSquare}
                                        label="Messages"
                                        color="#0891b2"
                                        onPress={() => router.push("/(teacher)/management/messages" as any)}
                                    />
                                </SubscriptionGate>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
