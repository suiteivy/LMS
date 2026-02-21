import { UnifiedHeader } from "@/components/common/UnifiedHeader";
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
    Wallet
} from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface FeatureCardProps {
    icon: any;
    title: string;
    description: string;
    color: string;
    bgColor: string;
    route: string;
    badge?: string;
}

const FeatureCard = ({ icon: Icon, title, description, color, bgColor, route, badge }: FeatureCardProps) => {
    return (
        <TouchableOpacity
            className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm mb-4 flex-row items-center active:bg-gray-50"
            onPress={() => router.push(route as any)}
        >
            <View style={{ backgroundColor: bgColor }} className="p-3.5 rounded-2xl mr-4 shadow-sm dark:opacity-90">
                <Icon size={24} color={color} />
            </View>
            <View className="flex-1">
                <View className="flex-row items-center">
                    <Text className="text-gray-900 dark:text-gray-100 font-bold text-base tracking-tight">{title}</Text>
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
    const features: FeatureCardProps[] = [
        {
            icon: GraduationCap,
            title: "Performance",
            description: "Grades and assessment tracking",
            color: "#FF6900",
            bgColor: "#f3f4f6",
            route: "/(teacher)/management/grades",
            badge: "Action Required"
        },
        {
            icon: ClipboardList,
            title: "Coursework",
            description: "Assignments and submissions",
            color: "#f97316",
            bgColor: "#ffedd5",
            route: "/(teacher)/management/assignments"
        },
        {
            icon: CalendarCheck,
            title: "Registrar",
            description: "Mark and track student attendance",
            color: "#8b5cf6",
            bgColor: "#ede9fe",
            route: "/(teacher)/management/attendance"
        },
        {
            icon: Megaphone,
            title: "Broadcasting",
            description: "Post updates to your classes",
            color: "#ec4899",
            bgColor: "#fce7f3",
            route: "/(teacher)/management/announcements"
        },
        {
            icon: BarChart3,
            title: "Insights",
            description: "Track performance and statistics",
            color: "#3b82f6",
            bgColor: "#dbeafe",
            route: "/(teacher)/management/analytics"
        },
        {
            icon: Wallet,
            title: "Finance",
            description: "View payment history and earnings",
            color: "#22c55e",
            bgColor: "#dcfce7",
            route: "/(teacher)/management/earnings"
        },
        {
            icon: BookOpen,
            title: "Academic Vault",
            description: "Upload and manage Subject materials",
            color: "#eab308",
            bgColor: "#fef9c3",
            route: "/(teacher)/management/resources"
        },
        {
            icon: MessageSquare,
            title: "Direct Connect",
            description: "Chat with students and parents",
            color: "#0891b2",
            bgColor: "#ecfeff",
            route: "/(teacher)/management/messages"
        }
    ];

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Intelligence"
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
                        <View className="flex-1 bg-gray-900 dark:bg-[#1a1a1a] p-6 rounded-[32px] shadow-lg border border-transparent dark:border-gray-800">
                            <Text className="text-white/40 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">Pending</Text>
                            <Text className="text-white text-3xl font-bold mt-1">12</Text>
                        </View>
                        <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
                            <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">Submitted</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-bold mt-1">28</Text>
                        </View>
                    </View>

                    {/* Feature Cards */}
                    <View className="px-2 mb-4">
                        <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Management Suite</Text>
                    </View>
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
