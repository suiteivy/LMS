import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { router } from "expo-router";
import { SubjectAPI } from "@/services/SubjectService";

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
    return (
        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-3 flex-row items-center">
            <View className="w-10 h-10 rounded-xl bg-[#EAEEF2] dark:bg-[#1C2128] items-center justify-center mr-3">
                <Text className="text-gray-900 dark:text-white font-black text-base">
                    {(student.student_name || "U").charAt(0)}
                </Text>
            </View>

            {/* Info */}
            <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-bold text-base">{student.student_name}</Text>
                {student.student_display_id && (
                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">ID: {student.student_display_id}</Text>
                )}
                <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5" numberOfLines={1}>
                    {student.assignment_title}{' \u2022 '}{student.Subject_title}
                </Text>
            </View>

            {/* Score */}
            <View className="items-end mr-4">
                <View className="flex-row items-baseline">
                    <Text className="text-gray-900 dark:text-white font-black text-lg">{student.score !== null ? student.score : "--"}</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold">/{student.maxScore}</Text>
                </View>
                <Text className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${student.status === 'graded' ? 'text-green-600' : 'text-[#FF6900]'}`}>
                    {student.status || 'pending'}
                </Text>
            </View>

            {/* Grade Button */}
            <TouchableOpacity
                activeOpacity={0.7}
                className={`w-10 h-10 rounded-xl items-center justify-center ${student.status === "graded" ? "bg-[#EAEEF2] dark:bg-[#1C2128]" : "bg-[#FF6900]"}`}
                onPress={() => onGrade(student)}
            >
                {student.status === "graded" ? (
                    <Check size={18} color="#9CA3AF" />
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
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("All Assignments");
    const [isPublished, setIsPublished] = useState(true);
    const [updatingVisibility, setUpdatingVisibility] = useState(false);

    useEffect(() => {
        if (teacherId) {
            fetchSubjects();
        }
    }, [teacherId]);

    useEffect(() => {
        if (teacherId) {
            fetchSubmissions();
            if (selectedSubject !== "All Subjects") {
                fetchAssignmentsForSubject();
            } else {
                setAssignments([]);
                setSelectedAssignmentId("All Assignments");
            }
        }
    }, [teacherId, selectedSubject, selectedAssignmentId]);

    const fetchSubjects = async () => {
        if (!teacherId) return;
        try {
            const data = await SubjectAPI.getFilteredSubjects();
            if (data) setSubjects(data.map(s => ({ id: s.id, title: s.title })));
        } catch (error) {
            console.error("Error fetching filtered subjects in grades:", error);
            setSubjects([]);
        }
    };

    const fetchAssignmentsForSubject = async () => {
        const subject = subjects.find(s => s.title === selectedSubject);
        if (!subject) return;

        const { data } = (await supabase
            .from('assignments')
            .select('id, title, is_published')
            .eq('subject_id', subject.id)) as any;

        if (data) {
            setAssignments(data);
            if (selectedAssignmentId !== "All Assignments") {
                const current = (data as any[]).find(a => a.id === selectedAssignmentId);
                if (current) setIsPublished(current.is_published);
            }
        }
    };

    const fetchSubmissions = async () => {
        if (!teacherId) return;

        try {
            setLoading(true);
            const dataSubjects = await SubjectAPI.getFilteredSubjects();
            const assignedSubjectIds = (dataSubjects || []).map(s => s.id);
            
            if (assignedSubjectIds.length === 0) {
                setSubmissions([]);
                setLoading(false);
                return;
            }

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
                        subject_id,
                        subject:subjects!inner(
                            id,
                            title
                        )
                    )
                `)
                .in('assignment.subject_id', assignedSubjectIds);

            if (selectedSubject !== "All Subjects") {
                query = query.eq('assignment.subject.title', selectedSubject);
            }

            if (selectedAssignmentId !== "All Assignments") {
                query = query.eq('assignment_id', selectedAssignmentId);
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
            const { error } = await (supabase
                .from('submissions') as any)
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

    const togglePublication = async () => {
        if (selectedAssignmentId === "All Assignments") return;

        try {
            setUpdatingVisibility(true);
            const { error } = await (supabase
                .from('assignments') as any)
                .update({ is_published: !isPublished })
                .eq('id', selectedAssignmentId);

            if (error) throw error;
            setIsPublished(!isPublished);
            Alert.alert("Success", `Assignment grades are now ${!isPublished ? "visible" : "hidden"} to students.`);
        } catch (error) {
            console.error("Error updating visibility:", error);
            Alert.alert("Error", "Failed to update visibility");
        } finally {
            setUpdatingVisibility(false);
        }
    };

    const filteredStudents = submissions.filter(s =>
        s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.assignment_title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingCount = submissions.filter(s => s.status !== "graded").length;

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117]">
            <UnifiedHeader
                title="Management"
                subtitle="Grade Book"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
            >
                <View className="px-5 pt-4">
                    {/* Inline Stats */}
                    <View className="flex-row justify-between items-center mb-6">
                        <View className="flex-row gap-8">
                            <View>
                                <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Graded</Text>
                                <Text className="text-gray-900 dark:text-white text-3xl font-black">
                                    {submissions.filter(s => s.status === "graded").length}
                                </Text>
                            </View>
                            <View>
                                <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-1">Pending</Text>
                                <Text className="text-gray-900 dark:text-white text-3xl font-black">
                                    {pendingCount}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity activeOpacity={0.7} className="p-3 bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl border border-[#D0D7DE] dark:border-[#21262D]">
                            <Download size={20} color="#FF6900" />
                        </TouchableOpacity>
                    </View>

                    {/* Subject Filter */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-5 px-5">
                        <TouchableOpacity
                            className={`mr-6 pb-2 border-b-2 ${selectedSubject === "All Subjects" ? "border-[#FF6900]" : "border-transparent"}`}
                            onPress={() => setSelectedSubject("All Subjects")}
                            activeOpacity={0.7}
                        >
                            <Text className={`font-bold ${selectedSubject === "All Subjects" ? "text-[#FF6900]" : "text-gray-500 dark:text-gray-400"}`}>All Subjects</Text>
                        </TouchableOpacity>
                        {subjects.map((sub) => (
                            <TouchableOpacity
                                key={sub.id}
                                className={`mr-6 pb-2 border-b-2 ${selectedSubject === sub.title ? "border-[#FF6900]" : "border-transparent"}`}
                                onPress={() => {
                                    setSelectedSubject(sub.title);
                                    setSelectedAssignmentId("All Assignments");
                                }}
                                activeOpacity={0.7}
                            >
                                <Text className={`font-bold ${selectedSubject === sub.title ? "text-[#FF6900]" : "text-gray-500 dark:text-gray-400"}`}>{sub.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Assignment Filter & Toggle */}
                    {selectedSubject !== "All Subjects" && assignments.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest mb-3">Select Assignment</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-5 px-5">
                                <TouchableOpacity
                                    className={`mr-6 pb-2 border-b-2 ${selectedAssignmentId === "All Assignments" ? "border-[#FF6900]" : "border-transparent"}`}
                                    onPress={() => setSelectedAssignmentId("All Assignments")}
                                    activeOpacity={0.7}
                                >
                                    <Text className={`font-bold ${selectedAssignmentId === "All Assignments" ? "text-[#FF6900]" : "text-gray-500 dark:text-gray-400"}`}>All</Text>
                                </TouchableOpacity>
                                {assignments.map((asgn) => (
                                    <TouchableOpacity
                                        key={asgn.id}
                                        className={`mr-6 pb-2 border-b-2 ${selectedAssignmentId === asgn.id ? "border-[#FF6900]" : "border-transparent"}`}
                                        onPress={() => {
                                            setSelectedAssignmentId(asgn.id);
                                            setIsPublished(asgn.is_published);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text className={`font-bold ${selectedAssignmentId === asgn.id ? "text-[#FF6900]" : "text-gray-500 dark:text-gray-400"}`}>{asgn.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {selectedAssignmentId !== "All Assignments" && (
                                <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] flex-row justify-between items-center">
                                    <View>
                                        <Text className="text-gray-900 dark:text-white font-bold text-sm">Student Visibility</Text>
                                        <Text className="text-gray-500 dark:text-gray-400 text-xs">Students can see their marks</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={togglePublication}
                                        disabled={updatingVisibility}
                                        activeOpacity={0.7}
                                        className={`px-4 py-2 rounded-lg border ${isPublished ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : "bg-[#F6F8FA] dark:bg-[#1C2128] border-[#D0D7DE] dark:border-[#21262D]"}`}
                                    >
                                        {updatingVisibility ? (
                                            <ActivityIndicator size="small" color={isPublished ? "#059669" : "#FF6900"} />
                                        ) : (
                                            <Text className={`font-bold text-xs uppercase tracking-widest ${isPublished ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                                                {isPublished ? "Published" : "Hidden"}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Search */}
                    <View className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl px-4 py-3 mb-6 border border-[#D0D7DE] dark:border-[#21262D]">
                        <Search size={18} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-3 text-gray-900 dark:text-white font-medium"
                            placeholder="Search students or assignments..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Grade List */}
                    <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">All Submissions</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : filteredStudents.length === 0 ? (
                        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-8 rounded-xl items-center border border-[#D0D7DE] dark:border-[#21262D]">
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">No submissions found</Text>
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
                <View className="flex-1 bg-black/70 justify-end">
                    <View className="bg-[#FFFFFF] dark:bg-[#0D1117] rounded-t-3xl p-6 pb-12 border-t border-[#D0D7DE] dark:border-[#21262D]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900 dark:text-white">Grade Submission</Text>
                            <TouchableOpacity
                                className="w-10 h-10 bg-[#F6F8FA] dark:bg-[#1C2128] rounded-xl items-center justify-center border border-[#D0D7DE] dark:border-[#21262D]"
                                onPress={() => setGradingModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-6 bg-[#F6F8FA] dark:bg-[#161B22] p-5 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]">
                            <View className="mb-4">
                                <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Student</Text>
                                <Text className="text-gray-900 dark:text-white font-bold text-base">{currentSubmission?.student_name}</Text>
                            </View>

                            <View>
                                <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Assignment</Text>
                                <Text className="text-gray-900 dark:text-white font-bold text-base">{currentSubmission?.assignment_title}</Text>
                            </View>
                        </View>

                        <View className="mb-5">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Score (Max: {currentSubmission?.maxScore})</Text>
                            <TextInput
                                className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl px-5 py-4 text-gray-900 dark:text-white font-bold text-lg border border-[#D0D7DE] dark:border-[#21262D]"
                                placeholder="0.0"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                value={gradeInput.toString()}
                                onChangeText={setGradeInput}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Feedback</Text>
                            <TextInput
                                className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl px-5 py-4 text-gray-900 dark:text-white h-28 border border-[#D0D7DE] dark:border-[#21262D]"
                                placeholder="Add comments here..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                textAlignVertical="top"
                                value={feedbackInput}
                                onChangeText={setFeedbackInput}
                            />
                        </View>

                        <TouchableOpacity
                            className="bg-[#FF6900] py-4 rounded-xl items-center"
                            onPress={submitGrade}
                            activeOpacity={0.7}
                        >
                            <Text className="text-white font-bold text-lg">Save Grade</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
