import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, Calendar, Check, X, Clock, Users, ChevronDown, ChevronRight, MinusCircle } from 'lucide-react-native';
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { TeacherAttendanceAPI } from "@/services/TeacherAttendanceService";
import { SubjectAPI } from "@/services/SubjectService";

interface Student {
    student_id: string; // student_id
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
        <View className="bg-white p-3 rounded-xl border border-gray-100 mb-2 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                <Text className="text-teacherOrange font-bold">{student.name.charAt(0)}</Text>
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-medium">{student.name}</Text>
            </View>

            <View className="flex-row gap-2">
                <TouchableOpacity
                    className={`w-9 h-9 rounded-lg items-center justify-center ${student.status === "present" ? "bg-green-500" : "bg-gray-100"}`}
                    onPress={() => onMark(student.student_id, "present")}
                >
                    <Check size={18} color={student.status === "present" ? "white" : "#9CA3AF"} />
                </TouchableOpacity>
                <TouchableOpacity
                    className={`w-9 h-9 rounded-lg items-center justify-center ${student.status === "absent" ? "bg-red-500" : "bg-gray-100"}`}
                    onPress={() => onMark(student.student_id, "absent")}
                >
                    <X size={18} color={student.status === "absent" ? "white" : "#9CA3AF"} />
                </TouchableOpacity>
                <TouchableOpacity
                    className={`w-9 h-9 rounded-lg items-center justify-center ${student.status === "late" ? "bg-yellow-500" : "bg-gray-100"}`}
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
            const data = await SubjectAPI.getFilteredSubjects(); // Assuming this returns subjects for the teacher
            if (data && data.length > 0) {
                setSubjects(data);
                setSelectedSubjectId(data[0].id);
            }
        } catch (error) {
            console.error("Fetch subjects error:", error);
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
        <>
            <StatusBar barStyle="dark-content" />
            <View className="flex-1 bg-gray-50">
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View className="p-4">
                        <View className="flex-row items-center mb-6">
                            <TouchableOpacity className="p-2 mr-2" onPress={() => router.back()}>
                                <ArrowLeft size={24} color="#374151" />
                            </TouchableOpacity>
                            <View className="flex-1">
                                <Text className="text-2xl font-bold text-gray-900" numberOfLines={1} adjustsFontSizeToFit>Student Attendance</Text>
                                <Text className="text-gray-500 text-sm">{selectedDate.toDateString()}</Text>
                            </View>
                        </View>

                        {/* Subject Selection */}
                        <View className="mb-6 relative z-10">
                            <TouchableOpacity
                                className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex-row items-center justify-between"
                                onPress={() => setShowSubjectDropdown(!showSubjectDropdown)}
                            >
                                <Text className="text-gray-700 font-medium">{selectedSubjectName}</Text>
                                <ChevronDown size={16} color="#6B7280" />
                            </TouchableOpacity>

                            {showSubjectDropdown && (
                                <View className="absolute top-12 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-20">
                                    {subjects.map(sub => (
                                        <TouchableOpacity
                                            key={sub.id}
                                            className="px-4 py-3 border-b border-gray-50 last:border-0"
                                            onPress={() => {
                                                setSelectedSubjectId(sub.id);
                                                setShowSubjectDropdown(false);
                                            }}
                                        >
                                            <Text className="text-gray-900">{sub.title}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Student List */}
                        {loading ? (
                            <ActivityIndicator size="large" color="#FF6B00" className="mt-8" />
                        ) : students.length === 0 ? (
                            <Text className="text-gray-500 text-center mt-8">No students found for this subject.</Text>
                        ) : (
                            students.map((student) => (
                                <StudentAttendanceRow
                                    key={student.student_id}
                                    student={student}
                                    onMark={handleMarkAttendance}
                                />
                            ))
                        )}

                        <TouchableOpacity
                            className={`bg-teacherOrange py-4 rounded-xl items-center mt-6 ${saving ? 'opacity-50' : ''}`}
                            onPress={saveAttendance}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save All Attendance</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
