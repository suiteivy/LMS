import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, Plus, FileText, Calendar, Clock, Users, Eye, Edit2, Trash2, X, ChevronDown } from 'lucide-react-native';
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import DateTimePicker from '@react-native-community/datetimepicker';

interface Assignment {
    id: string;
    title: string;
    Subject: string;
    dueDate: string;
    submissions: number;
    totalStudents: number; // Placeholder or fetched
    status: "active" | "draft" | "closed";
    subject_id: string;
}

interface SubjectOption {
    id: string;
    title: string;
}

const AssignmentCard = ({ assignment }: { assignment: Assignment }) => {
    const getStatusStyle = (status: string) => {
        if (status === "active") return "bg-green-50 text-green-600 border-green-100";
        if (status === "draft") return "bg-gray-50 text-gray-600 border-gray-200";
        return "bg-red-50 text-red-600 border-red-100";
    };

    const progressPercent = assignment.totalStudents > 0
        ? (assignment.submissions / assignment.totalStudents) * 100
        : 0;

    return (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-3">
                    <Text className="text-gray-900 font-bold text-base">{assignment.title}</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">{assignment.Subject}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full border ${getStatusStyle(assignment.status || 'active')}`}>
                    <Text className={`text-xs font-bold ${getStatusStyle(assignment.status || 'active').split(' ')[1]}`}>
                        {(assignment.status || 'active').charAt(0).toUpperCase() + (assignment.status || 'active').slice(1)}
                    </Text>
                </View>
            </View>

            <View className="flex-row mb-3">
                <View className="flex-row items-center mr-4">
                    <Calendar size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1">{assignment.dueDate}</Text>
                </View>
                <View className="flex-row items-center">
                    <Users size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1">
                        {assignment.submissions} submitted
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <View className="h-full bg-teacherOrange rounded-full" style={{ width: `${progressPercent}%` }} />
            </View>

            {/* Actions */}
            <View className="flex-row justify-end gap-3">
                <TouchableOpacity className="flex-row items-center p-2">
                    <Eye size={16} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1 font-medium">View</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center p-2">
                    <Edit2 size={16} color="#FF6B00" />
                    <Text className="text-teacherOrange text-xs ml-1 font-medium">Edit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AssignmentsPage() {
    const { user, teacherId } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<"all" | "active" | "draft" | "closed">("all");
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [Subjects, setSubjects] = useState<SubjectOption[]>([]);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [points, setPoints] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [dateObject, setDateObject] = useState(new Date())
    const [showDatePicker, setShowDatePicker] = useState(false)


    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false)
        if (selectedDate) {
            setDateObject(selectedDate)
            setDueDate(selectedDate.toISOString().split('T')[0])
        }
    }

    useEffect(() => {
        if (teacherId) {
            fetchAssignments();
            fetchSubjects();
        }
    }, [teacherId]);

    const fetchSubjects = async () => {
        if (!teacherId) return;
        const { data } = await supabase.from('subjects').select('id, title').eq('teacher_id', teacherId);
        if (data) setSubjects(data);
    };

    const fetchAssignments = async () => {
        if (!teacherId) return;

        try {
            // Fetch assignments filtered by Subjects taught by this teacher
            // We can check if teacher_id on assignment matches
            const { data, error } = await supabase
                .from('assignments')
                .select(`
                    *,
                    subject:subjects(title),
                    submissions(count)
                `)
                .eq('teacher_id', teacherId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((a: any) => ({
                id: a.id,
                title: a.title,
                Subject: a.subject?.title || "Unknown Subject",
                subject_id: a.subject_id,
                dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString() : "No Due Date",
                submissions: a.submissions?.[0]?.count || 0,
                totalStudents: 0,
                status: a.status || 'active'
            }));

            setAssignments(formatted);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const createAssignment = async () => {
        if (!teacherId) return;
        if (!title || !selectedSubjectId) {
            Alert.alert("Missing Fields", "Please fill in title and select a Subject.");
            return;
        }

        try {
            const { error } = await supabase.from('assignments').insert({
                teacher_id: teacherId,
                subject_id: selectedSubjectId,
                title,
                description,
                due_date: dueDate ? new Date(dueDate).toISOString() : null, // Naive parsing, better to use date picker
                total_points: parseInt(points) || 100,
                status: 'active'
            });

            if (error) throw error;

            setShowModal(false);
            fetchAssignments();
            // Reset form
            setTitle("");
            setDescription("");
            setDueDate("");
            setPoints("");
            setSelectedSubjectId("");

        } catch (error) {
            Alert.alert("Error", "Failed to create assignment");
            console.error(error);
        }
    };

    const filteredAssignments = filter === "all"
        ? assignments
        : assignments.filter(a => a.status === filter);

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
                                <Text className="text-2xl font-bold text-gray-900">Assignments</Text>
                            </View>
                            <TouchableOpacity
                                className="flex-row items-center bg-teacherOrange px-4 py-2 rounded-xl"
                                onPress={() => setShowModal(true)}
                            >
                                <Plus size={18} color="white" />
                                <Text className="text-white font-semibold ml-1">New</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Stats */}
                        <View className="flex-row gap-3 mb-6">
                            <View className="flex-1 bg-teacherOrange p-3 rounded-xl">
                                <Text className="text-white text-xs uppercase">Active</Text>
                                <Text className="text-white text-xl font-bold">
                                    {assignments.filter(a => a.status === "active").length}
                                </Text>
                            </View>
                            <View className="flex-1 bg-white p-3 rounded-xl border border-gray-100">
                                <Text className="text-gray-400 text-xs uppercase">Submissions</Text>
                                <Text className="text-gray-900 text-xl font-bold">
                                    {assignments.reduce((acc, a) => acc + a.submissions, 0)}
                                </Text>
                            </View>
                        </View>

                        {/* Filter Tabs */}
                        <View className="flex-row bg-white rounded-xl p-1 mb-4 border border-gray-100">
                            {(["all", "active", "draft", "closed"] as const).map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    className={`flex-1 py-2 rounded-lg ${filter === tab ? "bg-teacherOrange" : ""}`}
                                    onPress={() => setFilter(tab)}
                                >
                                    <Text className={`text-center font-medium text-xs ${filter === tab ? "text-white" : "text-gray-500"}`}>
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Assignment List */}
                        {loading ? (
                            <ActivityIndicator size="large" color="#FF6B00" className="mt-8" />
                        ) : filteredAssignments.length === 0 ? (
                            <Text className="text-gray-500 text-center mt-8">No assignments found</Text>
                        ) : (
                            filteredAssignments.map((assignment) => (
                                <AssignmentCard key={assignment.id} assignment={assignment} />
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>

            {/* Create Assignment Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Create Assignment</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Subject Selector (Simple) */}
                        <Text className="text-gray-500 text-xs uppercase mb-1 font-semibold">Subject</Text>
                        <ScrollView horizontal className="flex-row mb-4" showsHorizontalScrollIndicator={false}>
                            {Subjects.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    onPress={() => setSelectedSubjectId(c.id)}
                                    className={`mr-2 px-4 py-2 rounded-lg border ${selectedSubjectId === c.id ? 'bg-teacherOrange border-teacherOrange' : 'bg-gray-50 border-gray-200'}`}
                                >
                                    <Text className={selectedSubjectId === c.id ? 'text-white' : 'text-gray-700'}>{c.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>


                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900"
                            placeholder="Assignment Title"
                            placeholderTextColor="#9CA3AF"
                            value={title}
                            onChangeText={setTitle}
                        />
                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900 h-24"
                            placeholder="Description"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            textAlignVertical="top"
                            value={description}
                            onChangeText={setDescription}
                        />
                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center"
                        >
                            <Text className={dueDate ? "text-gray-900" : "text-gray-300"}>
                                {dueDate ? dueDate : "Select due date"}
                            </Text>
                            <Calendar size={18} color="#9ca3af" />

                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={dateObject}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                                minimumDate={new Date()} // Can't set a due date in the past
                            />
                        )}
                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-gray-900"
                            placeholder="Max Points (e.g., 100)"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={points}
                            onChangeText={setPoints}
                        />

                        <TouchableOpacity
                            className="bg-teacherOrange py-4 rounded-xl items-center"
                            onPress={createAssignment}
                        >
                            <Text className="text-white font-bold text-base">Create Assignment</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}
