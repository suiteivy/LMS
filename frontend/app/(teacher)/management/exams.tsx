import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, Plus, FileText, Calendar, Clock, Users, Eye, Edit2, Trash2, X, ChevronDown, Check } from 'lucide-react-native';
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ExamService } from "@/services/ExamService";
import { SubjectAPI } from "@/services/SubjectService";

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
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="dark-content" />
            <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => router.back()} className="mr-3">
                            <ArrowLeft size={24} color="#374151" />
                        </TouchableOpacity>
                        <Text className="text-2xl font-bold text-gray-900">Exams</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowCreateModal(true)}
                        className="bg-teacherOrange p-2 rounded-xl"
                    >
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF6B00" />
                ) : exams.length === 0 ? (
                    <Text className="text-gray-500 text-center mt-10">No exams scheduled yet.</Text>
                ) : (
                    exams.map((exam) => (
                        <View key={exam.id} className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm">
                            <Text className="text-lg font-bold text-gray-900">{exam.title}</Text>
                            <Text className="text-gray-500 text-sm mb-2">{exam.subject_title}</Text>
                            <View className="flex-row items-center">
                                <Calendar size={14} color="#6B7280" />
                                <Text className="text-gray-500 text-xs ml-1">{new Date(exam.date).toLocaleDateString()}</Text>
                                <View className="mx-2 w-1 h-1 bg-gray-300 rounded-full" />
                                <Text className="text-gray-500 text-xs">{exam.max_score} Points</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => router.push(`/management/exam-results?examId=${exam.id}`)}
                                className="mt-4 bg-gray-50 py-2 rounded-xl items-center"
                            >
                                <Text className="text-teacherOrange font-bold">Manage Results</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Create Modal */}
            <Modal visible={showCreateModal} animationType="slide">
                <View className="flex-1 bg-white p-6">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold">New Exam</Text>
                        <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-gray-500 mb-1">Subject</Text>
                    <ScrollView horizontal className="mb-4">
                        {subjects.map(s => (
                            <TouchableOpacity
                                key={s.id}
                                onPress={() => setSelectedSubjectId(s.id)}
                                className={`mr-2 px-4 py-2 rounded-xl border ${selectedSubjectId === s.id ? 'bg-teacherOrange border-teacherOrange' : 'bg-gray-100 border-gray-200'}`}
                            >
                                <Text className={selectedSubjectId === s.id ? 'text-white' : 'text-gray-700'}>{s.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TextInput
                        placeholder="Exam Title"
                        className="bg-gray-100 p-4 rounded-xl mb-4"
                        value={title}
                        onChangeText={setTitle}
                    />
                    <TextInput
                        placeholder="Date (YYYY-MM-DD)"
                        className="bg-gray-100 p-4 rounded-xl mb-4"
                        value={date}
                        onChangeText={setDate}
                    />
                    <TextInput
                        placeholder="Max Score"
                        className="bg-gray-100 p-4 rounded-xl mb-6"
                        keyboardType="numeric"
                        value={maxScore}
                        onChangeText={setMaxScore}
                    />

                    <TouchableOpacity
                        onPress={handleCreateExam}
                        className="bg-teacherOrange py-4 rounded-xl items-center"
                    >
                        <Text className="text-white font-bold text-lg">Create Exam</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}
