import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { DatePicker } from "@/components/common/DatePicker";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { SubjectAPI } from "@/services/SubjectService";
import { TeacherAttendanceAPI } from "@/services/TeacherAttendanceService";
import { router } from "expo-router";
import { ChevronDown, Clock, CheckCircle2, UserCheck, ShieldAlert, Check, X, Users, Calendar } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { showFetchError } from '@/utils/toast';

interface Student {
    student_id: string;
    student_display_id?: string;
    name: string;
    avatar_url?: string;
    status: "present" | "absent" | "late" | "pending" | "excused";
    notes?: string;
}

interface SubjectOption {
    id: string;
    title: string;
    class_id?: string;
}

const StudentAttendanceRow = ({ 
    student, 
    onMark 
}: { 
    student: Student; 
    onMark: (id: string, status: Student["status"]) => void 
}) => {
    const isPresent = student.status === "present";
    const isAbsent = student.status === "absent";
    const isLate = student.status === "late";

    return (
        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-[#EAEEF2] dark:bg-[#0D1117] items-center justify-center mr-3">
                    <Text className="text-gray-900 dark:text-white font-black text-base">
                        {(student.name || "U").charAt(0)}
                    </Text>
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-sm" numberOfLines={1}>{student.name}</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                        ID: {student.student_display_id || student.student_id.substring(0, 8)}
                    </Text>
                </View>
            </View>

            {/* Quick Status Buttons */}
            <View className="flex-row gap-1.5">
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onMark(student.student_id, "present")}
                    className={`px-3 py-2 rounded-lg border ${isPresent ? 'bg-green-600 border-green-600' : 'bg-white dark:bg-[#0D1117] border-[#D0D7DE] dark:border-[#21262D]'}`}
                >
                    <Text className={`text-xs font-bold ${isPresent ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        P
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onMark(student.student_id, "late")}
                    className={`px-3 py-2 rounded-lg border ${isLate ? 'bg-amber-500 border-amber-500' : 'bg-white dark:bg-[#0D1117] border-[#D0D7DE] dark:border-[#21262D]'}`}
                >
                    <Text className={`text-xs font-bold ${isLate ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        L
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onMark(student.student_id, "absent")}
                    className={`px-3 py-2 rounded-lg border ${isAbsent ? 'bg-red-600 border-red-600' : 'bg-white dark:bg-[#0D1117] border-[#D0D7DE] dark:border-[#21262D]'}`}
                >
                    <Text className={`text-xs font-bold ${isAbsent ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        A
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AttendancePage() {
    const tier = useSubscriptionTier();
    const { isDark } = useTheme();
    const { teacherId, isDemo } = useAuth();
    const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

    // Actual class times (Item 13)
    const [actualStartTime, setActualStartTime] = useState("");
    const [actualEndTime, setActualEndTime] = useState("");

    // Teacher self-checkin state (Item 14)
    const [teacherCheckedIn, setTeacherCheckedIn] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);

    useEffect(() => {
        fetchTeacherSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubjectId) {
            fetchAttendanceData();
        }
    }, [selectedSubjectId, selectedDateStr]);

    // Live updates for attendance changes
    useRealtimeQuery('attendance', () => {
        if (selectedSubjectId) {
            fetchAttendanceData();
        }
    });

    const fetchTeacherSubjects = async () => {
        try {
            setLoading(true);
            const data = await SubjectAPI.getFilteredSubjects();
            if (data && Array.isArray(data) && data.length > 0) {
                setSubjects(data);
                setSelectedSubjectId(data[0].id);
            }
        } catch (error) {
            console.error("Fetch subjects error:", error);
            showFetchError("subjects", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceData = async () => {
        if (!selectedSubjectId) return;
        setLoading(true);
        try {
            const data = await TeacherAttendanceAPI.getStudentAttendance(selectedDateStr, selectedSubjectId);
            setStudents(data || []);
            if (data && data.length > 0) {
                if (data[0].actual_start_time) setActualStartTime(data[0].actual_start_time);
                if (data[0].actual_end_time) setActualEndTime(data[0].actual_end_time);
            }
        } catch (error) {
            console.error(error);
            showFetchError("attendance records", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = (id: string, status: Student["status"]) => {
        setStudents(prev => prev.map(s => s.student_id === id ? { ...s, status } : s));
    };

    // Bulk "Mark All Present" Action (Item 15A)
    const handleMarkAllPresent = () => {
        setStudents(prev => prev.map(s => ({ ...s, status: "present" })));
        Toast.show({
            type: 'info',
            text1: 'Marked All as Present',
            text2: 'Tap Save Attendance to confirm.'
        });
    };

    // Teacher Presence Check-in Action (Item 14)
    const handleSelfCheckIn = async () => {
        if (checkingIn) return;
        setCheckingIn(true);
        try {
            if (isDemo) {
                setTeacherCheckedIn(true);
                Toast.show({
                    type: 'success',
                    text1: 'Presence Confirmed',
                    text2: 'Marked as present for today (Demo mode).'
                });
                return;
            }
            await TeacherAttendanceAPI.selfCheckIn({
                date: new Date().toISOString().split('T')[0],
                status: 'present',
                notes: 'Teacher presence recorded via mobile'
            });
            setTeacherCheckedIn(true);
            Toast.show({
                type: 'success',
                text1: 'Presence Synced',
                text2: 'Your attendance is registered on the Admin dashboard in real time.'
            });
        } catch (err: any) {
            console.error("Self check-in error:", err);
            Alert.alert("Error", err?.message || "Failed to record teacher presence");
        } finally {
            setCheckingIn(false);
        }
    };

    const saveAttendance = async () => {
        if (!selectedSubjectId) return;
        if (isDemo) {
            Toast.show({
                type: 'success',
                text1: 'Done',
                text2: 'Attendance recorded.'
            });
            return;
        }
        setSaving(true);
        try {
            const currentSubject = subjects.find(s => s.id === selectedSubjectId);
            const classId = currentSubject?.class_id;

            const records = students.map(s => ({
                student_id: s.student_id,
                status: s.status,
                notes: s.notes || undefined
            }));

            await TeacherAttendanceAPI.bulkMarkStudentAttendance({
                subject_id: selectedSubjectId,
                class_id: classId,
                date: selectedDateStr,
                records,
                actual_start_time: actualStartTime.trim() || undefined,
                actual_end_time: actualEndTime.trim() || undefined
            });

            Alert.alert("Success", "Attendance saved and synced successfully");
        } catch (error: any) {
            console.error("Save attendance error:", error);
            const errMsg = error?.response?.data?.error || error?.message || "Failed to save attendance";
            Alert.alert("Attendance Notice", errMsg);
        } finally {
            setSaving(false);
        }
    };

    const selectedSubjectName = subjects.find(s => s.id === selectedSubjectId)?.title || "Select Subject";
    const openManual = (anchor?: string) => {
        router.push({ pathname: '/(teacher)/accessibility/settings', params: { manual: '1', anchor: anchor || 'attendance-ops' } } as any);
    };

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Management"
                subtitle="Attendance"
                role="Teacher"
                fallbackPath="/(teacher)/management"
            />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                <View className="px-5 pt-4">

                    {/* Teacher Presence Indication Card (Item 14) */}
                    <View className="bg-[#F6F8FA] dark:bg-[#0D1117] p-4 rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] mb-5 flex-row items-center justify-between shadow-sm">
                        <View className="flex-row items-center flex-1 mr-3">
                            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${teacherCheckedIn ? 'bg-green-100 dark:bg-green-950/30' : 'bg-orange-100 dark:bg-orange-950/30'}`}>
                                <UserCheck size={20} color={teacherCheckedIn ? "#16A34A" : "#FF6900"} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-900 dark:text-white font-bold text-xs">
                                    {teacherCheckedIn ? "Presence Confirmed" : "Teacher Daily Presence"}
                                </Text>
                                <Text className="text-gray-500 text-[10px] mt-0.5">
                                    {teacherCheckedIn ? "Synced to Admin in real time" : "Check in to confirm presence today"}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleSelfCheckIn}
                            disabled={teacherCheckedIn || checkingIn}
                            activeOpacity={0.7}
                            className={`px-3.5 py-2 rounded-xl ${teacherCheckedIn ? 'bg-green-600' : 'bg-[#FF6900]'}`}
                        >
                            {checkingIn ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text className="text-white text-xs font-bold uppercase tracking-wider">
                                    {teacherCheckedIn ? "Present" : "I'm Present"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Date Selection & Student Count (Item 15A) */}
                    <View className="mb-4">
                        <DatePicker
                            label="Attendance Date (Historical & Current)"
                            value={selectedDateStr}
                            onChange={(val) => {
                                if (val) setSelectedDateStr(val);
                            }}
                            isDark={isDark}
                        />
                    </View>

                    {/* Subject Filter */}
                    <View className="mb-5 relative z-10">
                        <View className="flex-row items-center mb-2">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Subject & Class</Text>
                            <HelpTooltip id="teacher.manage.registrar" role="teacher" tier={tier} onLearnMore={openManual} />
                        </View>
                        <TouchableOpacity
                            className="bg-white dark:bg-[#161B22] rounded-2xl px-5 py-3.5 border border-[#D0D7DE] dark:border-[#21262D] flex-row items-center justify-between shadow-sm active:bg-gray-50"
                            onPress={() => setShowSubjectDropdown(!showSubjectDropdown)}
                        >
                            <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm tracking-tight">{selectedSubjectName}</Text>
                            <ChevronDown size={18} color="#6B7280" />
                        </TouchableOpacity>

                        {showSubjectDropdown && (
                            <View className="absolute top-16 left-0 right-0 bg-white dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-2xl shadow-xl z-20 overflow-hidden">
                                {subjects.map(sub => (
                                    <TouchableOpacity
                                        key={sub.id}
                                        className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-900"
                                        onPress={() => {
                                            setSelectedSubjectId(sub.id);
                                            setShowSubjectDropdown(false);
                                        }}
                                    >
                                        <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">{sub.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Flexible Actual Class Start & End Time (Item 13) */}
                    <View className="bg-[#F6F8FA] dark:bg-[#0D1117] p-4 rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] mb-5">
                        <View className="flex-row items-center mb-2">
                            <Clock size={14} color="#FF6900" />
                            <Text className="text-gray-900 dark:text-white font-bold text-xs ml-1.5">
                                Actual Lesson Times (Optional)
                            </Text>
                        </View>
                        <Text className="text-gray-500 text-[10px] mb-3">
                            Record actual start/end time if lesson began or ended differently from timetable.
                        </Text>
                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <Text className="text-gray-500 text-[10px] uppercase font-bold mb-1">Actual Start</Text>
                                <TextInput
                                    className="bg-white dark:bg-[#161B22] rounded-xl px-3 py-2 text-gray-900 dark:text-white text-xs font-semibold border border-[#D0D7DE] dark:border-[#21262D]"
                                    placeholder="e.g. 08:15"
                                    placeholderTextColor="#9CA3AF"
                                    value={actualStartTime}
                                    onChangeText={setActualStartTime}
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-500 text-[10px] uppercase font-bold mb-1">Actual End</Text>
                                <TextInput
                                    className="bg-white dark:bg-[#161B22] rounded-xl px-3 py-2 text-gray-900 dark:text-white text-xs font-semibold border border-[#D0D7DE] dark:border-[#21262D]"
                                    placeholder="e.g. 09:30"
                                    placeholderTextColor="#9CA3AF"
                                    value={actualEndTime}
                                    onChangeText={setActualEndTime}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Student List & Quick Actions Header */}
                    <View className="flex-row justify-between items-center mb-3">
                        <View>
                            <Text className="text-lg font-bold text-gray-900 dark:text-white">Student Attendance</Text>
                            <Text className="text-xs text-gray-400">{students.length} students enrolled</Text>
                        </View>
                        {students.length > 0 ? (
                            <TouchableOpacity
                                onPress={handleMarkAllPresent}
                                activeOpacity={0.7}
                                className="flex-row items-center bg-green-50 dark:bg-green-950/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800"
                            >
                                <CheckCircle2 size={13} color="#16A34A" />
                                <Text className="text-green-700 dark:text-green-400 font-bold text-xs ml-1.5">Mark All Present</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {loading ? (
                        <ListItemSkeleton loading={loading} count={5} label="Loading attendance roster..." />
                    ) : students.length === 0 ? (
                        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-8 rounded-xl items-center border border-[#D0D7DE] dark:border-[#21262D]">
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">No enrolled students found</Text>
                        </View>
                    ) : (
                        students.map((student) => (
                            <StudentAttendanceRow
                                key={student.student_id}
                                student={student}
                                onMark={handleMarkAttendance}
                            />
                        ))
                    )}

                    {!loading && students.length > 0 && (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            className={`bg-[#FF6900] py-4 rounded-xl items-center mt-6 shadow-md ${saving ? 'opacity-50' : ''}`}
                            onPress={saveAttendance}
                            disabled={saving}
                        >
                            {saving ? 
                                <ActivityIndicator color="white" /> : 
                                <Text className="text-white font-bold text-base uppercase tracking-wider">Save & Sync Attendance</Text>
                            }
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
