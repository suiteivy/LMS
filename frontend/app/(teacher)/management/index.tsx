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
    PenLine,
    Award,
    Wallet
} from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import React, { useEffect, useState } from "react";

interface FeatureCardProps {
    icon: any;
    title: string;
    description: string;
    color: string;
    bgColor: string;
    route: string;
    badge?: string;
    tooltipId?: any;
    tier: any;
}

const FeatureCard = ({ icon: Icon, title, description, color, bgColor, route, badge, tooltipId, tier }: FeatureCardProps) => {
    return (
        <TouchableOpacity
            className="bg-white dark:bg-navy-surface p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm mb-4 flex-row items-center active:bg-gray-50"
            onPress={() => router.push(route as any)}
        >
            <View style={{ backgroundColor: bgColor }} className="p-3.5 rounded-2xl mr-4 shadow-sm dark:opacity-90">
                <Icon size={24} color={color} />
            </View>
            <View className="flex-1">
                <View className="flex-row items-center">
                    <Text className="text-gray-900 dark:text-gray-100 font-bold text-base tracking-tight">{title}</Text>
                    {tooltipId ? <HelpTooltip id={tooltipId} role="teacher" tier={tier} onLearnMore={(a) => router.push({ pathname: '/(teacher)/settings', params: { manual: '1', anchor: a || 'reports-ops' } } as any)} /> : null}
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
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [submittedCount, setSubmittedCount] = useState<number | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        if (teacherId || isDemo) {
            fetchSubmissionStats();
        } else {
            setStatsLoading(false);
        }
    }, [teacherId, isDemo]);

    const fetchSubmissionStats = async () => {
        try {
            setStatsLoading(true);
            if (isDemo) {
                setPendingCount(12);
                setSubmittedCount(28);
                return;
            }

            if (!isDemo && !teacherId) {
                setPendingCount(0);
                setSubmittedCount(0);
                return;
            }

            // Guard: verify teacher has assigned subjects before querying submissions
            const { data: primarySubjects } = await supabase
                .from('subjects')
                .select('id')
                .eq('teacher_id', teacherId!);

            const { data: assocSubjects } = await supabase
                .from('subject_teachers')
                .select('subject_id')
                .eq('teacher_id', teacherId!);

            const hasSubjects = (primarySubjects || []).length > 0 || (assocSubjects || []).length > 0;
            if (!hasSubjects) {
                setPendingCount(0);
                setSubmittedCount(0);
                return;
            }

            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('assignments')
                .select('id')
                .eq('teacher_id', teacherId!);

            if (assignmentsError) throw assignmentsError;

            const assignmentIds = (assignmentsData || []).map((a: any) => a.id);

            if (assignmentIds.length === 0) {
                setPendingCount(0);
                setSubmittedCount(0);
                return;
            }

            const { count: pending, error: pendingErr } = await supabase
                .from('submissions')
                .select('id', { count: 'exact', head: true })
                .in('assignment_id', assignmentIds)
                .neq('status', 'graded');

            if (pendingErr) throw pendingErr;

            const { count: submitted, error: submittedErr } = await supabase
                .from('submissions')
                .select('id', { count: 'exact', head: true })
                .in('assignment_id', assignmentIds);

            if (submittedErr) throw submittedErr;

            setPendingCount(pending || 0);
            setSubmittedCount(submitted || 0);
        } catch (error) {
            console.error("Error fetching submission stats:", error);
            setPendingCount(0);
            setSubmittedCount(0);
        } finally {
            setStatsLoading(false);
        }
    };

    const features: FeatureCardProps[] = [
        {
            icon: GraduationCap,
            title: "Performance",
            description: "Grades and assessment tracking",
            color: "#FF6900",
            bgColor: "#f3f4f6",
            route: "/(teacher)/management/grades",
            badge: "Action Required",
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
            description: hasAnalytics
                ? "Track performance and statistics"
                : "Requires Analytics add-on",
            color: "#3b82f6",
            bgColor: "#dbeafe",
            route: hasAnalytics ? "/(teacher)/management/analytics" : "/(admin)/request-feature",
            badge: hasAnalytics ? undefined : "Add-on",
            tooltipId: 'teacher.manage.insights'
        },
        {
            icon: Wallet,
            title: "Finance",
            description: "View payment history and earnings",
            color: "#22c55e",
            bgColor: "#dcfce7",
            route: "/(teacher)/management/earnings",
            tooltipId: 'teacher.manage.finance'
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
            icon: PenLine,
            title: "Grade Entry",
            description: "Enter and manage grades for your subjects",
            color: "#3b82f6",
            bgColor: "#dbeafe",
            route: "/(teacher)/management/grade-entry",
            tooltipId: 'teacher.manage.grade_entry'
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
        }] : [])
    ];

    return (
        <View className="flex-1 bg-gray-50 dark:bg-navy">
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
                    <View className="mb-8 px-2">
                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-[3px] mb-2">Faculty Hub</Text>
                        <Text className="text-gray-900 dark:text-white font-bold text-3xl tracking-tight">Academic Tools</Text>
                    </View>

                    {/* Quick Stats Row */}
                    <View className="flex-row gap-4 mb-8">
                        <View className="flex-1 bg-gray-900 dark:bg-navy-surface p-6 rounded-[32px] shadow-lg border border-transparent dark:border-gray-800 justify-center">
                            <Text className="text-white/40 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">Pending</Text>
                            {statsLoading ? (
                                <ActivityIndicator size="small" color="white" className="mt-2" style={{ alignSelf: 'flex-start' }} />
                            ) : (
                                <Text className="text-white text-3xl font-bold mt-1">{pendingCount ?? 0}</Text>
                            )}
                        </View>
                        <View className="flex-1 bg-white dark:bg-navy-surface p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm justify-center">
                            <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">Submitted</Text>
                            {statsLoading ? (
                                <ActivityIndicator size="small" color="#FF6900" className="mt-2" style={{ alignSelf: 'flex-start' }} />
                            ) : (
                                <Text className="text-gray-900 dark:text-white text-3xl font-bold mt-1">{submittedCount ?? 0}</Text>
                            )}
                        </View>
                    </View>

                    {/* Feature Cards */}
                    <View className="px-2 mb-4">
                        <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Management Suite</Text>
                    </View>
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} tier={tier} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
