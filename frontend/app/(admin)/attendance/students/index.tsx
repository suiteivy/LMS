import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { AttendanceService } from "@/services/AttendanceService";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from "expo-router";
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, Search, School } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View, TextInput } from "react-native";

interface Stats {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
}

export default function AdminStudentAttendance() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [stats, setStats] = useState<Stats>({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
    const [classBreakdown, setClassBreakdown] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const surface = isDark ? '#13103A' : '#ffffff';
    const border = isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
    const textPrimary = isDark ? '#f1f1f1' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';

    useEffect(() => { loadInstitutionStats(); }, [date]);

    const loadInstitutionStats = async () => {
        setLoading(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const data = await AttendanceService.getInstitutionAttendanceStats(dateStr);
            
            // Calculate Stats
            const present = data.filter((a: any) => a.status === 'present').length;
            const absent = data.filter((a: any) => a.status === 'absent').length;
            const late = data.filter((a: any) => a.status === 'late').length;
            const total = data.length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

            setStats({ total, present, absent, late, percentage });

            // Class Breakdown
            const breakdownMap = new Map();
            data.forEach((a: any) => {
                const className = a.class?.name || "Unassigned";
                if (!breakdownMap.has(className)) {
                    breakdownMap.set(className, { name: className, present: 0, absent: 0, total: 0 });
                }
                const entry = breakdownMap.get(className);
                entry.total++;
                if (a.status === 'present') entry.present++;
                if (a.status === 'absent') entry.absent++;
            });
            setClassBreakdown(Array.from(breakdownMap.values()));

        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Failed to load attendance summary");
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const filteredBreakdown = classBreakdown.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F0B2E' : '#f9fafb' }}>
            <UnifiedHeader
                title="Student Reports"
                subtitle="Daily Attendance"
                role="Admin"
                onBack={() => router.back()}
                showNotification={false}
            />

            {showDatePicker && (
                <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
            )}

            <ScrollView style={{ flex: 1, padding: 20 }}>
                {/* Date Selector */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: surface,
                            paddingHorizontal: 16, paddingVertical: 10,
                            borderRadius: 14, borderWidth: 1, borderColor: border,
                        }}
                    >
                        <CalendarIcon size={18} color="#FF6B00" />
                        <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 13, marginLeft: 8 }}>
                            {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </Text>
                    </TouchableOpacity>

                    <View style={{ backgroundColor: '#FF6B00', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>{stats.percentage}% Present</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6B00" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Summary Cards */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                            <View style={{ flex: 1, backgroundColor: surface, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: border }}>
                                <CheckCircle2 size={24} color="#10b981" />
                                <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, marginTop: 8 }}>{stats.present}</Text>
                                <Text style={{ fontSize: 11, color: textSecondary, fontWeight: '600' }}>PRESENT</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: surface, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: border }}>
                                <XCircle size={24} color="#ef4444" />
                                <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, marginTop: 8 }}>{stats.absent}</Text>
                                <Text style={{ fontSize: 11, color: textSecondary, fontWeight: '600' }}>ABSENT</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: surface, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: border }}>
                                <Clock size={24} color="#f59e0b" />
                                <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, marginTop: 8 }}>{stats.late}</Text>
                                <Text style={{ fontSize: 11, color: textSecondary, fontWeight: '600' }}>LATE</Text>
                            </View>
                        </View>

                        {/* Class Breakdown Section */}
                        <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Breakdown by Class
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: surface, borderRadius: 16, borderWidth: 1, borderColor: border, paddingHorizontal: 12, marginBottom: 16 }}>
                            <Search size={18} color={textSecondary} />
                            <TextInput
                                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, color: textPrimary, fontSize: 14 }}
                                placeholder="Search class..."
                                placeholderTextColor={textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {filteredBreakdown.map((c, i) => (
                            <View key={i} style={{ backgroundColor: surface, padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#FF6B00', marginBottom: 12, borderWidth: 1, borderColor: border }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>{c.name}</Text>
                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{c.total} Students Marked</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#10b981' }}>{Math.round((c.present / c.total) * 100)}%</Text>
                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                            <Text style={{ fontSize: 11, color: '#ef4444' }}>{c.absent} Abs</Text>
                                            <Text style={{ fontSize: 11, color: '#10b981' }}>{c.present} Pre</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}

                        {classBreakdown.length === 0 && (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <School size={48} color={textSecondary} strokeWidth={1} />
                                <Text style={{ color: textSecondary, marginTop: 16, textAlign: 'center' }}>
                                    No attendance data found for this date.
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}
