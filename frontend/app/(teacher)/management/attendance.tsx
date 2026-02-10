import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, Calendar, Check, X, Clock, Users, ChevronDown, ChevronRight, MinusCircle } from 'lucide-react-native';
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/types/database";

type StudentRow = Database['public']['Tables']['students']['Row'] & {
    user: Database['public']['Tables']['users']['Row'] | null;
};

interface Student {
    id: string; // student_id (which is a UUID from students table)
    name: string;
    status: "present" | "absent" | "late" | "unmarked" | "excused";
    enrollment_id: string;
}

interface ClassOption {
    id: string;
    name: string;
}

const StudentAttendanceRow = ({ student, onMark }: { student: Student; onMark: (id: string, status: Student["status"]) => void }) => {
    return (
        <View className="bg-white p-3 rounded-xl border border-gray-100 mb-2 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-teal-100 items-center justify-center mr-3">
                <Text className="text-teal-600 font-bold">{student.name.charAt(0)}</Text>
            </View>
            <Text className="flex-1 text-gray-900 font-medium">{student.name}</Text>

            <View className="flex-row gap-2">
                <TouchableOpacity
                    className={`w-9 h-9 rounded-lg items-center justify-center ${student.status === "present" ? "bg-green-500" : "bg-gray-100"}`}
                    onPress={() => onMark(student.id, "present")}
                >
                    <Check size={18} color={student.status === "present" ? "white" : "#9CA3AF"} />
                </TouchableOpacity>
                <TouchableOpacity
                    className={`w-9 h-9 rounded-lg items-center justify-center ${student.status === "absent" ? "bg-red-500" : "bg-gray-100"}`}
                    onPress={() => onMark(student.id, "absent")}
                >
                    <X size={18} color={student.status === "absent" ? "white" : "#9CA3AF"} />
                </TouchableOpacity>
                <TouchableOpacity
                    className={`w-9 h-9 rounded-lg items-center justify-center ${student.status === "late" ? "bg-yellow-500" : "bg-gray-100"}`}
                    onPress={() => onMark(student.id, "late")}
                >
                    <Clock size={16} color={student.status === "late" ? "white" : "#9CA3AF"} />
                </TouchableOpacity>
                <TouchableOpacity
                    className={`w-9 h-9 rounded-lg items-center justify-center ${student.status === "excused" ? "bg-blue-500" : "bg-gray-100"}`}
                    onPress={() => onMark(student.id, "excused")}
                >
                    <MinusCircle size={16} color={student.status === "excused" ? "white" : "#9CA3AF"} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AttendancePage() {
    const { user, teacherId } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date()); // Date object
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showClassDropdown, setShowClassDropdown] = useState(false);


    useEffect(() => {
        if (teacherId) {
            fetchClasses();
        }
    }, [teacherId]);

    useEffect(() => {
        if (selectedClassId) {
            fetchAttendanceData();
        }
    }, [selectedClassId, selectedDate]); // Refresh when class or date changes

    const fetchClasses = async () => {
        if (!teacherId) return;
        const { data } = await supabase.from('classes').select('id, name').eq('teacher_id', teacherId);
        if (data && data.length > 0) {
            setClasses(data);
            setSelectedClassId(data[0].id); // Default to first class
        }
    };

    const fetchAttendanceData = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        try {
            // 1. Fetch filtered students (enrollments)
            // Enrollments now links to 'students' table, which links to 'users' table.
            // We use explicit types for the query response to avoid 'any'
            const { data: enrollmentData, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    id,
                    student:students(
                        id,
                        user:users(full_name)
                    )
                `)
                .eq('class_id', selectedClassId);

            if (enrollError) throw enrollError;

            // 2. Fetch existing attendance for this class and date
            const dateStr = selectedDate.toISOString().split('T')[0];
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance')
                .select('student_id, status')
                .eq('class_id', selectedClassId)
                .eq('date', dateStr);

            if (attendanceError) throw attendanceError;

            // Map students and merge status
            const mappedStudents: Student[] = (enrollmentData || []).map((enroll: any) => {
                // The type of enroll is complex due to the joins, so we cast to any for mapping simplicity
                // but we know the structure from the select above.
                const studentId = enroll.student?.id;
                const studentName = enroll.student?.user?.full_name || "Unknown";

                const existing = attendanceData?.find((a) => a.student_id === studentId);
                return {
                    id: studentId,
                    name: studentName,
                    status: existing ? (existing.status as Student['status']) : "unmarked",
                    enrollment_id: enroll.id
                };
            });

            setStudents(mappedStudents);

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load students");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = (id: string, status: Student["status"]) => {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    const saveAttendance = async () => {
        if (!selectedClassId) return;
        setSaving(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];

            // Filter out "unmarked"? Or save them? Usually we only save meaningful statuses.
            // But if we want to record "present" we must save.
            // If status is "unmarked", we might want to delete the record if it exists?
            // For simplicity, we upsert all non-unmarked.

            const recordsToUpsert = students
                .filter((s): s is Student & { status: "present" | "absent" | "late" | "excused" } => s.status !== "unmarked")
                .map(s => ({
                    class_id: selectedClassId,
                    student_id: s.id,
                    date: dateStr,
                    status: s.status,
                    recorded_at: new Date().toISOString()
                }));

            if (recordsToUpsert.length === 0) {
                Alert.alert("Info", "No attendance marked to save.");
                setSaving(false);
                return;
            }

            const { error } = await supabase
                .from('attendance')
                .upsert(recordsToUpsert, { onConflict: 'student_id,class_id,date' });

            if (error) throw error;

            Alert.alert("Success", "Attendance saved successfully");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save attendance");
        } finally {
            setSaving(false);
        }
    };

    const presentCount = students.filter(s => s.status === "present").length;
    const absentCount = students.filter(s => s.status === "absent").length;
    const lateCount = students.filter(s => s.status === "late").length;
    const excusedCount = students.filter(s => s.status === "excused").length;
    const unmarkedCount = students.filter(s => s.status === "unmarked").length;

    const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || "Select Class";

    return (
        <>
            <StatusBar barStyle="dark-content" />
            <View className="flex-1 bg-gray-50">
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View className="p-4">
                        {/* Header */}
                        <View className="flex-row items-center mb-6">
                            <TouchableOpacity className="p-2 mr-2" onPress={() => router.back()}>
                                <ArrowLeft size={24} color="#374151" />
                            </TouchableOpacity>
                            <View>
                                <Text className="text-2xl font-bold text-gray-900">Attendance</Text>
                                <Text className="text-gray-500 text-sm">{selectedDate.toDateString()}</Text>
                            </View>
                        </View>

                        {/* Date & Class Selectors */}
                        <View className="flex-row gap-3 mb-4">
                            {/* Date Picker (Mock Button for now) */}
                            <TouchableOpacity className="flex-1 bg-white rounded-xl px-4 py-3 border border-gray-100 flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Calendar size={16} color="#0d9488" />
                                    <Text className="text-gray-700 font-medium ml-2">Today</Text>
                                </View>
                                <ChevronDown size={16} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Class Dropdown */}
                        <View className="mb-6 relative z-10">
                            <TouchableOpacity
                                className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex-row items-center justify-between"
                                onPress={() => setShowClassDropdown(!showClassDropdown)}
                            >
                                <Text className="text-gray-700 font-medium">{selectedClassName}</Text>
                                <ChevronDown size={16} color="#6B7280" />
                            </TouchableOpacity>

                            {showClassDropdown && (
                                <View className="absolute top-12 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-20">
                                    {classes.map(cls => (
                                        <TouchableOpacity
                                            key={cls.id}
                                            className="px-4 py-3 border-b border-gray-50 last:border-0"
                                            onPress={() => {
                                                setSelectedClassId(cls.id);
                                                setShowClassDropdown(false);
                                            }}
                                        >
                                            <Text className="text-gray-900">{cls.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Stats */}
                        <View className="flex-row gap-2 mb-6">
                            <View className="flex-1 bg-green-500 p-2 rounded-xl items-center">
                                <Text className="text-white text-lg font-bold">{presentCount}</Text>
                                <Text className="text-green-100 text-[10px]">Present</Text>
                            </View>
                            <View className="flex-1 bg-red-500 p-2 rounded-xl items-center">
                                <Text className="text-white text-lg font-bold">{absentCount}</Text>
                                <Text className="text-red-100 text-[10px]">Absent</Text>
                            </View>
                            <View className="flex-1 bg-yellow-500 p-2 rounded-xl items-center">
                                <Text className="text-white text-lg font-bold">{lateCount}</Text>
                                <Text className="text-yellow-100 text-[10px]">Late</Text>
                            </View>
                            <View className="flex-1 bg-blue-500 p-2 rounded-xl items-center">
                                <Text className="text-white text-lg font-bold">{excusedCount}</Text>
                                <Text className="text-blue-100 text-[10px]">Excused</Text>
                            </View>
                            <View className="flex-1 bg-gray-400 p-2 rounded-xl items-center">
                                <Text className="text-white text-lg font-bold">{unmarkedCount}</Text>
                                <Text className="text-gray-200 text-[10px]">Pending</Text>
                            </View>
                        </View>

                        {/* Student List */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">Students</Text>

                        {loading ? (
                            <ActivityIndicator size="large" color="#0d9488" className="mt-8" />
                        ) : students.length === 0 ? (
                            <Text className="text-gray-500 text-center mt-8">No students found in this class.</Text>
                        ) : (
                            students.map((student) => (
                                <StudentAttendanceRow
                                    key={student.id}
                                    student={student}
                                    onMark={handleMarkAttendance}
                                />
                            ))
                        )}

                        {/* Submit Button */}
                        <TouchableOpacity
                            className={`bg-teal-600 py-4 rounded-xl items-center mt-4 mb-6 ${saving ? 'opacity-50' : ''}`}
                            onPress={saveAttendance}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-base">Save Attendance</Text>
                            )}
                        </TouchableOpacity>

                        {/* Recent Sessions (Static for now or fetch later) */}
                        {/* Removed for brevity as we focus on taking attendance */}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
