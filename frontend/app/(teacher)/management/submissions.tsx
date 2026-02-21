import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { Database } from "@/types/database";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Edit2, FileText, User, X } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

type TypedSubmission = Database['public']['Tables']['submissions']['Row'];

interface SubmissionEntry {
    id: string | null;
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
            const { data: assignmentData, error: assignmentError } = await supabase
                .from('assignments')
                .select('*, subject:subjects(title, id)')
                .eq('id', assignmentId)
                .single();

            if (assignmentError) throw assignmentError;
            const typedAssignment = assignmentData as unknown as JoinedAssignment;
            setAssignment(typedAssignment);

            const { data: enrollmentData, error: enrollError } = await supabase
                .from('enrollments')
                .select(`student_id, student:students(id, user:users(full_name))`)
                .eq('subject_id', typedAssignment.subject_id)
                .eq('status', 'enrolled');

            if (enrollError) throw enrollError;

            const { data: submissionData, error: subError } = await supabase
                .from('submissions')
                .select('*')
                .eq('assignment_id', assignmentId);

            if (subError) throw subError;

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
        if (isNaN(score) || score > (assignment?.total_points || 100)) {
            Alert.alert("Invalid Score", `Max points: ${assignment?.total_points || 100}`);
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

            setSubmissions(prev => prev.map(s =>
                s.id === currentEntry.id
                    ? { ...s, score: score, feedback: feedbackInput, status: 'graded' }
                    : s
            ));
            setGradingModalVisible(false);
        } catch (error) {
            console.error("Error updating grade:", error);
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
                <Text className={`text-[8px] font-bold uppercase tracking-widest ${style.split(' ')[1]}`}>
                    {status}
                </Text>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            <UnifiedHeader
                title="Review"
                subtitle="Submissions"
                role="Teacher"
                onBack={() => router.back()}
            />
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FF6900" />
                </View>
            ) : (
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View className="p-4 md:p-8">
                        {/* Assignment Info Header */}
                        <View className="bg-gray-900 p-8 rounded-[40px] mb-8 shadow-xl">
                            <Text className="text-white/60 text-[10px] font-bold uppercase tracking-[3px] mb-2">{assignment?.subject?.title}</Text>
                            <Text className="text-white text-2xl font-bold tracking-tight mb-6">{assignment?.title}</Text>

                            <View className="flex-row gap-6">
                                <View className="flex-row items-center">
                                    <View className="bg-white/10 p-1.5 rounded-lg mr-2">
                                        <FileText size={14} color="white" />
                                    </View>
                                    <Text className="text-white/80 text-xs font-bold">Max: {assignment?.total_points}</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <View className="bg-white/10 p-1.5 rounded-lg mr-2">
                                        <User size={14} color="white" />
                                    </View>
                                    <Text className="text-white/80 text-xs font-bold">{submissions.length} Students</Text>
                                </View>
                            </View>
                        </View>

                        <Text className="text-xl font-bold text-gray-900 mb-6 px-2 tracking-tight">Student Submissions</Text>

                        {submissions.map((entry) => (
                            <View key={entry.student_id} className="bg-white p-5 rounded-3xl border border-gray-100 mb-4 flex-row items-center shadow-sm">
                                <View className="w-12 h-12 rounded-2xl bg-orange-100 items-center justify-center mr-4">
                                    <Text className="text-[#FF6900] font-bold text-xl">{entry.student_name.charAt(0)}</Text>
                                </View>

                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold text-base">{entry.student_name}</Text>
                                    <View className="flex-row items-center mt-1.5">
                                        <StatusBadge status={entry.status} />
                                        {entry.submittedAt && (
                                            <Text className="text-gray-400 text-[10px] font-bold ml-3 uppercase tracking-wider">{entry.submittedAt}</Text>
                                        )}
                                    </View>
                                </View>

                                <View className="items-end mr-4">
                                    <View className="flex-row items-baseline">
                                        <Text className="text-gray-900 font-bold text-lg">{entry.score !== null ? entry.score : "--"}</Text>
                                        <Text className="text-gray-400 text-xs font-bold">/{assignment?.total_points}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    className={`w-10 h-10 rounded-xl items-center justify-center ${entry.status === "missing" ? "bg-gray-100" : "bg-[#FF6900] shadow-sm active:bg-orange-600"}`}
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
                    </View>
                </ScrollView>
            )}

            {/* Grading Modal */}
            <Modal visible={gradingModalVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-[40px] p-8 pb-12">
                        <View className="flex-row justify-between items-center mb-8">
                            <Text className="text-2xl font-bold text-gray-900 tracking-tight">Review Work</Text>
                            <TouchableOpacity
                                className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center"
                                onPress={() => setGradingModalVisible(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <View className="mb-4">
                                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Student</Text>
                                <Text className="text-gray-900 font-bold text-lg">{currentEntry?.student_name}</Text>
                            </View>
                            <View>
                                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Status</Text>
                                <Text className="text-[#FF6900] font-bold text-base uppercase tracking-widest">{currentEntry?.status}</Text>
                            </View>
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-500 text-sm font-bold mb-2 ml-2">Grade (Max: {assignment?.total_points})</Text>
                            <TextInput
                                className="bg-gray-50 rounded-2xl px-6 py-4 text-gray-900 font-bold text-lg border border-gray-100"
                                placeholder="0.0"
                                keyboardType="numeric"
                                value={gradeInput}
                                onChangeText={setGradeInput}
                            />
                        </View>

                        <View className="mb-8">
                            <Text className="text-gray-500 text-sm font-bold mb-2 ml-2">Feedback</Text>
                            <TextInput
                                className="bg-gray-50 rounded-2xl px-6 py-4 text-gray-900 h-32 border border-gray-100"
                                placeholder="Write feedback here..."
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
                            <Text className="text-white font-bold text-lg">Submit Review</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
