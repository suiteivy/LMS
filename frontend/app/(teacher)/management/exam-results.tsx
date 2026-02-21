import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ExamService } from "@/services/ExamService";
import { TeacherAttendanceAPI } from "@/services/TeacherAttendanceService";
import { showError, showSuccess } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import { Save, Search, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

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
            const exams = await ExamService.getExams();
            const currentExam = exams.find((e: any) => e.id === examId);
            setExam(currentExam);

            if (!currentExam) {
                showError("Error", "Exam not found");
                router.back();
                return;
            }

            const studentList = await TeacherAttendanceAPI.getStudentAttendance(new Date().toISOString().split('T')[0], currentExam.subject_id);
            const existingResults = await ExamService.getExamResults(examId as string);

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
            showError("Error", "Failed to load data");
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
            showSuccess("Success", "Exam results saved successfully");
        } catch (error) {
            console.error(error);
            showError("Error", "Failed to save results");
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = studentScores.filter(s =>
        s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View className="flex-1 bg-gray-50">
            <UnifiedHeader
                title={exam?.title || "Exam Results"}
                subtitle={exam ? `Max: ${exam.max_score}` : "Grading"}
                role="Teacher"
                onBack={() => router.back()}
            />

            <View className="p-4 md:p-8">
                {/* Actions Row */}
                <View className="flex-row items-center gap-3 mb-6">
                    <View className="flex-1 flex-row items-center bg-white px-5 py-3.5 rounded-2xl border border-gray-100 shadow-sm">
                        <Search size={18} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-3 text-gray-900 font-bold text-xs uppercase tracking-widest"
                            placeholder="Find student..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={handleSaveResults}
                        disabled={saving}
                        className={`w-14 h-14 rounded-2xl items-center justify-center shadow-lg ${saving ? 'bg-gray-100' : 'bg-[#FF6900]'}`}
                    >
                        {saving ? <ActivityIndicator size="small" color="#9CA3AF" /> : <Save size={24} color="white" />}
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                ) : (
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 200 }}>
                        {filteredStudents.map((student) => (
                            <View key={student.student_id} className="bg-white p-5 rounded-[32px] mb-4 border border-gray-50 shadow-sm">
                                <View className="flex-row items-center mb-5">
                                    <View className="bg-orange-50 p-2.5 rounded-2xl mr-4 border border-orange-100">
                                        <User size={20} color="#FF6900" />
                                    </View>
                                    <Text className="text-gray-900 font-bold text-lg tracking-tight">{student.student_name}</Text>
                                </View>

                                <View className="flex-row gap-4">
                                    <View className="w-24">
                                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-[2px] ml-1 mb-2">Points</Text>
                                        <TextInput
                                            className="bg-gray-50 p-4 rounded-2xl font-bold text-gray-900 text-center border border-gray-100"
                                            placeholder="0"
                                            placeholderTextColor="#D1D5DB"
                                            keyboardType="numeric"
                                            value={student.score}
                                            onChangeText={(val) => handleUpdateScore(student.student_id, 'score', val)}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-[2px] ml-1 mb-2">Faculty Feedback</Text>
                                        <TextInput
                                            className="bg-gray-50 p-4 rounded-2xl text-gray-900 font-medium border border-gray-100"
                                            placeholder="Excellent work..."
                                            placeholderTextColor="#D1D5DB"
                                            value={student.feedback}
                                            onChangeText={(val) => handleUpdateScore(student.student_id, 'feedback', val)}
                                        />
                                    </View>
                                </View>
                            </View>
                        ))}

                        {filteredStudents.length === 0 && (
                            <View className="bg-white p-12 rounded-[40px] items-center border border-gray-100 border-dashed mt-8">
                                <User size={48} color="#E5E7EB" />
                                <Text className="text-gray-400 font-bold text-center mt-6">No matches found</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}
