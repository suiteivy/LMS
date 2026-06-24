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
import { ScrollView, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/libs/supabase";

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
            className={`bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-3 flex-row items-center`}
            // onPress={() => {
            //     if (isDisabled) {
            //         Alert.alert("Demo Mode", "This feature is not available in demo mode. Please create an account to access it.");
            //         return;
            //     }
            //     router.push(route as any);
            // }}
            // activeOpacity={isDisabled ? 1 : 0.7}
        >
            <View style={{ backgroundColor: bgColor }} className="w-10 h-10 items-center justify-center rounded-xl mr-3 dark:opacity-80">
                <Icon size={20} color={color} />
            </View>
            <View className="flex-1 pr-2">
                <View className="flex-row items-center">
                    <Text className="text-gray-900 dark:text-gray-100 font-bold text-base tracking-tight">{title}</Text>
                    {tooltipId ? <HelpTooltip id={tooltipId} role="teacher" tier={tier} onLearnMore={(a) => router.push({ pathname: '/(teacher)/settings', params: { manual: '1', anchor: a || 'reports-ops' } } as any)} /> : null}
                    {badge && (
                        <View className="ml-2 bg-[#FF6900] px-2 py-0.5 rounded-md">
                            <Text className="text-white text-[8px] font-bold uppercase tracking-widest">{badge}</Text>
                        </View>
                    )}
                </View>
                <Text className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{description}</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
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
            bgColor: "#ffedd5",
            route: "/(teacher)/management/grades",
            badge: "Action Required",
            tooltipId: 'teacher.manage.performance',
            tier:""
        },
        {
            icon: ClipboardList,
            title: "Assignments",
            description: "Assignments and submissions",
            color: "#FF6900",
            bgColor: "#ffedd5",
            route: "/(teacher)/management/assignments",
            tooltipId: 'teacher.manage.coursework',
            tier:""
        },
        {
            icon: CalendarCheck,
            title: "Attendance",
            description: "Mark and track student attendance",
            color: "#8b5cf6",
            bgColor: "#ede9fe",
            route: "/(teacher)/management/attendance",
            tooltipId: 'teacher.manage.registrar',
            tier:""
        },
        {
            icon: Megaphone,
            title: "Broadcast",
            description: "Post updates to your classes",
            color: "#ec4899",
            bgColor: "#fce7f3",
            route: "/(teacher)/management/announcements",
            tooltipId: 'teacher.manage.announcements',
            tier:""
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
            tooltipId: 'teacher.manage.insights',
            tier:""
        },
        {
            icon: Wallet,
            title: "Finance",
            description: "View payment history and earnings",
            color: "#22c55e",
            bgColor: "#dcfce7",
            route: "/(teacher)/management/earnings",
            tooltipId: 'teacher.manage.finance',
            tier:""
        },
        {
            icon: BookOpen,
            title: "Resource Bank",
            description: "Upload and manage Subject materials",
            color: "#eab308",
            bgColor: "#fef9c3",
            route: "/(teacher)/management/resources",
            tooltipId: 'teacher.manage.resources',
            tier:""
        },
        {
            icon: PenLine,
            title: "Grade Entry",
            description: "Enter and manage grades for your subjects",
            color: "#3b82f6",
            bgColor: "#dbeafe",
            route: "/(teacher)/management/grade-entry",
            tooltipId: 'teacher.manage.grade_entry',
            tier:""
        },
        {
            icon: Award,
            title: "Report Cards",
            description: "View and manage student report cards",
            color: "#8b5cf6",
            bgColor: "#ede9fe",
            route: "/(teacher)/management/report-cards",
            tooltipId: 'teacher.manage.report_cards',
            tier:""
        },
        {
            icon: MessageSquare,
            title: "Direct Connect",
            description: "Chat with students and Parents/Guardians",
            color: "#0891b2",
            bgColor: "#ecfeff",
            route: "/(teacher)/management/messages",
            tooltipId: 'teacher.manage.messages',
            tier:""
        },
        ...(hasDiary ? [{
            icon: BookOpen,
            title: "Virtual Diary",
            description: "Log daily classroom activities",
            color: "#f59e0b",
            bgColor: "#fef3c7",
            route: "/(teacher)/management/diary",
            tooltipId: 'teacher.manage.diary',
            tier:""
        }] : [])
    ];

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
            <UnifiedHeader
                title="Management"
                subtitle="Management"
                role="Teacher"
                onBack={() => router.back()}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
            >
                <View className="px-5 pt-4">
                    {/* Header Text */}
                    <View className="mb-6">
                        <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">Faculty Hub</Text>
                        <Text className="text-gray-900 dark:text-white font-black text-3xl">Academic Tools</Text>
                    </View>

                    {/* Feature Cards */}
                    <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">Management Suite</Text>
                    
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} tier={tier} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
