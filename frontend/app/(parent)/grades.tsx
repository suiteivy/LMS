import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, GraduationCap, TrendingUp, BookOpen, AlertCircle } from "lucide-react-native";
import { ParentService } from "@/services/ParentService";
import { ExamService } from "@/services/ExamService";

export default function StudentGradesPage() {
    const { studentId } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [performance, setPerformance] = useState<any>(null);
    const [examResults, setExamResults] = useState<any[]>([]);

    useEffect(() => {
        if (studentId) {
            fetchData();
        }
    }, [studentId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [perf, results] = await Promise.all([
                ParentService.getStudentPerformance(studentId as string),
                ExamService.getExamResults(undefined, studentId as string)
            ]);
            setPerformance(perf);
            setExamResults(results);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load academic records");
        } finally {
            setLoading(false);
        }
    };

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
                <TouchableOpacity onPress={() => router.back()} className="bg-gray-100 p-2 rounded-full w-10 mb-4">
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900">Academic Records</Text>
                <Text className="text-gray-500 text-sm mt-1">Detailed performance and exam results</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                {/* Summary Card */}
                <View className="bg-[#FF6B00] p-6 rounded-[40px] mb-6 shadow-lg shadow-orange-200">
                    <View className="flex-row justify-between items-center mb-6">
                        <View>
                            <Text className="text-orange-100 text-xs font-bold uppercase mb-1">Current GPA</Text>
                            <Text className="text-white text-4xl font-bold">{performance?.gpa || "N/A"}</Text>
                        </View>
                        <View className="bg-white/20 p-4 rounded-3xl">
                            <TrendingUp size={32} color="white" />
                        </View>
                    </View>
                    <View className="flex-row gap-4">
                        <View className="flex-1 bg-white/10 p-4 rounded-3xl">
                            <Text className="text-orange-100 text-[10px] font-bold uppercase">Class Rank</Text>
                            <Text className="text-white text-xl font-bold">#4/40</Text>
                        </View>
                        <View className="flex-1 bg-white/10 p-4 rounded-3xl">
                            <Text className="text-orange-100 text-[10px] font-bold uppercase">Attendance</Text>
                            <Text className="text-white text-xl font-bold">92%</Text>
                        </View>
                    </View>
                </View>

                {/* Exam Results */}
                <Text className="text-lg font-bold text-gray-900 mb-4 ml-2">Recent Exam Results</Text>
                {examResults.length > 0 ? (
                    examResults.map((result) => (
                        <View key={result.id} className="bg-white p-5 rounded-3xl mb-4 border border-gray-100 shadow-sm">
                            <View className="flex-row justify-between items-start mb-4">
                                <View className="flex-1">
                                    <View className="flex-row items-center mb-1">
                                        <BookOpen size={16} color="#FF6B00" />
                                        <Text className="text-gray-900 font-bold ml-2 text-base">{result.exam?.title}</Text>
                                    </View>
                                    <Text className="text-gray-400 text-xs">{result.exam?.subject?.title || "Subject"}</Text>
                                </View>
                                <View className="bg-orange-50 px-3 py-1 rounded-full">
                                    <Text className="text-[#FF6B00] font-bold">{result.score}/{result.exam?.max_score}</Text>
                                </View>
                            </View>

                            {result.feedback && (
                                <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <View className="flex-row items-center mb-2">
                                        <AlertCircle size={14} color="#6B7280" />
                                        <Text className="text-gray-400 text-[10px] font-bold uppercase ml-2">Teacher Feedback</Text>
                                    </View>
                                    <Text className="text-gray-600 text-sm leading-5">{result.feedback}</Text>
                                </View>
                            )}
                        </View>
                    ))
                ) : (
                    <View className="bg-gray-100 p-10 rounded-[40px] items-center">
                        <GraduationCap size={48} color="#9CA3AF" />
                        <Text className="text-gray-400 mt-4 text-center">No exam results recorded for this student yet.</Text>
                    </View>
                )}

                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
