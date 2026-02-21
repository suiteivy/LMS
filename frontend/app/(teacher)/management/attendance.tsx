import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { SubjectAPI } from "@/services/SubjectService";
import { TeacherAttendanceAPI } from "@/services/TeacherAttendanceService";
import { router } from "expo-router";
import { Calendar, Check, ChevronDown, Clock, X } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Student {
    student_id: string;
    name: string;
    avatar_url?: string;
    status: "present" | "absent" | "late" | "pending" | "excused";
}

interface SubjectOption {
    id: string;
    title: string;
}

const StudentAttendanceRow = ({ student, onMark }: { student: Student; onMark: (id: string, status: Student["status"]) => void }) => {
    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 mb-3 flex-row items-center shadow-sm">
            <View className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/30 items-center justify-center mr-4">
                <Text className="text-[#FF6900] font-bold text-lg">{student.name.charAt(0)}</Text>
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-base">{student.name}</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">ID: {student.student_id.substring(0, 8)}</Text>
            </View>

            <View className="flex-row gap-2">
                <TouchableOpacity
                    className={`w-10 h-10 rounded-xl items-center justify-center ${student.status === "present" ? "bg-green-500 shadow-sm" : "bg-gray-50 dark:bg-[#242424] border border-gray-100 dark:border-gray-800"}`}
                    onPress={() => onMark(student.student_id, "present")}
                >
                    <Check size={18} color={student.status === "present" ? "white" : "#9CA3AF"} />
                </TouchableOpacity>
                <TouchableOpacity
                    className={`w-10 h-10 rounded-xl items-center justify-center ${student.status === "absent" ? "bg-red-500 shadow-sm" : "bg-gray-50 dark:bg-[#242424] border border-gray-100 dark:border-gray-800"}`}
                    onPress={() => onMark(student.student_id, "absent")}
                >
                    <X size={18} color={student.status === "absent" ? "white" : "#9CA3AF"} />
                </TouchableOpacity>
                <TouchableOpacity
                    className={`w-10 h-10 rounded-xl items-center justify-center ${student.status === "late" ? "bg-yellow-500 shadow-sm" : "bg-gray-50 dark:bg-[#242424] border border-gray-100 dark:border-gray-800"}`}
                    onPress={() => onMark(student.student_id, "late")}
                >
                    <Clock size={16} color={student.status === "late" ? "white" : "#9CA3AF"} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AttendancePage() {
    const { teacherId } = useAuth();
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
        setSaving(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const promises = students.map(s =>
                TeacherAttendanceAPI.markStudentAttendance({
                    student_id: s.student_id,
                    subject_id: selectedSubjectId,
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

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Management"
                subtitle="Attendance"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="p-4 md:p-8">
                    {/* Date and Summary */}
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <View className="flex-row items-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] px-4 py-2 rounded-2xl shadow-sm">
                            <Calendar size={14} color="#FF6900" />
                            <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs ml-2">{selectedDate.toDateString()}</Text>
                        </View>
                        <View>
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">{students.length} students total</Text>
                        </View>
                    </View>

                    {/* Subject Selection */}
                    <View className="mb-8 relative z-10">
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
                    <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4 px-2 tracking-tight">Student List</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : students.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center tracking-tight">No students found for this subject.</Text>
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
                            className={`bg-[#FF6900] py-5 rounded-2xl items-center mt-8 shadow-lg active:bg-orange-600 ${saving ? 'opacity-50' : ''}`}
                            onPress={saveAttendance}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Save Attendance</Text>}
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
