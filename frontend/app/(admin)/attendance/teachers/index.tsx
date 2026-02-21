import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { TeacherAttendance, TeacherAttendanceAPI } from "@/services/TeacherAttendanceService";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from "expo-router";
import { Calendar as CalendarIcon, Check, Clock, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

const DEMO_ATTENDANCE: TeacherAttendance[] = [
    { id: "ATT1", teacher_id: "T1", status: "present", date: new Date().toISOString(), notes: "", teachers: { id: "T1", users: { full_name: "Isaac Newton", avatar_url: undefined } } },
    { id: "ATT2", teacher_id: "T2", status: "absent", date: new Date().toISOString(), notes: "On medical leave", teachers: { id: "T2", users: { full_name: "Marie Curie", avatar_url: undefined } } },
    { id: "ATT3", teacher_id: "T3", status: "late", date: new Date().toISOString(), notes: "Arrived at 8:15 AM", teachers: { id: "T3", users: { full_name: "Albert Einstein", avatar_url: undefined } } },
];

export default function TeacherAttendancePage() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const surface = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#f3f4f6';
    const textPrimary = isDark ? '#f1f1f1' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';

    useEffect(() => { loadAttendance(); }, [date]);

    const loadAttendance = async () => {
        setLoading(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const data = await TeacherAttendanceAPI.getAttendance(dateStr);
            setAttendance(data.length > 0 ? data : DEMO_ATTENDANCE);
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
            const dateStr = date.toISOString().split('T')[0];
            await TeacherAttendanceAPI.markAttendance({ teacher_id: teacherId, date: dateStr, status, notes: "" });
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
            loadAttendance();
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const statusConfig = (status: string) => {
        switch (status) {
            case 'present': return { dot: '#10b981', activeBg: isDark ? '#052e16' : '#dcfce7', activeBorder: '#10b981' };
            case 'absent': return { dot: '#ef4444', activeBg: isDark ? 'rgba(239,68,68,0.12)' : '#fee2e2', activeBorder: '#ef4444' };
            case 'late': return { dot: '#f59e0b', activeBg: isDark ? '#3d2000' : '#fef9c3', activeBorder: '#f59e0b' };
            default: return { dot: isDark ? '#2c2c2c' : '#d1d5db', activeBg: 'transparent', activeBorder: border };
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
            <UnifiedHeader
                title="Management"
                subtitle="Attendance"
                role="Admin"
                onBack={() => router.back()}
                showNotification={false}
            />

            {showDatePicker && (
                <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
            )}

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#FF6B00" />
                </View>
            ) : (
                <ScrollView style={{ flex: 1, padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed',
                            paddingHorizontal: 12, paddingVertical: 8,
                            borderRadius: 12, borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,107,0,0.2)' : '#fed7aa',
                        }}
                    >
                        <CalendarIcon size={16} color="#FF6B00" />
                        <Text style={{ color: '#FF6B00', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>
                            {date.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>
                </View>
                    {attendance.map(item => {
                        const config = statusConfig(item.status);
                        return (
                            <View key={item.teacher_id} style={{ backgroundColor: surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: border, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                {/* Avatar + Name */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? '#242424' : '#f3f4f6', marginRight: 12, overflow: 'hidden', flexShrink: 0 }}>
                                        {item.teachers?.users?.avatar_url ? (
                                            <Image source={{ uri: item.teachers.users.avatar_url }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed' }}>
                                                <Text style={{ color: '#FF6B00', fontWeight: 'bold', fontSize: 16 }}>
                                                    {item.teachers?.users?.full_name?.charAt(0) || "T"}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: textPrimary }} numberOfLines={1}>
                                            {item.teachers?.users?.full_name || "Unknown Teacher"}
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