import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { ExamService } from "@/services/ExamService";
import { SubjectAPI } from "@/services/SubjectService";
import { router } from "expo-router";
import { Calendar, ChevronRight, FileText, Plus, X } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Exam {
    id: string;
    title: string;
    subject_title: string;
    date: string;
    max_score: number;
    results_count: number;
}

export default function ExamsPage() {
    const { teacherId } = useAuth();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [subjects, setSubjects] = useState<any[]>([]);

    // Form
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [maxScore, setMaxScore] = useState("100");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");

    useEffect(() => {
        fetchExams();
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        const data = await SubjectAPI.getFilteredSubjects();
        setSubjects(data);
    };

    const fetchExams = async () => {
        try {
            setLoading(true);
            const data = await ExamService.getExams();
            setExams(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateExam = async () => {
        if (!title || !selectedSubjectId || !date) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        try {
            await ExamService.createExam({
                title,
                description,
                date,
                max_score: parseInt(maxScore),
                subject_id: selectedSubjectId,
                teacher_id: teacherId
            });
            setShowCreateModal(false);
            fetchExams();
        } catch (error) {
            Alert.alert("Error", "Failed to create exam");
        }
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Academic"
                subtitle="Exams"
                role="Teacher"
                onBack={() => router.back()}
            />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <View>
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                {exams.length} scheduled exams
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="flex-row items-center bg-[#FF6900] px-5 py-2.5 rounded-2xl shadow-lg active:bg-orange-600"
                            onPress={() => setShowCreateModal(true)}
                        >
                            <Plus size={18} color="white" />
                            <Text className="text-white font-bold text-xs ml-2 uppercase tracking-widest">Schedule</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : exams.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <FileText size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No exams scheduled yet.</Text>
                        </View>
                    ) : (
                        exams.map((exam) => (
                            <View key={exam.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
                                <View className="flex-row justify-between items-start mb-4">
                                    <View className="flex-1">
                                        <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{exam.title}</Text>
                                        <Text className="text-[#FF6900] text-xs font-bold mt-1 uppercase tracking-wider">{exam.subject_title}</Text>
                                    </View>
                                    <View className="bg-gray-50 dark:bg-[#242424] px-3 py-1 rounded-full border border-gray-100 dark:border-gray-800">
                                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">{exam.results_count} results</Text>
                                    </View>
                                </View>

                                <View className="flex-row items-center mb-6 gap-4">
                                    <View className="flex-row items-center">
                                        <Calendar size={14} color="#6B7280" />
                                        <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold ml-1.5">{new Date(exam.date).toLocaleDateString()}</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <View className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mr-2" />
                                        <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold">{exam.max_score} Points</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={() => router.push(`/management/exam-results?examId=${exam.id}`)}
                                    className="flex-row items-center justify-between bg-gray-900 p-4 rounded-2xl active:bg-gray-800"
                                >
                                    <Text className="text-white font-bold text-sm ml-2">Manage Student Results</Text>
                                    <ChevronRight size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Create Modal */}
            <Modal visible={showCreateModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white dark:bg-[#121212] rounded-t-[40px] p-8 pb-12 border-t border-gray-100 dark:border-gray-800">
                        <View className="flex-row justify-between items-center mb-8">
                            <Text className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Schedule Exam</Text>
                            <TouchableOpacity
                                className="w-10 h-10 bg-gray-50 dark:bg-[#1a1a1a] rounded-full items-center justify-center"
                                onPress={() => setShowCreateModal(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Subject</Text>
                        <ScrollView horizontal className="flex-row mb-6" showsHorizontalScrollIndicator={false}>
                            {subjects.map(s => (
                                <TouchableOpacity
                                    key={s.id}
                                    onPress={() => setSelectedSubjectId(s.id)}
                                    className={`mr-3 px-6 py-3 rounded-2xl border ${selectedSubjectId === s.id ? 'bg-[#FF6900] border-[#FF6900] shadow-sm' : 'bg-gray-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800'}`}
                                >
                                    <Text className={`font-bold text-xs ${selectedSubjectId === s.id ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{s.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View className="mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Exam Title</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                placeholder="e.g. Mid-term Assessment"
                                placeholderTextColor="#9CA3AF"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View className="flex-row gap-4 mb-8">
                            <View className="flex-1">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Date (YYYY-MM-DD)</Text>
                                <TextInput
                                    className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                    placeholder="2024-06-15"
                                    placeholderTextColor="#9CA3AF"
                                    value={date}
                                    onChangeText={setDate}
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Max Score</Text>
                                <TextInput
                                    className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                    placeholder="100"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    value={maxScore}
                                    onChangeText={setMaxScore}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleCreateExam}
                            className="bg-[#FF6900] py-5 rounded-2xl items-center shadow-lg active:bg-orange-600"
                        >
                            <Text className="text-white font-bold text-lg">Create Exam</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
