import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { router } from "expo-router";
import {
    BarChart3,
    BookOpen,
    CalendarCheck,
    ChevronRight,
    ClipboardList,
    FileText,
    Shield
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
}

const FeatureCard = ({ icon: Icon, title, description, color, bgColor, darkBgColor, route, badge, isDark }: FeatureCardProps) => (
    <TouchableOpacity
        style={{
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            borderColor: isDark ? '#2c2c2c' : '#f3f4f6',
            borderWidth: 1,
            borderRadius: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
        }}
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
                {badge && (
                    <View style={{ marginLeft: 8, backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                        <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{badge}</Text>
                    </View>
                )}
            </View>
            <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 13, marginTop: 2 }}>{description}</Text>
        </View>
        <ChevronRight size={20} color={isDark ? '#4b5563' : '#9CA3AF'} />
    </TouchableOpacity>
);

export default function AdminManagement() {
    const { stats, loading } = useDashboardStats();
    const { isDark } = useTheme();

    const getStatValue = (label: string) => stats.find(s => s.label === label)?.value || "0";

    const features = [
        {
            icon: BarChart3,
            title: "System Analytics",
            description: "View system-wide performance and stats",
            color: "#3b82f6",
            bgColor: "#dbeafe",
            darkBgColor: "#1e3a5f",
            route: "/(admin)/management/analytics"
        },
        {
            icon: BookOpen,
            title: "Library Management",
            description: "Manage books and resources",
            color: "#eab308",
            bgColor: "#fef9c3",
            darkBgColor: "#3d3000",
            route: "/(admin)/management/library"
        },
        {
            icon: ClipboardList,
            title: "Subjects & Curricula",
            description: "Manage subjects and course structures",
            color: "#8b5cf6",
            bgColor: "#ede9fe",
            darkBgColor: "#2e1065",
            route: "/(admin)/management/subjects"
        },
        {
            icon: Shield,
            title: "Roles & Permissions",
            description: "Configure system access levels",
            color: "#ec4899",
            bgColor: "#fce7f3",
            darkBgColor: "#4a0028",
            route: "/(admin)/management/roles"
        },
        {
            icon: FileText,
            title: "Reports & Logs",
            description: "View activity logs and generate reports",
            color: "#64748b",
            bgColor: "#f1f5f9",
            darkBgColor: "#1e2a35",
            route: "/(admin)/finance/bursaries/reports"
        },
        {
            icon: CalendarCheck,
            title: "Attendance Management",
            description: "View and manage staff attendance",
            color: "#10b981",
            bgColor: "#d1fae5",
            darkBgColor: "#052e16",
            route: "/(admin)/attendance/teachers"
        }
    ];

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
            <UnifiedHeader
                title="System"
                subtitle="Management"
                role="Admin"
                onBack={() => router.back()}
            />
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16 }}>
                    {/* Quick Stats Row */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                        {/* System Status */}
                        <View style={{
                            flex: 1, padding: 16, borderRadius: 24,
                            backgroundColor: isDark ? '#1e1e1e' : '#111827',
                            borderWidth: isDark ? 1 : 0,
                            borderColor: '#2c2c2c',
                        }}>
                            <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                System Status
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 8 }} />
                                <Text style={{ color: 'white', fontSize: 17, fontWeight: 'bold' }}>Healthy</Text>
                            </View>
                        </View>

                        {/* Total Students */}
                        <View style={{ flex: 1, padding: 16, borderRadius: 24, backgroundColor: '#2563eb' }}>
                            <Text style={{ color: '#bfdbfe', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Students
                            </Text>
                            <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 4, letterSpacing: -0.5 }}>
                                {loading ? "..." : getStatValue("Total Students")}
                            </Text>
                        </View>

                        {/* Teachers — always orange, brand color */}
                        <View style={{ flex: 1, padding: 16, borderRadius: 24, backgroundColor: '#FF6B00' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Teachers
                            </Text>
                            <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 4, letterSpacing: -0.5 }}>
                                {loading ? "..." : getStatValue("Teachers")}
                            </Text>
                        </View>
                    </View>

                    {/* Feature Cards */}
                    <Text style={{ color: isDark ? '#f1f1f1' : '#111827', fontSize: 17, fontWeight: 'bold', marginBottom: 12, letterSpacing: -0.3 }}>
                        System Tools
                    </Text>
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} isDark={isDark} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}