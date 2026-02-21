import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { router } from "expo-router";
import { Check, Download, Edit2, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface StudentGrade {
    id: string;
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
        if (status === "graded") return "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900";
        if (status === "pending" || status === "submitted") return "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900";
        if (status === "late") return "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900";
        return "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900";
    };

    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 mb-3 flex-row items-center shadow-sm">
            <View className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/30 items-center justify-center mr-3">
                <Text className="text-[#FF6900] font-bold text-lg">
                    {(student.student_name || "U").charAt(0)}
                </Text>
            </View>

            {/* Info */}
            <View className="flex-1">
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-base">{student.student_name}</Text>
                {student.student_display_id && (
                    <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-wider">ID: {student.student_display_id}</Text>
                )}
                <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5" numberOfLines={1}>
                    {student.assignment_title} • {student.Subject_title}
                </Text>
            </View>

            {/* Score */}
            <View className="items-end mr-4">
                <View className="flex-row items-baseline">
                    <Text className="text-gray-900 dark:text-gray-100 font-bold text-lg">{student.score !== null ? student.score : "--"}</Text>
                    <Text className="text-gray-400 dark:text-gray-500 text-xs font-bold">/{student.maxScore}</Text>
                </View>
                <View className={`px-2 py-0.5 rounded-full mt-1 border ${getStatusColor(student.status || 'pending').split(' ')[0]} ${getStatusColor(student.status || 'pending').split(' ')[2]}`}>
                    <Text className={`text-[8px] font-bold uppercase tracking-widest ${getStatusColor(student.status || 'pending').split(' ')[1]}`}>
                        {student.status || 'pending'}
                    </Text>
                </View>
            </View>

            {/* Grade Button */}
            <TouchableOpacity
                className={`w-10 h-10 rounded-xl items-center justify-center ${student.status === "graded" ? "bg-gray-100 dark:bg-[#242424]" : "bg-[#FF6900] shadow-sm active:bg-orange-600"}`}
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
    const { profile, teacherId } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("All Subjects");
    const [submissions, setSubmissions] = useState<StudentGrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [gradingModalVisible, setGradingModalVisible] = useState(false);
    const [currentSubmission, setCurrentSubmission] = useState<StudentGrade | null>(null);
    const [gradeInput, setGradeInput] = useState("");
    const [feedbackInput, setFeedbackInput] = useState("");
    const [subjects, setSubjects] = useState<any[]>([]);

    useEffect(() => {
        if (teacherId) {
            fetchSubjects();
        }
    }, [teacherId]);

    useEffect(() => {
        if (teacherId) {
            fetchSubmissions();
        }
    }, [teacherId, selectedSubject]);

    const fetchSubjects = async () => {
        if (!teacherId) return;
        const { data } = await supabase
            .from('subjects')
            .select('id, title')
            .eq('teacher_id', teacherId);
        if (data) setSubjects(data);
    };

    const fetchSubmissions = async () => {
        if (!teacherId) return;

        try {
            setLoading(true);
            let query = supabase
                .from('submissions')
                .select(`
                    id,
                    grade,
                    status,
                    submitted_at,
                    feedback,
                    student:students(
                        id,
                        user:users(full_name)
                    ),
                    assignment:assignments!inner(
                        title,
                        total_points,
                        teacher_id,
                        subject:subjects!inner(
                            id,
                            title
                        )
                    )
                `)
                .eq('assignment.teacher_id', teacherId);

            if (selectedSubject !== "All Subjects") {
                query = query.eq('assignment.subject.title', selectedSubject);
            }

            const { data, error } = await query.order('submitted_at', { ascending: false });

            if (error) throw error;

            const formatted: StudentGrade[] = (data || []).map((sub: any) => ({
                id: sub.id,
                student_name: sub.student?.user?.full_name || "Unknown",
                student_display_id: sub.student?.id,
                Subject_title: sub.assignment?.subject?.title || "Unknown",
                assignment_title: sub.assignment?.title || "Unknown Assignment",
                score: sub.grade,
                maxScore: sub.assignment?.total_points || 100,
                status: sub.status || 'pending',
                submittedAt: sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "N/A",
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
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Management"
                subtitle="Grade Book"
                role="Teacher"
                onBack={() => router.back()}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    {/* Summary row */}
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <View>
                            <Text className="text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-widest">
                                {pendingCount} pending submissions
                            </Text>
                        </View>
                        <TouchableOpacity className="p-2.5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm active:bg-gray-50 dark:active:bg-gray-900">
                            <Download size={18} color="#FF6900" />
                        </TouchableOpacity>
                    </View>

                    {/* Quick Stats */}
                    <View className="flex-row gap-3 mb-6">
                        <View className="flex-1 bg-green-500 p-4 rounded-3xl shadow-sm">
                            <Text className="text-green-100 text-[10px] font-bold uppercase tracking-wider">Graded</Text>
                            <Text className="text-white text-2xl font-bold mt-1">
                                {submissions.filter(s => s.status === "graded").length}
                            </Text>
                        </View>
                        <View className="flex-1 bg-orange-500 p-4 rounded-3xl shadow-sm">
                            <Text className="text-orange-100 text-[10px] font-bold uppercase tracking-wider">Pending</Text>
                            <Text className="text-white text-2xl font-bold mt-1">
                                {submissions.filter(s => s.status !== "graded").length}
                            </Text>
                        </View>
                    </View>

                    {/* Subject Filter */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-1">
                        <TouchableOpacity
                            className={`px-5 py-2.5 rounded-2xl mx-1 border ${selectedSubject === "All Subjects" ? "bg-[#FF6900] border-[#FF6900]" : "bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800 shadow-sm"}`}
                            onPress={() => setSelectedSubject("All Subjects")}
                        >
                            <Text className={`font-bold text-xs ${selectedSubject === "All Subjects" ? "text-white" : "text-gray-500 dark:text-gray-400"}`}>All Subjects</Text>
                        </TouchableOpacity>
                        {subjects.map((sub) => (
                            <TouchableOpacity
                                key={sub.id}
                                className={`px-5 py-2.5 rounded-2xl mx-1 border ${selectedSubject === sub.title ? "bg-[#FF6900] border-[#FF6900]" : "bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800 shadow-sm"}`}
                                onPress={() => setSelectedSubject(sub.title)}
                            >
                                <Text className={`font-bold text-xs ${selectedSubject === sub.title ? "text-white" : "text-gray-500 dark:text-gray-400"}`}>{sub.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Search */}
                    <View className="flex-row items-center bg-white dark:bg-[#1a1a1a] rounded-2xl px-4 py-3 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <Search size={18} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-3 text-gray-900 dark:text-gray-100 font-medium"
                            placeholder="Search students or assignments..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Grade List */}
                    <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4 px-1 tracking-tight">All Submissions</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : filteredStudents.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-10 rounded-3xl items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-center">No submissions found</Text>
                        </View>
                    ) : (
                        filteredStudents.map((student) => (
                            <GradeRow key={student.id} student={student} onGrade={handleGradeClick} />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Grading Modal */}
            <Modal visible={gradingModalVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white dark:bg-[#121212] rounded-t-[40px] p-8 pb-12 border-t border-gray-100 dark:border-gray-800">
                        <View className="flex-row justify-between items-center mb-8">
                            <Text className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Grade Submission</Text>
                            <TouchableOpacity
                                className="w-10 h-10 bg-gray-50 dark:bg-[#1a1a1a] rounded-full items-center justify-center"
                                onPress={() => setGradingModalVisible(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-6 bg-gray-50 dark:bg-[#1a1a1a] p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                            <View className="mb-4">
                                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Student</Text>
                                <Text className="text-gray-900 dark:text-white font-bold text-lg">{currentSubmission?.student_name}</Text>
                            </View>

                            <View>
                                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Assignment</Text>
                                <Text className="text-gray-900 dark:text-white font-bold text-base">{currentSubmission?.assignment_title}</Text>
                            </View>
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-sm font-bold mb-2 ml-2">Score (Max: {currentSubmission?.maxScore})</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-5 py-4 text-gray-900 dark:text-white font-bold text-lg border border-gray-100 dark:border-gray-800"
                                placeholder="0.0"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                value={gradeInput.toString()}
                                onChangeText={setGradeInput}
                            />
                        </View>

                        <View className="mb-8">
                            <Text className="text-gray-500 dark:text-gray-400 text-sm font-bold mb-2 ml-2">Feedback</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-5 py-4 text-gray-900 dark:text-white h-32 border border-gray-100 dark:border-gray-800"
                                placeholder="Add comments here..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                textAlignVertical="top"
                                value={feedbackInput}
                                onChangeText={setFeedbackInput}
                            />
                        </View>

                        <TouchableOpacity
                            className="bg-[#FF6900] py-5 rounded-2xl items-center shadow-lg active:bg-orange-600"
                            onPress={submitGrade}
                        >
                            <Text className="text-white font-bold text-lg">Save Grade</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
