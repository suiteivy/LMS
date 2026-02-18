import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, Save, Search, User } from "lucide-react-native";
import { ExamService } from "@/services/ExamService";
import { TeacherAttendanceAPI } from "@/services/TeacherAttendanceService"; // We can reuse student fetching logic
import { SubjectAPI } from "@/services/SubjectService";

interface StudentScore {
    student_id: string;
    student_name: string;
    score: string;
    feedback: string;
}

export default function ExamResultsPage() {
    const { examId } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exam, setExam] = useState<any>(null);
    const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (examId) {
            fetchInitialData();
        }
    }, [examId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Exam Details (we'll need a getExamById method in service, or filter from list)
            const exams = await ExamService.getExams();
            const currentExam = exams.find((e: any) => e.id === examId);
            setExam(currentExam);

            if (!currentExam) {
                Alert.alert("Error", "Exam not found");
                router.back();
                return;
            }

            // 2. Fetch Students for the subject
            // We can reuse the logic from attendance or subjects
            // For now, let's assume we have a way to get students for a subject
            const studentList = await TeacherAttendanceAPI.getStudentAttendance(new Date().toISOString().split('T')[0], currentExam.subject_id);

            // 3. Fetch Existing Results
            const existingResults = await ExamService.getExamResults(examId as string);

            // 4. Merge
            const initialScores = studentList.map((s: any) => {
                const existing = existingResults.find((r: any) => r.student_id === s.student_id);
                return {
                    student_id: s.student_id,
                    student_name: s.name,
                    score: existing ? existing.score.toString() : "",
                    feedback: existing ? existing.feedback || "" : ""
                };
            });

            setStudentScores(initialScores);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateScore = (studentId: string, field: 'score' | 'feedback', value: string) => {
        setStudentScores(prev => prev.map(s =>
            s.student_id === studentId ? { ...s, [field]: value } : s
        ));
    };

    const handleSaveResults = async () => {
        try {
            setSaving(true);
            const promises = studentScores
                .filter(s => s.score !== "")
                .map(s => ExamService.recordExamResult({
                    exam_id: examId,
                    student_id: s.student_id,
                    score: parseFloat(s.score),
                    feedback: s.feedback
                }));

            await Promise.all(promises);
            Alert.alert("Success", "Exam results saved successfully");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save results");
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = studentScores.filter(s =>
        s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.back()} className="bg-gray-100 p-2 rounded-full">
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View className="items-center">
                        <Text className="text-xl font-bold text-gray-900">{exam?.title}</Text>
                        <Text className="text-gray-500 text-xs">Max Score: {exam?.max_score}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleSaveResults}
                        disabled={saving}
                        className={`p-2 rounded-full ${saving ? 'bg-gray-100' : 'bg-[#FF6B00]'}`}
                    >
                        <Save size={24} color={saving ? "#9CA3AF" : "white"} />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View className="mt-6 flex-row items-center bg-gray-100 px-4 py-3 rounded-2xl">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-3 text-gray-900 font-medium"
                        placeholder="Search student..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <ScrollView className="flex-1 px-6 pt-4">
                {filteredStudents.map((student) => (
                    <View key={student.student_id} className="bg-white p-4 rounded-3xl mb-4 border border-gray-100 shadow-sm">
                        <View className="flex-row items-center mb-4">
                            <View className="bg-gray-100 p-2 rounded-2xl mr-3">
                                <User size={24} color="#6B7280" />
                            </View>
                            <Text className="text-lg font-bold text-gray-900">{student.student_name}</Text>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="flex-1">
                                <Text className="text-gray-500 text-xs font-bold uppercase mb-1 ml-1">Score</Text>
                                <TextInput
                                    className="bg-gray-50 p-3 rounded-2xl font-bold text-gray-900"
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={student.score}
                                    onChangeText={(val) => handleUpdateScore(student.student_id, 'score', val)}
                                />
                            </View>
                            <View className="flex-[2]">
                                <Text className="text-gray-500 text-xs font-bold uppercase mb-1 ml-1">Feedback</Text>
                                <TextInput
                                    className="bg-gray-50 p-3 rounded-2xl text-gray-900"
                                    placeholder="Good progress"
                                    value={student.feedback}
                                    onChangeText={(val) => handleUpdateScore(student.student_id, 'feedback', val)}
                                />
                            </View>
                        </View>
                    </View>
                ))}

                {filteredStudents.length === 0 && (
                    <View className="items-center py-20">
                        <Text className="text-gray-400">No students found</Text>
                    </View>
                )}

                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
