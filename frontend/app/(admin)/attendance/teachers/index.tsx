import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { TeacherAttendance, AdminTeacherAttendanceAPI } from "@/services/TeacherAttendanceService";
import { DatePicker } from '@/components/common/DatePicker';
import { useRouter } from "expo-router";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { Check, Clock, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function TeacherAttendancePage() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
    const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
    const [date, setDate] = useState(new Date());

    const surface = isDark ? '#161B22' : '#F6F8FA';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

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
            const data = await AdminTeacherAttendanceAPI.getAttendance(dateStr);
            setAttendance(data);
            setPendingChanges({});
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Failed to load attendance");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkLocal = (teacherId: string, status: string) => {
        setPendingChanges(prev => ({ ...prev, [teacherId]: status }));
        setAttendance(prev => prev.map(a => a.teacher_id === teacherId ? { ...a, status: status as any, confirmation_status: 'confirmed' } : a));
    };

    const handleSave = async () => {
        const changes = Object.entries(pendingChanges);
        if (changes.length === 0) return;

        setLoading(true);
        try {
            const dateStr = getLocalDateString(date);
            await Promise.all(
                changes.map(([teacherId, status]) => 
                    AdminTeacherAttendanceAPI.markAttendance({ teacher_id: teacherId, date: dateStr, status, notes: "", confirmation_status: "confirmed" })
                )
            );
            Alert.alert("Success", "Attendance saved successfully");
            setPendingChanges({});
            loadAttendance();
        } catch (error) {
            Alert.alert("Error", "Failed to save some attendance records");
            setLoading(false);
        }
    };

    const markAllPresent = () => {
        const newChanges: Record<string, string> = {};
        const updatedAttendance = attendance.map(a => {
            if (a.status !== 'present') {
                newChanges[a.teacher_id] = 'present';
                return { ...a, status: 'present' as any, confirmation_status: 'confirmed' as const };
            }
            return a;
        });
        
        if (Object.keys(newChanges).length > 0) {
            setPendingChanges(prev => ({ ...prev, ...newChanges }));
            setAttendance(updatedAttendance);
        }
    };

    const unconfirmedCount = attendance.filter(a => a.status !== 'pending' && a.confirmation_status !== 'confirmed').length;

    const confirmAllSelfReported = async () => {
        const unconfirmedTeachers = attendance.filter(a => a.status !== 'pending' && a.confirmation_status !== 'confirmed');
        if (unconfirmedTeachers.length === 0) return;
        setLoading(true);
        try {
            const dateStr = getLocalDateString(date);
            await AdminTeacherAttendanceAPI.confirmAttendance(unconfirmedTeachers.map(t => t.teacher_id), dateStr);
            Alert.alert("Success", `Confirmed attendance for ${unconfirmedTeachers.length} teachers`);
            loadAttendance();
        } catch {
            Alert.alert("Error", "Failed to confirm self-reported attendance");
            setLoading(false);
        }
    };

    const statusConfig = (status: string) => {
        switch (status) {
            case 'present': return { dot: '#10b981', activeBg: isDark ? '#052e16' : '#dcfce7', activeBorder: '#10b981' };
            case 'absent': return { dot: '#ef4444', activeBg: isDark ? 'rgba(239,68,68,0.12)' : '#fee2e2', activeBorder: '#ef4444' };
            case 'late': return { dot: '#FF6900', activeBg: isDark ? '#3d2000' : '#fef9c3', activeBorder: '#FF6900' };
            default: return { dot: isDark ? '#21262D' : '#d1d5db', activeBg: 'transparent', activeBorder: border };
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#161B22' : '#FFFFFF' }}>
            <UnifiedHeader
                title="Management"
                subtitle="Attendance"
                role="Admin"
                onBack={() => router.back()}
                showNotification={false}
            />

            {/* DatePicker is always mounted to prevent unmounting/failing to select on load updates */}
            <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 180, marginRight: 16 }}>
                        <DatePicker
                            label="Attendance Date"
                            value={getLocalDateString(date)}
                            onChange={(d) => {
                                const newDate = new Date(d);
                                if (newDate > new Date()) {
                                    Alert.alert("Invalid Date", "Cannot mark attendance for a future date.");
                                    return;
                                }
                                setDate(newDate);
                            }}
                            isDark={isDark}
                        />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                        {unconfirmedCount > 0 && (
                            <TouchableOpacity 
                                onPress={confirmAllSelfReported}
                                style={{ backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7', borderWidth: 1, borderColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, justifyContent: 'center' }}
                            >
                                <Text style={{ color: '#d97706', fontSize: 13, fontWeight: '600' }}>Confirm Self-Reported ({unconfirmedCount})</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            onPress={markAllPresent}
                            style={{ backgroundColor: surface, borderWidth: 1, borderColor: border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, justifyContent: 'center' }}
                        >
                            <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '600' }}>Mark All Present</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={handleSave}
                            disabled={Object.keys(pendingChanges).length === 0}
                            style={{ backgroundColor: Object.keys(pendingChanges).length > 0 ? '#FF6900' : surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, justifyContent: 'center', opacity: Object.keys(pendingChanges).length > 0 ? 1 : 0.5 }}
                        >
                            <Text style={{ color: Object.keys(pendingChanges).length > 0 ? 'white' : textSecondary, fontSize: 13, fontWeight: '600' }}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
                            <View key={item.teacher_id} style={{ backgroundColor: surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: border, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                {/* Avatar + Name */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? '#161B22' : '#EAEEF2', marginRight: 12, overflow: 'hidden', flexShrink: 0 }}>
                                        {item.teachers?.users?.avatar_url || item.avatar_url ? (
                                            <Image source={{ uri: item.teachers?.users?.avatar_url || item.avatar_url }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,105,0,0.12)' : '#fff7ed' }}>
                                                <Text style={{ color: '#FF6900', fontWeight: 'bold', fontSize: 16 }}>
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
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: config.dot, marginRight: 6 }} />
                                                <Text style={{ fontSize: 11, color: textSecondary, textTransform: 'capitalize' }}>{item.status}</Text>
                                            </View>
                                            {item.status !== 'pending' && (
                                                <View style={{
                                                    paddingHorizontal: 6,
                                                    paddingVertical: 1.5,
                                                    borderRadius: 4,
                                                    backgroundColor: item.confirmation_status === 'confirmed' ? (isDark ? 'rgba(16,185,129,0.15)' : '#dcfce7') : (isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7'),
                                                    borderWidth: 1,
                                                    borderColor: item.confirmation_status === 'confirmed' ? '#10b981' : '#f59e0b',
                                                }}>
                                                    <Text style={{
                                                        fontSize: 9,
                                                        fontWeight: '700',
                                                        color: item.confirmation_status === 'confirmed' ? '#10b981' : '#d97706',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: 0.5
                                                    }}>
                                                        {item.confirmation_status === 'confirmed' ? 'Confirmed' : 'Self-Reported'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Action Buttons */}
                                <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
                                    {[
                                        { status: 'present', icon: Check, activeColor: '#10b981' },
                                        { status: 'absent', icon: X, activeColor: '#ef4444' },
                                        { status: 'late', icon: Clock, activeColor: '#FF6900' },
                                    ].map(({ status, icon: Icon, activeColor }) => {
                                        const isActive = item.status === status;
                                        const cfg = statusConfig(status);
                                        return (
                                            <TouchableOpacity
                                                key={status}
                                                onPress={() => handleMarkLocal(item.teacher_id, status)}
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
