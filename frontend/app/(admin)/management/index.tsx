import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useTheme } from "@/contexts/ThemeContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { router } from "expo-router";
import {
    BarChart3,
    BookOpen,
    Calendar,
    CalendarCheck,
    ChevronRight,
    ClipboardList,
    DoorClosedLocked,
    FileCheck2,
    FileText,
    GraduationCap,
    Shield,
} from 'lucide-react-native';
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface FeatureCardProps {
    icon: any;
    title: string;
    description: string;
    color: string;
    bgColor: string;
    darkBgColor?: string;
    route: string;
    badge?: string;
    isDark: boolean;
    tooltipId?: any;
    tier: any;
}

const FeatureCard = ({ icon: Icon, title, description, color, bgColor, darkBgColor, route, badge, isDark, tooltipId, tier }: FeatureCardProps) => (
    <TouchableOpacity
        className="flex-row items-center p-4 mb-3 rounded-2xl bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D]"
        onPress={() => {
            if (route === '#') {
                alert('Coming Soon');
            } else {
                router.push(route as any);
            }
        }}
        activeOpacity={0.7}
    >
        <View style={{ backgroundColor: isDark ? (darkBgColor ?? bgColor) : bgColor, padding: 12, borderRadius: 12, marginRight: 16 }}>
            <Icon size={24} color={color} />
        </View>
        <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: isDark ? '#f1f1f1' : '#111827', fontWeight: 'bold', fontSize: 15 }}>{title}</Text>
                {tooltipId ? <HelpTooltip id={tooltipId} role="admin" tier={tier} onLearnMore={(a) => router.push({ pathname: '/(admin)/settings/settings', params: { manual: '1', anchor: a || 'reports-ops' } } as any)} /> : null}
                {badge && (
                    <View style={{ marginLeft: 8, backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                        <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{badge}</Text>
                    </View>
                )}
            </View>
            <Text className="text-gray-500 dark:text-gray-400 text-[13px] mt-1">{description}</Text>
        </View>
        <ChevronRight size={20} color={isDark ? '#4b5563' : '#9CA3AF'} />
    </TouchableOpacity>
);

export default function AdminManagement() {
    const { stats, loading } = useDashboardStats();
    const { isDark } = useTheme();
    const tier = useSubscriptionTier();

    const getStatValue = (label: string) => stats.find(s => s.label === label)?.value || "0";

    const features = [
        {
            icon: BarChart3,
            title: "System Analytics",
            description: tier.hasAnalytics
                ? "View system-wide performance and stats"
                : "Requires Analytics add-on to unlock advanced insights",
            color: "#3b82f6",
            bgColor: "#dbeafe",
            darkBgColor: "#1e3a5f",
            route: tier.hasAnalytics ? "/(admin)/management/analytics" : "/(admin)/request-feature",
            badge: tier.hasAnalytics ? undefined : "Add-on",
            tooltipId: 'admin.manage.analytics'
        },
        {
            icon: BookOpen,
            title: "Library Management",
            description: "Manage books and resources",
            color: "#eab308",
            bgColor: "#fef9c3",
            darkBgColor: "#3d3000",
            route: "/(admin)/management/library",
            tooltipId: 'admin.manage.library'
        },
        {
            icon: ClipboardList,
            title: "Subjects & Curricula",
            description: "Manage subjects and course structures",
            color: "#8b5cf6",
            bgColor: "#ede9fe",
            darkBgColor: "#2e1065",
            route: "/(admin)/management/subjects",
            tooltipId: 'admin.manage.subjects'
        },
        {
            icon: Shield,
            title: "Roles & Permissions",
            description: "Configure system access levels",
            color: "#ec4899",
            bgColor: "#fce7f3",
            darkBgColor: "#4a0028",
            route: "/(admin)/management/roles",
            tooltipId: 'admin.manage.roles'
        },
        {
            icon: FileText,
            title: "Reports & Logs",
            description: "View activity logs and generate reports",
            color: "#64748b",
            bgColor: "#f1f5f9",
            darkBgColor: "#1e2a35",
            route: "/(admin)/finance/bursaries/reports",
            tooltipId: 'admin.manage.reports'
        },
        {
            icon: CalendarCheck,
            title: "Attendance Management",
            description: "View and manage staff attendance",
            color: "#10b981",
            bgColor: "#d1fae5",
            darkBgColor: "#052e16",
            route: "/(admin)/attendance/teachers",
            tooltipId: 'admin.manage.attendance'
        },
        {
            icon: DoorClosedLocked,
            title: "Class Management",
            description: "Manage classes and streams",
            color: "#10b981",
            bgColor: "#d1fae5",
            darkBgColor: "#052e16",
            route: "/(admin)/classes",
            tooltipId: 'admin.manage.classes'
        },
        {
            icon: Calendar,
            title: "Timetable Builder",
            description: "Create schedules and check for conflicts",
            color: "#FF6900",
            bgColor: "#fff0e6",
            darkBgColor: "#3d1a00",
            route: "/(admin)/timetable",
            tooltipId: 'admin.manage.timetable'
        },
        {
            icon: FileCheck2,
            title: "Resource Approvals",
            description: "Review and approve teacher-uploaded resources",
            color: "#0ea5e9",
            bgColor: "#e0f2fe",
            darkBgColor: "#0c2340",
            route: "/(admin)/management/resources",
            tooltipId: 'admin.manage.resources'
        },
        {
            icon: GraduationCap,
            title: "Academic Setup",
            description: "Manage academic years, terms, grading scales, and assessment types",
            color: "#8b5cf6",
            bgColor: "#ede9fe",
            darkBgColor: "#2e1065",
            route: "/(admin)/academic-setup",
            tooltipId: 'admin.manage.academic_setup'
        },
        {
            icon: ClipboardList,
            title: "Results & Report Cards",
            description: "Grade completeness, publish, and release report cards",
            color: "#f59e0b",
            bgColor: "#fef3c7",
            darkBgColor: "#3d3000",
            route: "/(admin)/results",
            tooltipId: 'admin.manage.results'
        }
    ];

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
            <UnifiedHeader
                title="System"
                subtitle="Management"
                role="Admin"
                onBack={() => router.back()}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    {/* Quick Stats Row */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                        {/* Total Students */}
                        <View className="flex-1 p-4 rounded-3xl bg-[#2563eb]">
                            <Text className="text-[#bfdbfe] text-[10px] font-bold uppercase tracking-widest">
                                Students
                            </Text>
                            <Text className="text-white text-2xl font-black mt-1 tracking-tight">
                                {loading ? "..." : getStatValue("Total Students")}
                            </Text>
                        </View>

                        {/* Teachers — always orange, brand color */}
                        <View className="flex-1 p-4 rounded-3xl bg-[#FF6900]">
                            <Text className="text-white/75 text-[10px] font-bold uppercase tracking-widest">
                                Teachers
                            </Text>
                            <Text className="text-white text-2xl font-black mt-1 tracking-tight">
                                {loading ? "..." : getStatValue("Teachers")}
                            </Text>
                        </View>
                    </View>

                    {/* Feature Cards */}
                    <Text className="text-gray-900 dark:text-white text-lg font-bold mb-3 tracking-tight">
                        System Tools
                    </Text>
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} isDark={isDark} tier={tier} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
