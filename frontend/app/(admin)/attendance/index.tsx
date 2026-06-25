import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "expo-router";
import { Users, GraduationCap, ChevronRight } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function AttendanceLanding() {
    const router = useRouter();
    const { isDark } = useTheme();

    const surface = isDark ? '#161B22' : '#F6F8FA';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    const modules = [
        {
            id: 'students',
            title: 'Student Attendance',
            subtitle: 'Track student daily presence institution-wide',
            icon: GraduationCap,
            color: '#FF6B00',
            route: '/(admin)/attendance/students'
        },
        {
            id: 'teachers',
            title: 'Teacher Attendance',
            subtitle: 'Monitor teacher punctuality and leave status',
            icon: Users,
            color: '#7C3AED',
            route: '/(admin)/attendance/teachers'
        }
    ];

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0D1117' : '#FFFFFF' }}>
            <UnifiedHeader
                title="Management"
                subtitle="Attendance Center"
                role="Admin"
                onBack={() => router.back()}
                showNotification={true}
            />

            <ScrollView style={{ flex: 1, padding: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                    Attendance Modules
                </Text>

                {modules.map(module => (
                    <TouchableOpacity
                        key={module.id}
                        onPress={() => router.push(module.route as any)}
                        style={{
                            backgroundColor: surface,
                            padding: 20,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: border,
                            marginBottom: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            }}
                    >
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            backgroundColor: isDark ? '#1C2128' : '#EAEEF2',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 16
                        }}>
                            <module.icon size={28} color={module.color} />
                        </View>
                        
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary }}>
                                {module.title}
                            </Text>
                            <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
                                {module.subtitle}
                            </Text>
                        </View>

                        <ChevronRight size={20} color={textSecondary} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
