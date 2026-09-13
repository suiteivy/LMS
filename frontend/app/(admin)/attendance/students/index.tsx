import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { AttendanceService } from "@/services/AttendanceService";
import { DatePicker } from "@/components/common/DatePicker";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { supabase } from "@/libs/supabase";
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    School,
    ChevronRight,
    UserCheck,
    X,
    Check,
    AlertCircle
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface Stats {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
}

interface ClassRosterStudent {
    student_id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    status: "present" | "absent" | "late" | "excused" | "unmarked";
    attendance_id: string | null;
    notes?: string;
}

export default function AdminStudentAttendance() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date());
    const [stats, setStats] = useState<Stats>({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
    const [classBreakdown, setClassBreakdown] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state for Class Attendance management
    const [selectedClass, setSelectedClass] = useState<any | null>(null);
    const [classStudents, setClassStudents] = useState<ClassRosterStudent[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [markingStudentId, setMarkingStudentId] = useState<string | null>(null);
    const [bulkMarking, setBulkMarking] = useState(false);

    const surface = isDark ? "#161B22" : "#F6F8FA";
    const border = isDark ? "#21262D" : "#D0D7DE";
    const textPrimary = isDark ? "#FFFFFF" : "#111827";
    const textSecondary = isDark ? "#9CA3AF" : "#6B7280";

    useEffect(() => {
        loadInstitutionStats();
    }, [date, profile?.institution_id]);

    // Live updates for student attendance changes
    useRealtimeQuery("attendance", () => {
        loadInstitutionStats();
        if (selectedClass) {
            loadClassRoster(selectedClass.id);
        }
    });

    const toLocalDateString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const loadInstitutionStats = async () => {
        if (!profile?.institution_id) {
            setStats({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
            setClassBreakdown([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const dateStr = toLocalDateString(date);
            const [attData, classesRes] = await Promise.all([
                AttendanceService.getInstitutionAttendanceStats(dateStr, profile.institution_id),
                supabase
                    .from("classes")
                    .select("id, display_name, name, grade_level, stream")
                    .eq("institution_id", profile.institution_id)
                    .order("grade_level", { ascending: true })
            ]);

            const data = attData || [];
            const classes = classesRes.data || [];

            // Calculate overall stats
            const present = data.filter((a: any) => a.status === "present").length;
            const absent = data.filter((a: any) => a.status === "absent").length;
            const late = data.filter((a: any) => a.status === "late").length;
            const total = data.length;
            const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

            setStats({ total, present, absent, late, percentage });

            // Build Map of attendance records keyed by class_id
            const attendanceByClass = new Map<string, { present: number; absent: number; late: number; total: number }>();
            data.forEach((a: any) => {
                const cId = a.class_id;
                if (!cId) return;
                if (!attendanceByClass.has(cId)) {
                    attendanceByClass.set(cId, { present: 0, absent: 0, late: 0, total: 0 });
                }
                const entry = attendanceByClass.get(cId)!;
                entry.total++;
                if (a.status === "present") entry.present++;
                if (a.status === "absent") entry.absent++;
                if (a.status === "late") entry.late++;
            });

            // Merge with classes so ALL institution classes are available to Admin
            const breakdownList = classes.map((c: any) => {
                const att = attendanceByClass.get(c.id) || { present: 0, absent: 0, late: 0, total: 0 };
                return {
                    id: c.id,
                    name: c.display_name || c.name || "Class",
                    grade_level: c.grade_level,
                    present: att.present,
                    absent: att.absent,
                    late: att.late,
                    total: att.total,
                };
            });

            // Also include any orphan attendance classes if any exist
            data.forEach((a: any) => {
                if (a.class_id && !breakdownList.some(b => b.id === a.class_id)) {
                    const entry = attendanceByClass.get(a.class_id);
                    if (entry) {
                        breakdownList.push({
                            id: a.class_id,
                            name: a.class?.display_name || a.class?.name || "Unassigned",
                            grade_level: 99,
                            ...entry,
                        });
                    }
                }
            });

            setClassBreakdown(breakdownList);
        } catch (error: any) {
            console.error("Failed to load attendance summary:", error);
            Alert.alert("Error", "Failed to load attendance summary");
        } finally {
            setLoading(false);
        }
    };

    const loadClassRoster = async (classId: string) => {
        if (!profile?.institution_id) return;
        setLoadingStudents(true);
        try {
            const dateStr = toLocalDateString(date);
            const students = await AttendanceService.getClassStudentsWithAttendance(
                classId,
                dateStr,
                profile.institution_id
            );
            setClassStudents(students);
        } catch (error: any) {
            console.error("Failed to load class students:", error);
            Alert.alert("Error", "Failed to load student roster for this class");
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleOpenClass = (classItem: any) => {
        setSelectedClass(classItem);
        loadClassRoster(classItem.id);
    };

    const handleCloseClass = () => {
        setSelectedClass(null);
        setClassStudents([]);
        loadInstitutionStats();
    };

    const handleMarkStudent = async (studentId: string, newStatus: "present" | "absent" | "late" | "excused") => {
        if (!selectedClass || !profile?.institution_id) return;
        setMarkingStudentId(studentId);

        // Optimistic update
        setClassStudents(prev =>
            prev.map(s => (s.student_id === studentId ? { ...s, status: newStatus } : s))
        );

        try {
            const dateStr = toLocalDateString(date);
            await AttendanceService.adminMarkStudentAttendance({
                student_id: studentId,
                class_id: selectedClass.id,
                date: dateStr,
                status: newStatus,
                institution_id: profile.institution_id,
            });
        } catch (error: any) {
            console.error("Failed to mark student attendance:", error);
            Alert.alert("Error", "Failed to record attendance: " + (error?.message || "Unknown error"));
            loadClassRoster(selectedClass.id);
        } finally {
            setMarkingStudentId(null);
        }
    };

    const handleMarkAllPresent = async () => {
        if (!selectedClass || !profile?.institution_id || classStudents.length === 0) return;
        setBulkMarking(true);

        // Optimistic update
        setClassStudents(prev => prev.map(s => ({ ...s, status: "present" })));

        try {
            const dateStr = toLocalDateString(date);
            await AttendanceService.adminBulkMarkAttendance({
                class_id: selectedClass.id,
                date: dateStr,
                institution_id: profile.institution_id,
                records: classStudents.map(s => ({
                    student_id: s.student_id,
                    status: "present",
                })),
            });
            Alert.alert("Success", `Marked all ${classStudents.length} students as Present.`);
            loadClassRoster(selectedClass.id);
        } catch (error: any) {
            console.error("Failed to mark all present:", error);
            Alert.alert("Error", "Failed to mark all present: " + (error?.message || "Unknown error"));
            loadClassRoster(selectedClass.id);
        } finally {
            setBulkMarking(false);
        }
    };

    const filteredBreakdown = classBreakdown.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? "#161B22" : "#FFFFFF" }}>
            <UnifiedHeader
                title="Student Reports"
                subtitle="Daily Attendance"
                role="Admin"
                onBack={() => router.back()}
                showNotification={false}
            />

            <ScrollView style={{ flex: 1, padding: 20 }}>
                {/* Date Selector */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <DatePicker
                            label="Attendance Date"
                            value={toLocalDateString(date)}
                            onChange={(d) => setDate(new Date(d + "T00:00:00"))}
                            isDark={isDark}
                        />
                    </View>

                    <View style={{ backgroundColor: "#FF6900", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: "center", marginTop: 14 }}>
                        <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>{stats.percentage}% Present</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Summary Cards */}
                        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
                            <View style={{ flex: 1, backgroundColor: surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: border }}>
                                <CheckCircle2 size={24} color="#10b981" />
                                <Text style={{ fontSize: 22, fontWeight: "800", color: textPrimary, marginTop: 8 }}>{stats.present}</Text>
                                <Text style={{ fontSize: 11, color: textSecondary, fontWeight: "600" }}>PRESENT</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: border }}>
                                <XCircle size={24} color="#ef4444" />
                                <Text style={{ fontSize: 22, fontWeight: "800", color: textPrimary, marginTop: 8 }}>{stats.absent}</Text>
                                <Text style={{ fontSize: 11, color: textSecondary, fontWeight: "600" }}>ABSENT</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: border }}>
                                <Clock size={24} color="#FF6900" />
                                <Text style={{ fontSize: 22, fontWeight: "800", color: textPrimary, marginTop: 8 }}>{stats.late}</Text>
                                <Text style={{ fontSize: 11, color: textSecondary, fontWeight: "600" }}>LATE</Text>
                            </View>
                        </View>

                        {/* Class Breakdown Section */}
                        <View style={{ marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Text style={{ fontSize: 13, fontWeight: "700", color: textSecondary, textTransform: "uppercase", letterSpacing: 1 }}>
                                Classes & Quick-Mark
                            </Text>
                            <Text style={{ fontSize: 12, color: "#FF6900", fontWeight: "600" }}>
                                Tap class to view or record
                            </Text>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: surface, borderRadius: 12, borderWidth: 1, borderColor: border, paddingHorizontal: 12, marginBottom: 16 }}>
                            <Search size={18} color={textSecondary} />
                            <TextInput
                                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, color: textPrimary, fontSize: 14 }}
                                placeholder="Search class..."
                                placeholderTextColor={textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {filteredBreakdown.map((c) => {
                            const hasMarked = c.total > 0;
                            const pct = hasMarked ? Math.round(((c.present + c.late) / c.total) * 100) : 0;
                            return (
                                <TouchableOpacity
                                    key={c.id}
                                    activeOpacity={0.7}
                                    onPress={() => handleOpenClass(c)}
                                    style={{
                                        backgroundColor: surface,
                                        padding: 16,
                                        borderRadius: 12,
                                        borderLeftWidth: 4,
                                        borderLeftColor: hasMarked ? "#FF6900" : "#9CA3AF",
                                        marginBottom: 12,
                                        borderWidth: 1,
                                        borderColor: border,
                                    }}
                                >
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <View style={{ flex: 1, marginRight: 12 }}>
                                            <Text style={{ fontSize: 16, fontWeight: "800", color: textPrimary }}>{c.name}</Text>
                                            <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                                                {hasMarked ? `${c.total} Students Marked` : "Not recorded yet • Tap to mark"}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                            {hasMarked ? (
                                                <View style={{ alignItems: "flex-end" }}>
                                                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#10b981" }}>{pct}%</Text>
                                                    <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                                                        <Text style={{ fontSize: 11, color: "#10b981", fontWeight: "600" }}>{c.present}P</Text>
                                                        <Text style={{ fontSize: 11, color: "#FF6900", fontWeight: "600" }}>{c.late}L</Text>
                                                        <Text style={{ fontSize: 11, color: "#ef4444", fontWeight: "600" }}>{c.absent}A</Text>
                                                    </View>
                                                </View>
                                            ) : (
                                                <View style={{ backgroundColor: isDark ? "#21262D" : "#E5E7EB", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                                    <Text style={{ fontSize: 11, color: textSecondary, fontWeight: "600" }}>Unmarked</Text>
                                                </View>
                                            )}
                                            <ChevronRight size={18} color={textSecondary} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {filteredBreakdown.length === 0 && (
                            <View style={{ padding: 40, alignItems: "center" }}>
                                <School size={48} color={textSecondary} strokeWidth={1} />
                                <Text style={{ color: textSecondary, marginTop: 16, textAlign: "center" }}>
                                    No classes found.
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Class Roster & Marking Modal */}
            <Modal
                visible={!!selectedClass}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleCloseClass}
            >
                <View style={{ flex: 1, backgroundColor: isDark ? "#0D1117" : "#FFFFFF" }}>
                    {/* Modal Header */}
                    <View
                        style={{
                            padding: 20,
                            paddingTop: 16,
                            borderBottomWidth: 1,
                            borderColor: border,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: surface,
                        }}
                    >
                        <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={{ fontSize: 18, fontWeight: "800", color: textPrimary }}>
                                {selectedClass?.name} Attendance
                            </Text>
                            <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
                                {toLocalDateString(date)} • Full Admin Override
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleCloseClass}
                            style={{
                                padding: 8,
                                borderRadius: 20,
                                backgroundColor: isDark ? "#21262D" : "#E5E7EB",
                            }}
                        >
                            <X size={20} color={textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Quick Action Toolbar */}
                    <View
                        style={{
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            backgroundColor: isDark ? "#161B22" : "#F9FAFB",
                            borderBottomWidth: 1,
                            borderColor: border,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Text style={{ fontSize: 13, color: textSecondary, fontWeight: "600" }}>
                            {classStudents.length} Students Enrolled
                        </Text>
                        <TouchableOpacity
                            onPress={handleMarkAllPresent}
                            disabled={bulkMarking || classStudents.length === 0}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                backgroundColor: "#10b981",
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 8,
                                opacity: bulkMarking || classStudents.length === 0 ? 0.6 : 1,
                            }}
                        >
                            {bulkMarking ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <UserCheck size={16} color="#FFFFFF" />
                            )}
                            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>
                                Mark All Present
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Students Roster */}
                    {loadingStudents ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                            <ActivityIndicator size="large" color="#FF6900" />
                            <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13 }}>
                                Loading class students...
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1, padding: 16 }}>
                            {classStudents.map((student) => {
                                const isMarking = markingStudentId === student.student_id;
                                const isPresent = student.status === "present";
                                const isAbsent = student.status === "absent";
                                const isLate = student.status === "late";

                                return (
                                    <View
                                        key={student.student_id}
                                        style={{
                                            backgroundColor: surface,
                                            padding: 14,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: border,
                                            marginBottom: 10,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        {/* Student Info */}
                                        <View style={{ flex: 1, marginRight: 10 }}>
                                            <Text style={{ fontSize: 15, fontWeight: "700", color: textPrimary }}>
                                                {student.name}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                                                {student.email || "No email"}
                                            </Text>
                                            <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 }}>
                                                <View
                                                    style={{
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 6,
                                                        backgroundColor:
                                                            isPresent
                                                                ? "rgba(16, 185, 129, 0.15)"
                                                                : isAbsent
                                                                ? "rgba(239, 68, 68, 0.15)"
                                                                : isLate
                                                                ? "rgba(255, 105, 0, 0.15)"
                                                                : "rgba(156, 163, 175, 0.15)",
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: "700",
                                                            textTransform: "capitalize",
                                                            color:
                                                                isPresent
                                                                    ? "#10b981"
                                                                    : isAbsent
                                                                    ? "#ef4444"
                                                                    : isLate
                                                                    ? "#FF6900"
                                                                    : textSecondary,
                                                        }}
                                                    >
                                                        {student.status}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Attendance Action Pills: P / L / A */}
                                        {isMarking ? (
                                            <ActivityIndicator size="small" color="#FF6900" style={{ width: 110 }} />
                                        ) : (
                                            <View style={{ flexDirection: "row", gap: 6 }}>
                                                {/* Present */}
                                                <TouchableOpacity
                                                    onPress={() => handleMarkStudent(student.student_id, "present")}
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 18,
                                                        backgroundColor: isPresent ? "#10b981" : isDark ? "#21262D" : "#E5E7EB",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontWeight: "800",
                                                            fontSize: 13,
                                                            color: isPresent ? "#FFFFFF" : textPrimary,
                                                        }}
                                                    >
                                                        P
                                                    </Text>
                                                </TouchableOpacity>

                                                {/* Late */}
                                                <TouchableOpacity
                                                    onPress={() => handleMarkStudent(student.student_id, "late")}
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 18,
                                                        backgroundColor: isLate ? "#FF6900" : isDark ? "#21262D" : "#E5E7EB",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontWeight: "800",
                                                            fontSize: 13,
                                                            color: isLate ? "#FFFFFF" : textPrimary,
                                                        }}
                                                    >
                                                        L
                                                    </Text>
                                                </TouchableOpacity>

                                                {/* Absent */}
                                                <TouchableOpacity
                                                    onPress={() => handleMarkStudent(student.student_id, "absent")}
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 18,
                                                        backgroundColor: isAbsent ? "#ef4444" : isDark ? "#21262D" : "#E5E7EB",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontWeight: "800",
                                                            fontSize: 13,
                                                            color: isAbsent ? "#FFFFFF" : textPrimary,
                                                        }}
                                                    >
                                                        A
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}

                            {classStudents.length === 0 && (
                                <View style={{ padding: 40, alignItems: "center" }}>
                                    <AlertCircle size={40} color={textSecondary} />
                                    <Text style={{ color: textSecondary, marginTop: 12, textAlign: "center" }}>
                                        No students found enrolled in this class.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </View>
    );
}
