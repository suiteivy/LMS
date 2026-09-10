import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { router } from "expo-router";
import {
    BarChart3,
    BookOpen,
    CalendarCheck,
    ChevronRight,
    ClipboardList,
    GraduationCap,
    Megaphone,
    MessageSquare,
    Award
} from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { useTeacherRoleMode, type TeacherRoleMode } from "@/hooks/useTeacherRoleMode";
import { CacheService } from "@/services/CacheService";
import React, { useCallback, useEffect, useState } from "react";

interface FeatureCardProps {
    icon: any;
    title: string;
    description: string;
    color: string;
    bgColor: string;
    route: string;
    badge?: string;
    tooltipId?: any;
    tier?: any;
}

const FeatureCard = ({ icon: Icon, title, description, color, bgColor, route, badge, tooltipId, tier }: FeatureCardProps) => {
    return (
        <TouchableOpacity
            className="bg-white dark:bg-[#161B22] p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm mb-4 flex-row items-center active:bg-gray-50"
            onPress={() => router.push(route as any)}
        >
            <View style={{ backgroundColor: bgColor }} className="p-3.5 rounded-2xl mr-4 shadow-sm dark:opacity-90">
                <Icon size={24} color={color} />
            </View>
            <View className="flex-1">
                <View className="flex-row items-center">
                    <Text className="text-gray-900 dark:text-gray-100 font-bold text-base tracking-tight">{title}</Text>
                    {tooltipId ? <HelpTooltip id={tooltipId} role="teacher" tier={tier} onLearnMore={(a) => router.push({ pathname: '/(teacher)/accessibility/settings', params: { manual: '1', anchor: a || 'reports-ops' } } as any)} /> : null}
                    {badge && (
                        <View className="ml-2 bg-[#FF6900] px-2 py-0.5 rounded-full">
                            <Text className="text-white text-[8px] font-bold uppercase">{badge}</Text>
                        </View>
                    )}
                </View>
                <Text className="text-gray-400 text-xs font-medium mt-0.5">{description}</Text>
            </View>
            <ChevronRight size={18} color="#D1D5DB" />
        </TouchableOpacity>
    );
};

export default function ManagementIndex() {
    const tier = useSubscriptionTier();
    const { hasDiary, hasAnalytics } = tier;
    const { teacherId, isDemo } = useAuth();
    const { mode, setMode, canToggle, isSubjectTeacher, isClassTeacher, isLibrarian } = useTeacherRoleMode();
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [submittedCount, setSubmittedCount] = useState<number | null>(null);
    const [classCount, setClassCount] = useState<number | null>(null);
    const [classStudentCount, setClassStudentCount] = useState<number | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    const fetchAllStats = useCallback(async () => {
        try {
            setStatsLoading(true);
            if (isDemo) {
                setPendingCount(12);
                setSubmittedCount(28);
                setClassCount(1);
                setClassStudentCount(35);
                return;
            }

            if (!teacherId) {
                setPendingCount(0);
                setSubmittedCount(0);
                setClassCount(0);
                setClassStudentCount(0);
                return;
            }

            // 1. Fetch Subject submissions stats
            const { data: primarySubjects } = await supabase
                .from('subjects')
                .select('id')
                .eq('teacher_id', teacherId);

            const { data: assocSubjects } = await supabase
                .from('subject_teachers')
                .select('subject_id')
                .eq('teacher_id', teacherId);

            const hasSubjects = (primarySubjects || []).length > 0 || (assocSubjects || []).length > 0;
            if (hasSubjects) {
                const { data: assignmentsData } = await supabase
                    .from('assignments')
                    .select('id')
                    .eq('teacher_id', teacherId);

                const assignmentIds = (assignmentsData || []).map((a: any) => a.id);
                if (assignmentIds.length > 0) {
                    const { count: pending } = await supabase
                        .from('submissions')
                        .select('id', { count: 'exact', head: true })
                        .in('assignment_id', assignmentIds)
                        .neq('status', 'graded');

                    const { count: submitted } = await supabase
                        .from('submissions')
                        .select('id', { count: 'exact', head: true })
                        .in('assignment_id', assignmentIds);

                    setPendingCount(pending || 0);
                    setSubmittedCount(submitted || 0);
                } else {
                    setPendingCount(0);
                    setSubmittedCount(0);
                }
            } else {
                setPendingCount(0);
                setSubmittedCount(0);
            }

            // 2. Fetch Class Teacher stats
            const cacheKey = `teacher_dashboard_${teacherId}`;
            const cached = await CacheService.get<any>(cacheKey, { allowStale: true });
            let ctClasses = cached?.data?.classTeacherOf;

            if (!ctClasses) {
                const { data: directClasses } = await supabase
                    .from('classes')
                    .select('id, grade_level, form_level, stream')
                    .eq('teacher_id', teacherId);
                ctClasses = directClasses || [];
            }

            const ctClassIds = (ctClasses || []).map((c: any) => c.id);
            setClassCount(ctClassIds.length);

            if (ctClassIds.length > 0) {
                const { data: ctEnrollments } = await supabase
                    .from('class_enrollments')
                    .select('student_id')
                    .in('class_id', ctClassIds)
                    .eq('status', 'enrolled');
                const uniqueStudents = new Set((ctEnrollments || []).map((e: any) => e.student_id));
                setClassStudentCount(uniqueStudents.size);
            } else {
                setClassStudentCount(0);
            }
        } catch (error) {
            console.error("Error fetching management stats:", error);
            setPendingCount(0);
            setSubmittedCount(0);
            setClassCount(0);
            setClassStudentCount(0);
        } finally {
            setStatsLoading(false);
        }
    }, [teacherId, isDemo]);

    useEffect(() => {
        if (teacherId || isDemo) {
            fetchAllStats();
        } else {
            setStatsLoading(false);
        }
    }, [teacherId, isDemo, fetchAllStats]);

    const features: FeatureCardProps[] = [
        {
            icon: GraduationCap,
            title: "Performance",
            description: "Grade entry and assessment scoring",
            color: "#FF6900",
            bgColor: "#f3f4f6",
            route: "/(teacher)/management/grade-entry",
            tooltipId: 'teacher.manage.performance'
        },
        {
            icon: ClipboardList,
            title: "Coursework",
            description: "Assignments and submissions",
            color: "#f97316",
            bgColor: "#ffedd5",
            route: "/(teacher)/management/assignments",
            tooltipId: 'teacher.manage.coursework'
        },
        {
            icon: CalendarCheck,
            title: "Registrar",
            description: "Mark and track student attendance",
            color: "#8b5cf6",
            bgColor: "#ede9fe",
            route: "/(teacher)/management/attendance",
            tooltipId: 'teacher.manage.registrar'
        },
        {
            icon: Megaphone,
            title: "Announcements",
            description: "View school announcements and updates",
            color: "#ec4899",
            bgColor: "#fce7f3",
            route: "/(teacher)/management/announcements",
            tooltipId: 'teacher.manage.announcements'
        },
        {
            icon: BarChart3,
            title: "Insights",
            description: "Track performance and statistics",
            color: "#3b82f6",
            bgColor: "#dbeafe",
            route: "/(teacher)/management/analytics",
            tooltipId: 'teacher.manage.insights'
        },
        {
            icon: BookOpen,
            title: "Academic Vault",
            description: "Upload and manage Subject materials",
            color: "#eab308",
            bgColor: "#fef9c3",
            route: "/(teacher)/management/resources",
            tooltipId: 'teacher.manage.resources'
        },
        {
            icon: Award,
            title: "Report Cards",
            description: "View and manage student report cards",
            color: "#8b5cf6",
            bgColor: "#ede9fe",
            route: "/(teacher)/management/report-cards",
            tooltipId: 'teacher.manage.report_cards'
        },
        {
            icon: MessageSquare,
            title: "Direct Connect",
            description: "Chat with students and Parents/Guardians",
            color: "#0891b2",
            bgColor: "#ecfeff",
            route: "/(teacher)/management/messages",
            tooltipId: 'teacher.manage.messages'
        },
        ...(hasDiary ? [{
            icon: BookOpen,
            title: "Virtual Diary",
            description: "Log daily classroom activities",
            color: "#f59e0b",
            bgColor: "#fef3c7",
            route: "/(teacher)/management/diary",
            tooltipId: 'teacher.manage.diary'
        }] : []),
        ...(isLibrarian ? [{
            icon: BookOpen,
            title: "Library Circulation",
            description: "Issue & return books (Librarian Desk)",
            color: "#FF6900",
            bgColor: "#fff7ed",
            route: "/(teacher)/management/library",
            badge: "Librarian",
            tooltipId: 'teacher.manage.library'
        }] : [])
    ];

    const subjectModeRoutes = [
        '/(teacher)/management/grade-entry',
        '/(teacher)/management/assignments',
        '/(teacher)/management/attendance',
        '/(teacher)/management/resources',
        '/(teacher)/management/messages',
        '/(teacher)/management/announcements',
        '/(teacher)/management/analytics',
    ];

    const classModeRoutes = [
        '/(teacher)/management/attendance',
        '/(teacher)/management/report-cards',
        '/(teacher)/management/diary',
        '/(teacher)/management/messages',
        '/(teacher)/management/announcements',
        '/(teacher)/management/analytics',
    ];

    const librarianModeRoutes = [
        '/(teacher)/management/library',
        '/(teacher)/management/messages',
        '/(teacher)/management/announcements',
    ];

    const isRouteVisibleForMode = (route: string, roleMode: TeacherRoleMode) => {
        if (roleMode === 'subject') return subjectModeRoutes.includes(route);
        if (roleMode === 'class') return classModeRoutes.includes(route);
        return librarianModeRoutes.includes(route);
    };

    const visibleFeatures = features.filter((feature) => {
        if (feature.route === "/(teacher)/management/analytics" && !hasAnalytics) {
            return false;
        }

        return isRouteVisibleForMode(feature.route, mode);
    });

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Management"
                subtitle="Management"
                role="Teacher"
                onBack={() => router.back()}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    {/* Header Text */}
                    <View className="mb-6 px-2">
                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px] mb-2">Faculty Hub</Text>
                        <Text className="text-gray-900 dark:text-white font-bold text-3xl tracking-tight">Academic Tools</Text>
                    </View>

                    {/* Mode Selector - Tabs */}
                    {canToggle && (
                        <View className="flex-row bg-gray-100 dark:bg-[#0D1117] rounded-2xl p-1 mb-6 border border-gray-200 dark:border-gray-800 gap-1">
                            {isSubjectTeacher && (
                                <TouchableOpacity 
                                    onPress={() => setMode('subject')}
                                    className={`flex-1 py-2.5 px-2 rounded-xl items-center justify-center ${mode === 'subject' ? 'bg-[#FF6900] shadow-sm' : 'bg-transparent'}`}
                                >
                                    <Text numberOfLines={1} className={`font-bold text-[11px] uppercase tracking-wider ${mode === 'subject' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                        Subject Mode
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {isClassTeacher && (
                                <TouchableOpacity 
                                    onPress={() => setMode('class')}
                                    className={`flex-1 py-2.5 px-2 rounded-xl items-center justify-center ${mode === 'class' ? 'bg-[#FF6900] shadow-sm' : 'bg-transparent'}`}
                                >
                                    <Text numberOfLines={1} className={`font-bold text-[11px] uppercase tracking-wider ${mode === 'class' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                        Class Mode
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {isLibrarian && (
                                <TouchableOpacity 
                                    onPress={() => setMode('librarian')}
                                    className={`flex-1 py-2.5 px-2 rounded-xl items-center justify-center ${mode === 'librarian' ? 'bg-[#FF6900] shadow-sm' : 'bg-transparent'}`}
                                >
                                    <Text numberOfLines={1} className={`font-bold text-[11px] uppercase tracking-wider ${mode === 'librarian' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                        Librarian Desk
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Quick Stats Row */}
                    <View className="flex-row gap-4 mb-8">
                        <View className="flex-1 bg-gray-900 dark:bg-[#161B22] p-6 rounded-[32px] shadow-lg border border-transparent dark:border-gray-800 justify-center">
                            <Text className="text-white/40 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">
                                {mode === 'class' ? 'Designated Classes' : 'Pending'}
                            </Text>
                            {statsLoading ? (
                                <ActivityIndicator size="small" color="white" className="mt-2" style={{ alignSelf: 'flex-start' }} />
                            ) : (
                                <Text className="text-white text-3xl font-bold mt-1">
                                    {mode === 'class' ? (classCount ?? 0) : (pendingCount ?? 0)}
                                </Text>
                            )}
                        </View>
                        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm justify-center">
                            <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">
                                {mode === 'class' ? 'Class Students' : 'Submitted'}
                            </Text>
                            {statsLoading ? (
                                <ActivityIndicator size="small" color="#FF6900" className="mt-2" style={{ alignSelf: 'flex-start' }} />
                            ) : (
                                <Text className="text-gray-900 dark:text-white text-3xl font-bold mt-1">
                                    {mode === 'class' ? (classStudentCount ?? 0) : (submittedCount ?? 0)}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Feature Cards */}
                    <View className="px-2 mb-4">
                        <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Management Suite</Text>
                    </View>
                    {visibleFeatures.map((feature, index) => (
                        <FeatureCard key={index} {...feature} tier={tier} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
