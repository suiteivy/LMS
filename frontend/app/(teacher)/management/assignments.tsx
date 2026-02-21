import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from "expo-router";
import { Calendar, Edit2, Eye, FileText, Plus, Upload, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Assignment {
    id: string;
    title: string;
    Subject: string;
    dueDate: string;
    submissions: number;
    totalStudents: number;
    status: "active" | "draft" | "closed";
    subject_id: string;
    attachment_url?: string;
    attachment_name?: string;
}

interface SubjectOption {
    id: string;
    title: string;
}

const AssignmentCard = ({ assignment, onEdit, onView }: { assignment: Assignment; onEdit: (a: Assignment) => void; onView: (a: Assignment) => void }) => {
    const getStatusStyle = (status: string) => {
        if (status === "active") return "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900";
        if (status === "draft") return "bg-gray-50 dark:bg-gray-950/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800";
        return "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900";
    };

    const progressPercent = assignment.totalStudents > 0
        ? (assignment.submissions / assignment.totalStudents) * 100
        : 0;

    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-3">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{assignment.title}</Text>
                    <Text className="text-[#FF6900] text-xs font-bold mt-1 uppercase tracking-wider">{assignment.Subject}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full border ${getStatusStyle(assignment.status || 'active').split(' ')[0]} ${getStatusStyle(assignment.status || 'active').split(' ')[2]}`}>
                    <Text className={`text-[10px] font-bold uppercase tracking-widest ${getStatusStyle(assignment.status || 'active').split(' ')[1]}`}>
                        {assignment.status || 'active'}
                    </Text>
                </View>
            </View>

            <View className="flex-row mb-5 gap-4">
                <View className="flex-row items-center">
                    <Calendar size={14} color="#6B7280" />
                    <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold ml-1.5">{assignment.dueDate}</Text>
                </View>
                <View className="flex-row items-center">
                    <Users size={14} color="#6B7280" />
                    <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold ml-1.5">
                        {assignment.submissions}/{assignment.totalStudents} submitted
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-gray-100 dark:bg-[#242424] rounded-full overflow-hidden mb-5">
                <View className="h-full bg-[#FF6900] rounded-full" style={{ width: `${progressPercent}%` }} />
            </View>

            {/* Actions */}
            <View className="flex-row justify-end gap-2">
                <TouchableOpacity
                    className="flex-row items-center px-4 py-2 bg-gray-50 dark:bg-[#242424] rounded-xl"
                    onPress={() => onView(assignment)}
                >
                    <Eye size={16} color="#6B7280" />
                    <Text className="text-gray-600 dark:text-gray-400 text-xs ml-2 font-bold">View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-row items-center px-4 py-2 bg-orange-50 dark:bg-orange-950/20 rounded-xl"
                    onPress={() => onEdit(assignment)}
                >
                    <Edit2 size={16} color="#FF6900" />
                    <Text className="text-[#FF6900] text-xs ml-2 font-bold">Edit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AssignmentsPage() {
    const { teacherId } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<"all" | "active" | "draft" | "closed">("all");
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [Subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [points, setPoints] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [dateObject, setDateObject] = useState(new Date())
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

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
            setLoading(true);
            const { data, error } = await supabase
                .from('assignments')
                .select(`*, subject:subjects(title, id), submissions(count)`)
                .eq('teacher_id', teacherId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const subjectIds = (data || []).map((a: any) => a.subject_id);
            const { data: countsData } = await supabase
                .from('enrollments')
                .select('subject_id')
                .in('subject_id', subjectIds)
                .eq('status', 'enrolled');

            const countsMap: Record<string, number> = {};
            (countsData || []).forEach((e: any) => {
                countsMap[e.subject_id] = (countsMap[e.subject_id] || 0) + 1;
            });

            const formatted = (data || []).map((a: any) => ({
                id: a.id,
                title: a.title,
                Subject: a.subject?.title || "Unknown Subject",
                subject_id: a.subject_id,
                dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString() : "No Due Date",
                submissions: a.submissions?.[0]?.count || 0,
                totalStudents: countsMap[a.subject_id] || 0,
                status: a.status || 'active',
                attachment_url: a.attachment_url,
                attachment_name: a.attachment_name,
                description: a.description || "",
                points: a.total_points || 100
            }));

            setAssignments(formatted);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (a: Assignment) => {
        setEditingAssignment(a);
        setTitle(a.title);
        setDescription((a as any).description);
        setPoints((a as any).points?.toString() || "100");
        setSelectedSubjectId(a.subject_id);
        const d = a.dueDate !== "No Due Date" ? new Date(a.dueDate) : new Date();
        setDateObject(d);
        setDueDate(a.dueDate !== "No Due Date" ? d.toISOString().split('T')[0] : "");
        setShowModal(true);
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setDueDate("");
        setPoints("");
        setSelectedSubjectId("");
        setSelectedFile(null);
        setEditingAssignment(null);
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            if (result.assets && result.assets.length > 0) {
                setSelectedFile(result.assets[0]);
            }
        } catch (err) {
            console.error("Error picking document:", err);
            Alert.alert("Error", "Failed to pick document");
        }
    };

    const saveAssignment = async () => {
        if (!teacherId || uploading) return;
        if (!title || !selectedSubjectId) {
            Alert.alert("Missing Fields", "Please fill in title and select a Subject.");
            return;
        }

        setUploading(true);
        let attachmentUrl = editingAssignment?.attachment_url || null;
        let attachmentName = editingAssignment?.attachment_name || null;

        try {
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const filePath = `${teacherId}/${Date.now()}.${fileExt}`;
                const fileBody = await fetch(selectedFile.uri).then(res => res.blob());
                const { error: uploadError } = await supabase.storage
                    .from('course_materials')
                    .upload(filePath, fileBody);
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage
                    .from('course_materials')
                    .getPublicUrl(filePath);
                attachmentUrl = urlData.publicUrl;
                attachmentName = selectedFile.name;
            }

            if (editingAssignment) {
                const { error } = await supabase.from('assignments')
                    .update({
                        subject_id: selectedSubjectId,
                        title,
                        description,
                        due_date: dueDate ? new Date(dueDate).toISOString() : null,
                        total_points: parseInt(points) || 100,
                        attachment_url: attachmentUrl,
                        attachment_name: attachmentName
                    })
                    .eq('id', editingAssignment.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('assignments').insert({
                    teacher_id: teacherId,
                    subject_id: selectedSubjectId,
                    title,
                    description,
                    due_date: dueDate ? new Date(dueDate).toISOString() : null,
                    total_points: parseInt(points) || 100,
                    status: 'active',
                    attachment_url: attachmentUrl,
                    attachment_name: attachmentName
                });
                if (error) throw error;
            }

            setShowModal(false);
            fetchAssignments();
            resetForm();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to save assignment");
        } finally {
            setUploading(false);
        }
    };

    const filteredAssignments = filter === "all"
        ? assignments
        : assignments.filter(a => a.status === filter);

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Management"
                subtitle="Assignments"
                role="Teacher"
                onBack={() => router.back()}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <View>
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                {assignments.length} total assignments
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="flex-row items-center bg-[#FF6900] px-5 py-2.5 rounded-2xl shadow-lg active:bg-orange-600"
                            onPress={() => setShowModal(true)}
                        >
                            <Plus size={18} color="white" />
                            <Text className="text-white font-bold text-xs ml-2 uppercase tracking-widest">New</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats */}
                    <View className="flex-row gap-4 mb-8">
                        <View className="flex-1 bg-gray-900 dark:bg-[#1a1a1a] p-5 rounded-[32px] shadow-xl border border-transparent dark:border-gray-800">
                            <Text className="text-white/60 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">Active</Text>
                            <Text className="text-white text-3xl font-bold mt-2">
                                {assignments.filter(a => a.status === "active").length}
                            </Text>
                        </View>
                        <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">Submissions</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-bold mt-2">
                                {assignments.reduce((acc, a) => acc + a.submissions, 0)}
                            </Text>
                        </View>
                    </View>

                    {/* Filter Tabs */}
                    <View className="flex-row bg-white dark:bg-[#1a1a1a] rounded-2xl p-1.5 mb-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                        {(["all", "active", "draft", "closed"] as const).map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                className={`flex-1 py-3 rounded-xl ${filter === tab ? "bg-[#FF6900] shadow-sm" : ""}`}
                                onPress={() => setFilter(tab)}
                            >
                                <Text className={`text-center font-bold text-[10px] uppercase tracking-widest ${filter === tab ? "text-white" : "text-gray-400 dark:text-gray-500"}`}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Assignment List */}
                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : filteredAssignments.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <FileText size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No assignments found</Text>
                        </View>
                    ) : (
                        filteredAssignments.map((assignment) => (
                            <AssignmentCard
                                key={assignment.id}
                                assignment={assignment}
                                onEdit={handleEdit}
                                onView={(a) => router.push({ pathname: "/(teacher)/management/submissions", params: { assignmentId: a.id } } as any)}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Create/Edit Assignment Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white dark:bg-[#121212] rounded-t-[40px] p-8 h-[85%] border-t border-gray-100 dark:border-gray-800">
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View className="flex-row justify-between items-center mb-10">
                                <Text className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    {editingAssignment ? "Edit" : "Create"}
                                </Text>
                                <TouchableOpacity
                                    className="w-10 h-10 bg-gray-50 dark:bg-[#1a1a1a] rounded-full items-center justify-center"
                                    onPress={() => { setShowModal(false); resetForm(); }}
                                >
                                    <X size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Subject</Text>
                                <ScrollView horizontal className="flex-row" showsHorizontalScrollIndicator={false}>
                                    {Subjects.map(c => (
                                        <TouchableOpacity
                                            key={c.id}
                                            onPress={() => setSelectedSubjectId(c.id)}
                                            className={`mr-3 px-6 py-3 rounded-2xl border ${selectedSubjectId === c.id ? 'bg-[#FF6900] border-[#FF6900] shadow-sm' : 'bg-gray-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800'}`}
                                        >
                                            <Text className={`font-bold text-xs ${selectedSubjectId === c.id ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{c.title}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Title</Text>
                                <TextInput
                                    className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                    placeholder="Assignment Title"
                                    placeholderTextColor="#9CA3AF"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Description</Text>
                                <TextInput
                                    className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-medium border border-gray-100 dark:border-gray-800 h-32"
                                    placeholder="What should the students do?"
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    textAlignVertical="top"
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>

                            <View className="flex-row gap-4 mb-8">
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Due Date</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(true)}
                                        className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 flex-row justify-between items-center border border-gray-100 dark:border-gray-800"
                                    >
                                        <Text className={`font-bold ${dueDate ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                                            {dueDate ? dueDate : "Select date"}
                                        </Text>
                                        <Calendar size={18} color="#FF6900" />
                                    </TouchableOpacity>
                                </View>

                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Points</Text>
                                    <TextInput
                                        className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                        placeholder="100"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        value={points}
                                        onChangeText={setPoints}
                                    />
                                </View>
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={dateObject}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                    minimumDate={new Date()}
                                />
                            )}

                            <View className="mb-10">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Attachments</Text>
                                <TouchableOpacity
                                    onPress={pickDocument}
                                    className={`flex-row items-center justify-center border-dashed border-2 rounded-[32px] p-8 ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a]'}`}
                                >
                                    {selectedFile ? (
                                        <View className="items-center">
                                            <FileText size={32} color="#10B981" />
                                            <Text className="text-green-900 dark:text-green-400 font-bold mt-3 text-center px-4">{selectedFile.name}</Text>
                                            <Text className="text-green-600 dark:text-green-400/60 text-[10px] font-bold uppercase tracking-widest mt-1">Tap to change</Text>
                                        </View>
                                    ) : (
                                        <View className="items-center">
                                            <Upload size={32} color="#D1D5DB" />
                                            <Text className="text-gray-500 dark:text-gray-400 font-bold mt-3">Upload Material</Text>
                                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">PDF, DOCX, Images</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                className={`bg-[#FF6900] py-5 rounded-2xl items-center shadow-lg active:bg-orange-600 ${uploading ? 'opacity-70' : ''}`}
                                onPress={saveAssignment}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">
                                        {editingAssignment ? "Update Assignment" : "Publish Assignment"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
