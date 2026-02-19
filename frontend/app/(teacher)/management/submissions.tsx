import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { ArrowLeft, Search, Filter, Download, Edit2, ChevronDown, Check, X, FileText, User } from 'lucide-react-native';
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/types/database";

type TypedSubmission = Database['public']['Tables']['submissions']['Row'];

interface SubmissionEntry {
    id: string | null; // null if not submitted
    student_id: string;
    student_name: string;
    status: "graded" | "pending" | "submitted" | "late" | "missing";
    score: number | null;
    submittedAt: string | null;
    feedback?: string | null;
}

interface JoinedAssignment {
    id: string;
    subject_id: string;
    teacher_id: string;
    title: string;
    total_points: number;
    subject: {
        title: string;
        id: string;
    } | null;
}

interface JoinedEnrollment {
    student_id: string;
    student: {
        id: string;
        user: {
            full_name: string;
        } | null;
    } | null;
}

export default function SubmissionsPage() {
    const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
    const { teacherId } = useAuth();

    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState<JoinedAssignment | null>(null);
    const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
    const [gradingModalVisible, setGradingModalVisible] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<SubmissionEntry | null>(null);
    const [gradeInput, setGradeInput] = useState("");
    const [feedbackInput, setFeedbackInput] = useState("");

    useEffect(() => {
        if (assignmentId) {
            fetchData();
        }
    }, [assignmentId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Assignment Details
            const { data: assignmentData, error: assignmentError } = await supabase
                .from('assignments')
                .select('*, subject:subjects(title, id)')
                .eq('id', assignmentId)
                .single();

            if (assignmentError) throw assignmentError;
            const typedAssignment = assignmentData as unknown as JoinedAssignment;
            setAssignment(typedAssignment);

            // 2. Fetch all students enrolled in this subject
            const { data: enrollmentData, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    student_id,
                    student:students(
                        id,
                        user:users(full_name)
                    )
                `)
                .eq('subject_id', typedAssignment.subject_id)
                .eq('status', 'enrolled');

            if (enrollError) throw enrollError;

            // 3. Fetch all submissions for this assignment
            const { data: submissionData, error: subError } = await supabase
                .from('submissions')
                .select('*')
                .eq('assignment_id', assignmentId);

            if (subError) throw subError;

            // 4. Merge
            const typedEnrollments = (enrollmentData || []) as unknown as JoinedEnrollment[];
            const typedSubmissions = (submissionData || []) as TypedSubmission[];

            const merged: SubmissionEntry[] = typedEnrollments.map(enroll => {
                const sub = typedSubmissions.find(s => s.student_id === enroll.student_id);
                return {
                    id: sub?.id || null,
                    student_id: enroll.student_id,
                    student_name: enroll.student?.user?.full_name || "Unknown Student",
                    status: (sub?.status as any) || (sub ? 'submitted' : 'missing'),
                    score: sub?.grade || null,
                    submittedAt: sub?.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : null,
                    feedback: sub?.feedback
                };
            });

            setSubmissions(merged);
        } catch (error) {
            console.error("Error fetching submissions:", error);
            Alert.alert("Error", "Failed to load submissions");
        } finally {
            setLoading(false);
        }
    };

    const handleGradeClick = (entry: SubmissionEntry) => {
        if (entry.status === 'missing') {
            Alert.alert("No Submission", "This student hasn't submitted the assignment yet.");
            return;
        }
        setCurrentEntry(entry);
        setGradeInput(entry.score?.toString() || "");
        setFeedbackInput(entry.feedback || "");
        setGradingModalVisible(true);
    };

    const submitGrade = async () => {
        if (!currentEntry || !currentEntry.id) return;

        const score = parseFloat(gradeInput);
        if (isNaN(score)) {
            Alert.alert("Invalid Score", "Please enter a valid number");
            return;
        }

        if (score > (assignment?.total_points || 100)) {
            Alert.alert("Invalid Score", `Score cannot be higher than ${assignment?.total_points || 100}`);
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
                .eq('id', currentEntry.id);

            if (error) throw error;

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s.id === currentEntry.id
                    ? { ...s, score: score, feedback: feedbackInput, status: 'graded' }
                    : s
            ));

            setGradingModalVisible(false);
            setCurrentEntry(null);
        } catch (error) {
            console.error("Error updating grade:", error);
            Alert.alert("Error", "Failed to save grade");
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: any = {
            graded: "bg-green-50 text-green-600 border-green-100",
            submitted: "bg-blue-50 text-blue-600 border-blue-100",
            pending: "bg-yellow-50 text-yellow-600 border-yellow-100",
            late: "bg-red-50 text-red-600 border-red-100",
            missing: "bg-gray-50 text-gray-400 border-gray-200"
        };
        const style = colors[status] || colors.missing;
        return (
            <View className={`px-2 py-0.5 rounded-full border ${style.split(' ')[0]} ${style.split(' ')[2]}`}>
                <Text className={`text-[10px] font-bold ${style.split(' ')[1]}`}>
                    {status.toUpperCase()}
                </Text>
            </View>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="bg-white px-4 pt-4 pb-6 border-b border-gray-100">
                <TouchableOpacity className="mb-4 p-2 -ml-2" onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-gray-400 text-xs font-bold uppercase mb-1">{assignment?.subject?.title}</Text>
                <Text className="text-2xl font-bold text-gray-900">{assignment?.title}</Text>
                <View className="flex-row items-center mt-2">
                    <View className="flex-row items-center mr-4">
                        <FileText size={14} color="#6B7280" />
                        <Text className="text-gray-500 text-xs ml-1">Max Score: {assignment?.total_points}</Text>
                    </View>
                    <View className="flex-row items-center">
                        <User size={14} color="#6B7280" />
                        <Text className="text-gray-500 text-xs ml-1">{submissions.length} Students</Text>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 p-4">
                <Text className="text-lg font-bold text-gray-900 mb-4">Student Submissions</Text>

                {submissions.map((entry) => (
                    <View key={entry.student_id} className="bg-white p-4 rounded-2xl border border-gray-100 mb-2 flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                            <Text className="text-teacherOrange font-bold">{entry.student_name.charAt(0)}</Text>
                        </View>

                        <View className="flex-1">
                            <Text className="text-gray-900 font-semibold">{entry.student_name}</Text>
                            <View className="flex-row items-center mt-1">
                                <StatusBadge status={entry.status} />
                                {entry.submittedAt && (
                                    <Text className="text-gray-400 text-[10px] ml-2">Sub: {entry.submittedAt}</Text>
                                )}
                            </View>
                        </View>

                        <View className="items-end mr-3">
                            {entry.score !== null ? (
                                <Text className="text-gray-900 font-bold">{entry.score}/{assignment?.total_points}</Text>
                            ) : (
                                <Text className="text-gray-400 text-sm">--/{assignment?.total_points}</Text>
                            )}
                        </View>

                        <TouchableOpacity
                            className={`p-2 rounded-lg ${entry.status === "missing" ? "bg-gray-100" : "bg-teacherOrange"}`}
                            onPress={() => handleGradeClick(entry)}
                            disabled={entry.status === 'missing'}
                        >
                            {entry.status === "graded" ? (
                                <Check size={18} color="white" />
                            ) : (
                                <Edit2 size={18} color={entry.status === "missing" ? "#D1D5DB" : "white"} />
                            )}
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>

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
                            <Text className="text-gray-900 font-semibold">{currentEntry?.student_name}</Text>
                        </View>

                        <View className="mb-4">
                            <Text className="text-gray-500 text-sm mb-1">Score (Max: {assignment?.total_points})</Text>
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
                            className="bg-teacherOrange py-4 rounded-xl items-center"
                            onPress={submitGrade}
                        >
                            <Text className="text-white font-bold text-base">Save Grade</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
