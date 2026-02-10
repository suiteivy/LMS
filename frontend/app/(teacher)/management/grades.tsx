import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { ArrowLeft, Search, Filter, Download, Edit2, ChevronDown, Check, X } from 'lucide-react-native';
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface StudentGrade {
    id: string; // submission_id
    student_name: string;
    student_display_id?: string;
    Subject_title: string;
    assignment_title: string;
    score: number | null;
    maxScore: number;
    status: "graded" | "pending" | "submitted" | "late";
    submittedAt: string;
    feedback?: string | null;
}

const GradeRow = ({ student, onGrade }: { student: StudentGrade; onGrade: (student: StudentGrade) => void }) => {
    const getStatusColor = (status: string) => {
        if (status === "graded") return "bg-green-50 text-green-600";
        if (status === "pending" || status === "submitted") return "bg-yellow-50 text-yellow-600";
        if (status === "late") return "bg-red-50 text-red-600";
        return "bg-blue-50 text-blue-600";
    };

    return (
        <View className="bg-white p-4 rounded-xl border border-gray-100 mb-2 flex-row items-center">
            {/* Avatar */}
            <View className="w-10 h-10 rounded-full bg-teal-100 items-center justify-center mr-3">
                <Text className="text-teal-600 font-bold">{student.student_name.charAt(0)}</Text>
            </View>

            {/* Info */}
            <View className="flex-1">
                <Text className="text-gray-900 font-semibold">{student.student_name}</Text>
                {student.student_display_id && (
                    <Text className="text-teal-600 text-[10px] font-bold">ID: {student.student_display_id}</Text>
                )}
                <Text className="text-gray-400 text-xs">{student.assignment_title} • {student.Subject_title}</Text>
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
                onPress={() => onGrade(student)}
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
    const { user, teacherId } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("All Subjects");
    const [submissions, setSubmissions] = useState<StudentGrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [gradingModalVisible, setGradingModalVisible] = useState(false);
    const [currentSubmission, setCurrentSubmission] = useState<StudentGrade | null>(null);
    const [gradeInput, setGradeInput] = useState("");
    const [feedbackInput, setFeedbackInput] = useState("");

    useEffect(() => {
        if (teacherId) {
            fetchSubmissions();
        }
    }, [teacherId]);

    const fetchSubmissions = async () => {
        if (!teacherId) return;

        try {
            // Fetch submissions for assignments created by this teacher
            // We need to join: submissions -> assignments -> Subjects
            const { data, error } = await supabase
                .from('submissions')
                .select(`
                    id,
                    grade,
                    status,
                    submitted_at,
                    feedback,
                    student:users!submissions_student_id_fkey(
                        full_name,
                        students(id)
                    ),
                    assignment:assignments!submissions_assignment_id_fkey(
                        title,
                        total_points,
                        Subject:Subjects!assignments_Subject_id_fkey(title)
                    )
                `)
                .order('submitted_at', { ascending: false });

            if (error) {
                console.error("Supabase Error:", error);
                throw error;
            }

            const formatted: StudentGrade[] = (data || []).map((sub: any) => ({
                id: sub.id,
                student_name: sub.student?.full_name || "Unknown",
                student_display_id: sub.student?.students?.[0]?.id,
                Subject_title: sub.assignment?.Subject?.title || "Unknown",
                assignment_title: sub.assignment?.title || "Unknown",
                score: sub.grade,
                maxScore: sub.assignment?.total_points || 100,
                status: sub.status,
                submittedAt: new Date(sub.submitted_at).toLocaleDateString(),
                feedback: sub.feedback
            }));

            setSubmissions(formatted);
        } catch (error) {
            console.error("Error fetching grades:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGradeClick = (student: StudentGrade) => {
        setCurrentSubmission(student);
        setGradeInput(student.score?.toString() || "");
        setFeedbackInput(student.feedback || "");
        setGradingModalVisible(true);
    };

    const submitGrade = async () => {
        if (!currentSubmission) return;

        const score = parseFloat(gradeInput);
        if (isNaN(score)) {
            Alert.alert("Invalid Score", "Please enter a valid number");
            return;
        }

        if (score > currentSubmission.maxScore) {
            Alert.alert("Invalid Score", `Score cannot be higher than ${currentSubmission.maxScore}`);
            return;
        }

        try {
            const { error } = await supabase
                .from('submissions')
                .update({
                    grade: score,
                    feedback: feedbackInput,
                    status: 'graded',
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentSubmission.id);

            if (error) throw error;

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s.id === currentSubmission.id
                    ? { ...s, score: score, feedback: feedbackInput, status: 'graded' }
                    : s
            ));

            setGradingModalVisible(false);
            setCurrentSubmission(null);
        } catch (error) {
            console.error("Error updating grade:", error);
            Alert.alert("Error", "Failed to save grade");
        }
    };

    const filteredStudents = submissions.filter(s =>
        s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.assignment_title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingCount = submissions.filter(s => s.status !== "graded").length;

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
                                    {submissions.filter(s => s.status === "graded").length}
                                </Text>
                            </View>
                            <View className="flex-1 bg-blue-500 p-3 rounded-xl">
                                <Text className="text-blue-100 text-xs uppercase">Submitted</Text>
                                <Text className="text-white text-xl font-bold">
                                    {submissions.filter(s => s.status === "submitted").length}
                                </Text>
                            </View>
                            <View className="flex-1 bg-yellow-500 p-3 rounded-xl">
                                <Text className="text-yellow-100 text-xs uppercase">Pending</Text>
                                <Text className="text-white text-xl font-bold">
                                    {submissions.filter(s => s.status === "pending").length}
                                </Text>
                            </View>
                        </View>

                        {/* Subject Filter */}
                        <TouchableOpacity className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-100 flex-row items-center justify-between">
                            <Text className="text-gray-700 font-medium">{selectedSubject}</Text>
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

                        {loading ? (
                            <ActivityIndicator size="large" color="#0d9488" className="mt-8" />
                        ) : filteredStudents.length === 0 ? (
                            <Text className="text-gray-500 text-center mt-8">No submissions found</Text>
                        ) : (
                            filteredStudents.map((student) => (
                                <GradeRow key={student.id} student={student} onGrade={handleGradeClick} />
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>

            {/* Grading Modal */}
            <Modal visible={gradingModalVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Grade Submission</Text>
                            <TouchableOpacity onPress={() => setGradingModalVisible(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-4">
                            <Text className="text-gray-500 text-sm mb-1">Student</Text>
                            <Text className="text-gray-900 font-semibold">{currentSubmission?.student_name}</Text>
                        </View>

                        <View className="mb-4">
                            <Text className="text-gray-500 text-sm mb-1">Assignment</Text>
                            <Text className="text-gray-900 font-semibold">{currentSubmission?.assignment_title}</Text>
                        </View>

                        <View className="mb-4">
                            <Text className="text-gray-500 text-sm mb-1">Score (Max: {currentSubmission?.maxScore})</Text>
                            <TextInput
                                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
                                placeholder="Enter score"
                                keyboardType="numeric"
                                value={gradeInput.toString()}
                                onChangeText={setGradeInput}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-500 text-sm mb-1">Feedback</Text>
                            <TextInput
                                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 h-24"
                                placeholder="Enter feedback"
                                multiline
                                textAlignVertical="top"
                                value={feedbackInput}
                                onChangeText={setFeedbackInput}
                            />
                        </View>

                        <TouchableOpacity
                            className="bg-teal-600 py-4 rounded-xl items-center"
                            onPress={submitGrade}
                        >
                            <Text className="text-white font-bold text-base">Save Grade</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}
