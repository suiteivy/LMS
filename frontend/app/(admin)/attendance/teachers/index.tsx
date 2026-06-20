import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { TeacherAttendance, TeacherAttendanceAPI } from "@/services/TeacherAttendanceService";
import { DatePicker } from '@/components/common/DatePicker';
import { useRouter } from "expo-router";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { Calendar as CalendarIcon, Check, Clock, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function TeacherAttendancePage() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
    const [date, setDate] = useState(new Date());

    const surface = isDark ? '#13103A' : '#ffffff';
    const border = isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
    const textPrimary = isDark ? '#f1f1f1' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';

    useEffect(() => { loadAttendance(); }, [date]);

    // Live updates for teacher attendance changes
    useRealtimeQuery('teacher_attendance', () => {
        loadAttendance();
    });

    const getLocalDateString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const loadAttendance = async () => {
        setLoading(true);
        try {
            const dateStr = getLocalDateString(date);
            const data = await TeacherAttendanceAPI.getAttendance(dateStr);
            setAttendance(data);
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Failed to load attendance");
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (teacherId: string, status: string) => {
        try {
            setAttendance(prev => prev.map(a => a.teacher_id === teacherId ? { ...a, status: status as any } : a));
            const dateStr = getLocalDateString(date);
            await TeacherAttendanceAPI.markAttendance({ teacher_id: teacherId, date: dateStr, status, notes: "" });
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
            loadAttendance();
        }
    };

    const statusConfig = (status: string) => {
        switch (status) {
            case 'present': return { dot: '#10b981', activeBg: isDark ? '#052e16' : '#dcfce7', activeBorder: '#10b981' };
            case 'absent': return { dot: '#ef4444', activeBg: isDark ? 'rgba(239,68,68,0.12)' : '#fee2e2', activeBorder: '#ef4444' };
            case 'late': return { dot: '#f59e0b', activeBg: isDark ? '#3d2000' : '#fef9c3', activeBorder: '#f59e0b' };
            default: return { dot: isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db', activeBg: 'transparent', activeBorder: border };
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F0B2E' : '#f9fafb' }}>
            <UnifiedHeader
                title="Management"
                subtitle="Attendance"
                role="Admin"
                onBack={() => router.back()}
                showNotification={false}
            />

            {/* DatePicker is always mounted to prevent unmounting/failing to select on load updates */}
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <DatePicker
                    label="Attendance Date"
                    value={getLocalDateString(date)}
                    onChange={(d) => setDate(new Date(d))}
                    isDark={isDark}
                />
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#FF6B00" />
                </View>
            ) : (
                <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}>
                    {attendance.map((item: any) => {
                        const config = statusConfig(item.status);
                        return (
                            <View key={item.teacher_id} style={{ backgroundColor: surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: border, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                {/* Avatar + Name */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? '#1A1650' : '#f3f4f6', marginRight: 12, overflow: 'hidden', flexShrink: 0 }}>
                                        {item.teachers?.users?.avatar_url || item.avatar_url ? (
                                            <Image source={{ uri: item.teachers?.users?.avatar_url || item.avatar_url }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed' }}>
                                                <Text style={{ color: '#FF6B00', fontWeight: 'bold', fontSize: 16 }}>
                                                    {item.teachers?.users?.first_name?.charAt(0) 
                                                        || item.teachers?.users?.full_name?.charAt(0) 
                                                        || item.first_name?.charAt(0) 
                                                        || item.name?.charAt(0) 
                                                        || "T"}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: textPrimary }} numberOfLines={1}>
                                            {item.teachers?.users?.first_name 
                                                ? `${item.teachers.users.first_name} ${item.teachers.users.last_name || ''}`.trim() 
                                                : (item.teachers?.users?.full_name 
                                                    || (item.first_name ? `${item.first_name} ${item.last_name || ''}`.trim() : (item.name || "Unknown Teacher")))}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: config.dot, marginRight: 6 }} />
                                            <Text style={{ fontSize: 11, color: textSecondary, textTransform: 'capitalize' }}>{item.status}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Action Buttons */}
                                <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
                                    {[
                                        { status: 'present', icon: Check, activeColor: '#10b981' },
                                        { status: 'absent', icon: X, activeColor: '#ef4444' },
                                        { status: 'late', icon: Clock, activeColor: '#f59e0b' },
                                    ].map(({ status, icon: Icon, activeColor }) => {
                                        const isActive = item.status === status;
                                        const cfg = statusConfig(status);
                                        return (
                                            <TouchableOpacity
                                                key={status}
                                                onPress={() => handleMark(item.teacher_id, status)}
                                                style={{
                                                    padding: 8, borderRadius: 10, borderWidth: 1,
                                                    backgroundColor: isActive ? cfg.activeBg : 'transparent',
                                                    borderColor: isActive ? cfg.activeBorder : border,
                                                }}
                                            >
                                                <Icon size={18} color={isActive ? activeColor : textSecondary} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}

                    {attendance.length === 0 && (
                        <Text style={{ textAlign: 'center', color: textSecondary, marginTop: 40 }}>No teachers found.</Text>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}