import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { SubjectAPI } from "@/services/SubjectService";
import { TeacherAttendanceAPI } from "@/services/TeacherAttendanceService";
import { router } from "expo-router";
import { ChevronDown } from "lucide-react";
import { Calendar, Check } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

interface Student {
    student_id: string;
    name: string;
    avatar_url?: string;
    status: "present" | "absent" | "late" | "pending" | "excused";
}

interface SubjectOption {
    id: string;
    title: string;
    class_id?: string;
}

const StudentAttendanceRow = ({ student, onMark }: { student: Student; onMark: (id: string, status: Student["status"]) => void }) => {
    return (
        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-3 flex-row items-center">
            <View className="w-10 h-10 rounded-xl bg-[#EAEEF2] dark:bg-[#1C2128] items-center justify-center mr-3">
                <Text className="text-gray-900 dark:text-white font-black text-base">
                    {(student.name || "U").charAt(0)}
                </Text>
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-bold text-base">{student.name}</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                    ID: {student.student_id.substring(0, 8)}
                </Text>
            </View>

            <TouchableOpacity
                activeOpacity={0.7}
                className={`w-10 h-10 rounded-xl items-center justify-center ${student.status === "present" ? "bg-[#FF6900]" : "bg-[#EAEEF2] dark:bg-[#1C2128]"}`}
                onPress={() => onMark(student.student_id, student.status === "present" ? "absent" : "present")}
            >
                {student.status === "present" && <Check size={18} color="white" />}
            </TouchableOpacity>
        </View>
    );
};

export default function AttendancePage() {
    const tier = useSubscriptionTier();
    const { teacherId, isDemo } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

    useEffect(() => {
        fetchTeacherSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubjectId) {
            fetchAttendanceData();
        }
    }, [selectedSubjectId, selectedDate]);

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
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceData = async () => {
        if (!selectedSubjectId) return;
        setLoading(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const data = await TeacherAttendanceAPI.getStudentAttendance(dateStr, selectedSubjectId);
            setStudents(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load attendance");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = (id: string, status: Student["status"]) => {
        setStudents(prev => prev.map(s => s.student_id === id ? { ...s, status } : s));
    };

    const saveAttendance = async () => {
        if (!selectedSubjectId) return;
        if (isDemo) {
            Toast.show({
                type: 'success',
                text1: 'Done',
                text2: 'Changes saved.'
            });
            return;
        }
        setSaving(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const currentSubject = subjects.find(s => s.id === selectedSubjectId);
            const classId = currentSubject?.class_id;

            const promises = students.map(s =>
                TeacherAttendanceAPI.markStudentAttendance({
                    student_id: s.student_id,
                    subject_id: selectedSubjectId,
                    class_id: classId,
                    status: s.status,
                    date: dateStr
                })
            );

            await Promise.all(promises);
            Alert.alert("Success", "Attendance saved successfully");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save attendance");
        } finally {
            setSaving(false);
        }
    };

    const selectedSubjectName = subjects.find(s => s.id === selectedSubjectId)?.title || "Select Subject";
    const openManual = (anchor?: string) => {
        router.push({ pathname: '/(teacher)/settings', params: { manual: '1', anchor: anchor || 'attendance-ops' } } as any);
    };

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
            <UnifiedHeader
                title="Management"
                subtitle="Attendance"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                <View className="px-5 pt-4">
                    {/* Date and Summary */}
                    <View className="flex-row justify-between items-center mb-6">
                        <View className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-4 py-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]">
                            <Calendar size={16} color="#FF6900" />
                            <Text className="text-gray-900 dark:text-white font-bold text-sm ml-2">
                                {selectedDate.toDateString()}
                            </Text>
                        </View>
                        <View>
                            <View className="flex-row items-center">
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">{students.length} students total</Text>
                                <HelpTooltip id="teacher.manage.registrar" role="teacher" tier={tier} onLearnMore={openManual} />
                            </View>
                        </View>
                    </View>

                    {/* Subject Selection */}
                    <View className="mb-8 relative z-10">
                        <View className="flex-row items-center mb-2">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Subject Filter</Text>
                            <HelpTooltip id="teacher.manage.registrar" role="teacher" tier={tier} onLearnMore={openManual} />
                        </View>
                        <TouchableOpacity
                            className="bg-white dark:bg-[#1a1a1a] rounded-3xl px-6 py-4 border border-gray-100 dark:border-gray-800 flex-row items-center justify-between shadow-sm active:bg-gray-50 dark:active:bg-gray-900"
                            onPress={() => setShowSubjectDropdown(!showSubjectDropdown)}
                        >
                            <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm tracking-tight">{selectedSubjectName}</Text>
                            <ChevronDown size={18} color="#6B7280" />
                        </TouchableOpacity>

                        {showSubjectDropdown && (
                            <View className="absolute top-16 left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-[32px] shadow-2xl z-20 overflow-hidden">
                                {subjects.map(sub => (
                                    <TouchableOpacity
                                        key={sub.id}
                                        className="px-6 py-4 border-b border-gray-50 dark:border-gray-900 active:bg-gray-50 dark:active:bg-gray-900"
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

                    {/* Student List */}
                    <View className="flex-row items-center mb-4 px-2">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Student List</Text>
                        <HelpTooltip id="teacher.manage.registrar" role="teacher" tier={tier} onLearnMore={openManual} />
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : students.length === 0 ? (
                        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-8 rounded-xl items-center border border-[#D0D7DE] dark:border-[#21262D]">
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">No students found</Text>
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
                            className={`bg-[#FF6900] py-4 rounded-xl items-center mt-6 ${saving ? 'opacity-50' : ''}`}
                            onPress={saveAttendance}
                            disabled={saving}
                        >
                            {saving ? 
                                <ActivityIndicator color="white" /> : 
                                <View className="flex-row items-center">
                                    <Text className="text-white font-bold text-lg">Save Attendance</Text>
                                    <HelpTooltip id="teacher.manage.registrar" role="teacher" tier={tier} onLearnMore={openManual} />
                                </View>
                            }
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
