import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { ArrowLeft, Calendar, Check, X, Clock, Users, ChevronDown, ChevronRight } from 'lucide-react-native';
import { router } from "expo-router";

interface Student {
    id: string;
    name: string;
    status: "present" | "absent" | "late" | "unmarked";
}

interface AttendanceSession {
    date: string;
    course: string;
    time: string;
    present: number;
    absent: number;
    total: number;
}

const StudentAttendanceRow = ({ student, onMark }: { student: Student; onMark: (id: string, status: Student["status"]) => void }) => {
    const getStatusStyle = (status: string) => {
        if (status === "present") return { bg: "bg-green-500", text: "P" };
        if (status === "absent") return { bg: "bg-red-500", text: "A" };
        if (status === "late") return { bg: "bg-yellow-500", text: "L" };
        return { bg: "bg-gray-300", text: "?" };
    };

    const statusInfo = getStatusStyle(student.status);

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
            </View>
        </View>
    );
};

export default function AttendancePage() {
    const [selectedDate, setSelectedDate] = useState("Today, Feb 9");
    const [selectedCourse, setSelectedCourse] = useState("Mathematics");
    const [students, setStudents] = useState<Student[]>([
        { id: "1", name: "Sarah Johnson", status: "present" },
        { id: "2", name: "Michael Chen", status: "present" },
        { id: "3", name: "Alice Kamau", status: "unmarked" },
        { id: "4", name: "James Omondi", status: "absent" },
        { id: "5", name: "Grace Wanjiku", status: "present" },
        { id: "6", name: "Peter Njoroge", status: "late" },
        { id: "7", name: "Mary Akinyi", status: "unmarked" },
        { id: "8", name: "David Mwangi", status: "unmarked" },
    ]);

    const recentSessions: AttendanceSession[] = [
        { date: "Feb 8, 2026", course: "Mathematics", time: "09:00 AM", present: 23, absent: 2, total: 25 },
        { date: "Feb 7, 2026", course: "Computer Science", time: "11:00 AM", present: 28, absent: 2, total: 30 },
        { date: "Feb 6, 2026", course: "Writing Workshop", time: "02:00 PM", present: 18, absent: 2, total: 20 },
    ];

    const handleMarkAttendance = (id: string, status: Student["status"]) => {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    const presentCount = students.filter(s => s.status === "present").length;
    const absentCount = students.filter(s => s.status === "absent").length;
    const lateCount = students.filter(s => s.status === "late").length;
    const unmarkedCount = students.filter(s => s.status === "unmarked").length;

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
                                <Text className="text-gray-500 text-sm">Mark today's attendance</Text>
                            </View>
                        </View>

                        {/* Date & Course Selectors */}
                        <View className="flex-row gap-3 mb-4">
                            <TouchableOpacity className="flex-1 bg-white rounded-xl px-4 py-3 border border-gray-100 flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Calendar size={16} color="#0d9488" />
                                    <Text className="text-gray-700 font-medium ml-2">{selectedDate}</Text>
                                </View>
                                <ChevronDown size={16} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity className="bg-white rounded-xl px-4 py-3 mb-6 border border-gray-100 flex-row items-center justify-between">
                            <Text className="text-gray-700 font-medium">{selectedCourse}</Text>
                            <ChevronDown size={16} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Stats */}
                        <View className="flex-row gap-2 mb-6">
                            <View className="flex-1 bg-green-500 p-3 rounded-xl items-center">
                                <Text className="text-white text-lg font-bold">{presentCount}</Text>
                                <Text className="text-green-100 text-xs">Present</Text>
                            </View>
                            <View className="flex-1 bg-red-500 p-3 rounded-xl items-center">
                                <Text className="text-white text-lg font-bold">{absentCount}</Text>
                                <Text className="text-red-100 text-xs">Absent</Text>
                            </View>
                            <View className="flex-1 bg-yellow-500 p-3 rounded-xl items-center">
                                <Text className="text-white text-lg font-bold">{lateCount}</Text>
                                <Text className="text-yellow-100 text-xs">Late</Text>
                            </View>
                            <View className="flex-1 bg-gray-400 p-3 rounded-xl items-center">
                                <Text className="text-white text-lg font-bold">{unmarkedCount}</Text>
                                <Text className="text-gray-200 text-xs">Pending</Text>
                            </View>
                        </View>

                        {/* Student List */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">Students</Text>
                        {students.map((student) => (
                            <StudentAttendanceRow
                                key={student.id}
                                student={student}
                                onMark={handleMarkAttendance}
                            />
                        ))}

                        {/* Submit Button */}
                        <TouchableOpacity className="bg-teal-600 py-4 rounded-xl items-center mt-4 mb-6">
                            <Text className="text-white font-bold text-base">Save Attendance</Text>
                        </TouchableOpacity>

                        {/* Recent Sessions */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">Recent Sessions</Text>
                        {recentSessions.map((session, index) => (
                            <TouchableOpacity
                                key={index}
                                className="bg-white p-4 rounded-xl border border-gray-100 mb-2 flex-row items-center"
                            >
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-semibold">{session.course}</Text>
                                    <Text className="text-gray-400 text-xs">{session.date} • {session.time}</Text>
                                </View>
                                <View className="items-end mr-2">
                                    <Text className="text-green-600 font-bold">{session.present}/{session.total}</Text>
                                    <Text className="text-gray-400 text-xs">present</Text>
                                </View>
                                <ChevronRight size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
