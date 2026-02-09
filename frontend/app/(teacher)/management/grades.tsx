import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { ArrowLeft, Search, Filter, Download, Edit2, ChevronDown, Check } from 'lucide-react-native';
import { router } from "expo-router";

interface StudentGrade {
    id: string;
    name: string;
    course: string;
    assignment: string;
    score: number | null;
    maxScore: number;
    status: "graded" | "pending" | "submitted";
    submittedAt: string;
}

const GradeRow = ({ student, onGrade }: { student: StudentGrade; onGrade: (id: string) => void }) => {
    const getStatusColor = (status: string) => {
        if (status === "graded") return "bg-green-50 text-green-600";
        if (status === "pending") return "bg-yellow-50 text-yellow-600";
        return "bg-blue-50 text-blue-600";
    };

    return (
        <View className="bg-white p-4 rounded-xl border border-gray-100 mb-2 flex-row items-center">
            {/* Avatar */}
            <View className="w-10 h-10 rounded-full bg-teal-100 items-center justify-center mr-3">
                <Text className="text-teal-600 font-bold">{student.name.charAt(0)}</Text>
            </View>

            {/* Info */}
            <View className="flex-1">
                <Text className="text-gray-900 font-semibold">{student.name}</Text>
                <Text className="text-gray-400 text-xs">{student.assignment}</Text>
            </View>

            {/* Score */}
            <View className="items-end mr-3">
                {student.score !== null ? (
                    <Text className="text-gray-900 font-bold">{student.score}/{student.maxScore}</Text>
                ) : (
                    <Text className="text-gray-400 text-sm">--/{student.maxScore}</Text>
                )}
                <View className={`px-2 py-0.5 rounded-full mt-1 ${getStatusColor(student.status)}`}>
                    <Text className={`text-xs font-medium ${getStatusColor(student.status).split(' ')[1]}`}>
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                    </Text>
                </View>
            </View>

            {/* Grade Button */}
            <TouchableOpacity
                className={`p-2 rounded-lg ${student.status === "graded" ? "bg-gray-100" : "bg-teal-600"}`}
                onPress={() => onGrade(student.id)}
            >
                {student.status === "graded" ? (
                    <Check size={18} color="#6B7280" />
                ) : (
                    <Edit2 size={18} color="white" />
                )}
            </TouchableOpacity>
        </View>
    );
};

export default function GradesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCourse, setSelectedCourse] = useState("All Courses");

    const students: StudentGrade[] = [
        { id: "1", name: "Sarah Johnson", course: "Mathematics", assignment: "Quiz 1", score: 85, maxScore: 100, status: "graded", submittedAt: "2 days ago" },
        { id: "2", name: "Michael Chen", course: "Mathematics", assignment: "Quiz 1", score: null, maxScore: 100, status: "submitted", submittedAt: "1 day ago" },
        { id: "3", name: "Alice Kamau", course: "Computer Science", assignment: "Project 1", score: null, maxScore: 100, status: "pending", submittedAt: "3 hours ago" },
        { id: "4", name: "James Omondi", course: "Mathematics", assignment: "Quiz 1", score: 92, maxScore: 100, status: "graded", submittedAt: "3 days ago" },
        { id: "5", name: "Grace Wanjiku", course: "Writing Workshop", assignment: "Essay 1", score: null, maxScore: 100, status: "submitted", submittedAt: "5 hours ago" },
        { id: "6", name: "Peter Njoroge", course: "Computer Science", assignment: "Lab 2", score: 78, maxScore: 100, status: "graded", submittedAt: "1 week ago" },
    ];

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.assignment.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingCount = students.filter(s => s.status !== "graded").length;

    const handleGrade = (id: string) => {
        console.log("Grade student:", id);
        // TODO: Open grading modal
    };

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
                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-row items-center">
                                <TouchableOpacity className="p-2 mr-2" onPress={() => router.back()}>
                                    <ArrowLeft size={24} color="#374151" />
                                </TouchableOpacity>
                                <View>
                                    <Text className="text-2xl font-bold text-gray-900">Grade Book</Text>
                                    <Text className="text-gray-500 text-sm">{pendingCount} pending grades</Text>
                                </View>
                            </View>
                            <TouchableOpacity className="p-2 bg-white rounded-xl border border-gray-100">
                                <Download size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Quick Stats */}
                        <View className="flex-row gap-3 mb-6">
                            <View className="flex-1 bg-green-500 p-3 rounded-xl">
                                <Text className="text-green-100 text-xs uppercase">Graded</Text>
                                <Text className="text-white text-xl font-bold">
                                    {students.filter(s => s.status === "graded").length}
                                </Text>
                            </View>
                            <View className="flex-1 bg-blue-500 p-3 rounded-xl">
                                <Text className="text-blue-100 text-xs uppercase">Submitted</Text>
                                <Text className="text-white text-xl font-bold">
                                    {students.filter(s => s.status === "submitted").length}
                                </Text>
                            </View>
                            <View className="flex-1 bg-yellow-500 p-3 rounded-xl">
                                <Text className="text-yellow-100 text-xs uppercase">Pending</Text>
                                <Text className="text-white text-xl font-bold">
                                    {students.filter(s => s.status === "pending").length}
                                </Text>
                            </View>
                        </View>

                        {/* Course Filter */}
                        <TouchableOpacity className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-100 flex-row items-center justify-between">
                            <Text className="text-gray-700 font-medium">{selectedCourse}</Text>
                            <ChevronDown size={18} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Search */}
                        <View className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-4 border border-gray-100">
                            <Search size={18} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-3 text-gray-900"
                                placeholder="Search students or assignments..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            <TouchableOpacity className="p-1">
                                <Filter size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Grade List */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">All Submissions</Text>
                        {filteredStudents.map((student) => (
                            <GradeRow key={student.id} student={student} onGrade={handleGrade} />
                        ))}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
