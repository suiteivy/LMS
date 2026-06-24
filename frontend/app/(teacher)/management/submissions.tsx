import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/libs/supabase";
import { Database } from "@/types/database";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Edit2, FileText, User, X } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

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
    grades_released: boolean;
    subject: {
        title: string;
        id: string;
        class_id?: string;
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
    const { isDark } = useTheme();
    const { teacherId, isDemo } = useAuth();
    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState<JoinedAssignment | null>(null);
    const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
    const [gradingModalVisible, setGradingModalVisible] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<SubmissionEntry | null>(null);
    const [gradeInput, setGradeInput] = useState("");
    const [feedbackInput, setFeedbackInput] = useState("");
    const [canGrade, setCanGrade] = useState(false);

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
                .select('*, subject:subjects(title, id, class_id)')
                .eq('id', assignmentId)
                .single();

            if (assignmentError) throw assignmentError;
            const typedAssignment = assignmentData as unknown as JoinedAssignment;
            setAssignment(typedAssignment);

            let isAllowed = false;
            if (teacherId) {
                if (typedAssignment.teacher_id === teacherId) {
                    isAllowed = true;
                } else {
                    const { data: assoc } = await supabase
                        .from('subject_teachers')
                        .select('id')
                        .eq('teacher_id', teacherId)
                        .eq('subject_id', typedAssignment.subject_id)
                        .maybeSingle();
                    if (assoc) isAllowed = true;
                }
            }
            setCanGrade(isAllowed);

            const enrolledStudentMap = new Map<string, JoinedEnrollment>();

            const { data: enrollmentData, error: enrollError } = await supabase
                .from('enrollments')
                .select(`student_id, student:students(id, user:users(full_name))`)
                .eq('subject_id', typedAssignment.subject_id)
                .eq('status', 'enrolled');

            if (enrollError) throw enrollError;

            (enrollmentData as any[] || []).forEach(e => {
                enrolledStudentMap.set(e.student_id, e as unknown as JoinedEnrollment);
            });

            const classId = typedAssignment.subject?.class_id;
            if (classId) {
                const { data: classEnrollmentsData } = await supabase
                    .from('class_enrollments')
                    .select('student_id')
                    .eq('class_id', classId);

                const newStudentIds = (classEnrollmentsData as any[] || [])
                    .map((ce: any) => ce.student_id)
                    .filter((sid: string) => !enrolledStudentMap.has(sid));

                if (newStudentIds.length > 0) {
                    const { data: newStudents } = await supabase
                        .from('students')
                        .select('id, user:users(full_name)')
                        .in('id', newStudentIds);

                    (newStudents as any[] || []).forEach((s: any) => {
                        enrolledStudentMap.set(s.id, {
                            student_id: s.id,
                            student: s
                        } as unknown as JoinedEnrollment);
                    });
                }
            }

            const { data: submissionData, error: subError } = await supabase
                .from('submissions')
                .select('*')
                .eq('assignment_id', assignmentId);

            if (subError) throw subError;

            const typedEnrollments = [...enrolledStudentMap.values()];
            const typedSubmissions = (submissionData || []) as TypedSubmission[];

            const enrollmentMap = new Map<string, JoinedEnrollment>();
            typedEnrollments.forEach(enroll => {
                enrollmentMap.set(enroll.student_id, enroll);
            });

            const allStudentIds = new Set<string>();
            typedEnrollments.forEach(e => allStudentIds.add(e.student_id));
            typedSubmissions.forEach(s => allStudentIds.add(s.student_id));

            const merged: SubmissionEntry[] = [...allStudentIds].map(studentId => {
                const enroll = enrollmentMap.get(studentId);
                const sub = typedSubmissions.find(s => s.student_id === studentId);

                let status: SubmissionEntry['status'];
                if (sub) {
                    status = (sub.status as SubmissionEntry['status']) || 'submitted';
                } else {
                    status = 'missing';
                }

                return {
                    id: sub?.id || null,
                    student_id: studentId,
                    student_name: enroll?.student?.user?.full_name || sub?.student_id || "Unknown Student",
                    status,
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

    const toggleGradesReleased = async () => {
        if (!assignment) return;
        const newStatus = !assignment.grades_released;
        try {
            const { error } = await (supabase
                .from('assignments') as any)
                .update({ grades_released: newStatus })
                .eq('id', assignment.id);

            if (error) throw error;

            setAssignment(prev => prev ? { ...prev, grades_released: newStatus } : null);
            Alert.alert(
                "Success",
                newStatus
                    ? "Grades have been released and are now visible to parents and students."
                    : "Grades have been hidden from student and parent diaries."
            );
        } catch (error) {
            console.error("Error toggling grade release:", error);
            Alert.alert("Error", "Failed to update grade release status");
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
        if (!currentEntry) return;
        const score = parseFloat(gradeInput);
        if (isNaN(score) || score > (assignment?.total_points || 100)) {
            Alert.alert("Invalid Score", `Max points: ${assignment?.total_points || 100}`);
            return;
        }

        if (isDemo) {
            setSubmissions(prev => prev.map(s =>
                s.student_id === currentEntry.student_id
                    ? { ...s, score: score, feedback: feedbackInput, status: 'graded' }
                    : s
            ));
            setGradingModalVisible(false);
            Toast.show({
                type: 'success',
                text1: 'Done',
                text2: 'Changes saved.'
            });
            return;
        }

        if (!currentEntry.id) return;

        try {
            const { error } = await (supabase as any)
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

    const pendingCount = submissions.filter(s => s.status === 'missing').length;
    const submittedCount = submissions.filter(s => s.status === 'submitted' || s.status === 'late').length;
    const reviewedCount = submissions.filter(s => s.status === 'graded').length;

    return (
        <View className={`flex-1 ${isDark ? 'bg-[#0F0B2E]' : 'bg-gray-50'}`}>
            <UnifiedHeader
                title="Review"
                subtitle="Submissions"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FF6900" />
                </View>
            ) : (
                // Specific assignment view
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View className="p-4 md:p-8">
                        <View className="bg-gray-900 p-8 rounded-[40px] mb-8 shadow-xl">
                            <View className="flex-row justify-between items-start mb-2">
                                <Text className="text-white/60 text-[10px] font-bold uppercase tracking-[3px] mt-1">{assignment?.subject?.title}</Text>
                                <View className={`px-3 py-1 rounded-full border ${assignment?.grades_released ? 'bg-green-950/40 border-green-800' : 'bg-gray-800 border-gray-700'}`}>
                                    <Text className={`text-[9px] font-extrabold uppercase tracking-widest ${assignment?.grades_released ? 'text-green-400' : 'text-gray-400'}`}>
                                        Grades: {assignment?.grades_released ? "Released" : "Hidden"}
                                    </Text>
                                </View>
                            </View>

                            <Text className="text-white text-2xl font-bold tracking-tight mb-6">{assignment?.title}</Text>

                            <View className="flex-row justify-between items-center">
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

                                <TouchableOpacity
                                    onPress={toggleGradesReleased}
                                    className={`px-4 py-2.5 rounded-2xl ${assignment?.grades_released ? 'bg-gray-800' : 'bg-[#FF6900]'}`}
                                >
                                    <Text className="text-white text-xs font-bold">
                                        {assignment?.grades_released ? "Hide Grades" : "Release Grades"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-6 px-2 tracking-tight`}>Student Submissions</Text>

                        {submissions.map((entry) => (
                            <View key={entry.student_id} className={`${isDark ? 'bg-[#13103A] border-white/10' : 'bg-white border-gray-100'} p-5 rounded-3xl border mb-4 flex-row items-center shadow-sm`}>
                                <View className="w-12 h-12 rounded-2xl bg-orange-100 items-center justify-center mr-4">
                                    <Text className="text-[#FF6900] font-bold text-xl">{entry.student_name.charAt(0)}</Text>
                                </View>

                                <View className="flex-1">
                                    <Text className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-base`}>{entry.student_name}</Text>
                                    <View className="flex-row items-center mt-1.5">
                                        <StatusBadge status={entry.status} />
                                        {entry.submittedAt && (
                                            <Text className={`${isDark ? 'text-gray-300' : 'text-gray-400'} text-[10px] font-bold ml-3 uppercase tracking-wider`}>{entry.submittedAt}</Text>
                                        )}
                                    </View>
                                </View>

                                <View className="items-end mr-4">
                                    <View className="flex-row items-baseline">
                                        <Text className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-lg`}>{entry.score !== null ? entry.score : "--"}</Text>
                                        <Text className={`${isDark ? 'text-gray-300' : 'text-gray-400'} text-xs font-bold`}>/{assignment?.total_points}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    className={`w-10 h-10 rounded-xl items-center justify-center ${entry.status === "missing" ? "bg-gray-100" : "bg-[#FF6900] active:bg-orange-600"}`}
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

            <Modal visible={gradingModalVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className={`${isDark ? 'bg-[#13103A]' : 'bg-white'} rounded-t-[40px] p-8 pb-12`}>
                        <View className="flex-row justify-between items-center mb-8">
                            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>Review Work</Text>
                            <TouchableOpacity
                                className={`${isDark ? 'bg-white/10' : 'bg-gray-50'} w-10 h-10 rounded-full items-center justify-center`}
                                onPress={() => setGradingModalVisible(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className={`${isDark ? 'bg-white/10 border-white/10' : 'bg-gray-50 border-gray-100'} mb-6 p-6 rounded-3xl border`}>
                            <View className="mb-4">
                                <Text className={`${isDark ? 'text-gray-300' : 'text-gray-400'} text-[10px] font-bold uppercase tracking-wider mb-1`}>Student</Text>
                                <Text className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-lg`}>{currentEntry?.student_name}</Text>
                            </View>
                            <View>
                                <Text className={`${isDark ? 'text-gray-200' : 'text-gray-500'} text-sm font-bold mb-2 ml-2`}>Grade (Max: {assignment?.total_points})</Text>
                                <TextInput
                                    className={`rounded-2xl px-6 py-4 ${isDark ? 'text-white border-white/10' : 'text-gray-900 border-gray-100'} font-bold text-lg border ${canGrade ? (isDark ? 'bg-white/10' : 'bg-gray-50') : 'bg-gray-100'}`}
                                    placeholder="0.0"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    keyboardType="numeric"
                                    value={gradeInput}
                                    onChangeText={canGrade ? setGradeInput : undefined}
                                    editable={canGrade}
                                />
                            </View>
                            {!canGrade && (
                                <Text className="text-gray-400 text-xs mt-1 ml-2">Read-only — only the subject teacher can grade</Text>
                            )}
                        </View>

                        <View className="mb-8">
                            <Text className={`${isDark ? 'text-gray-200' : 'text-gray-500'} text-sm font-bold mb-2 ml-2`}>Feedback</Text>
                            <TextInput
                                className={`rounded-2xl px-6 py-4 ${isDark ? 'text-white border-white/10' : 'text-gray-900 border-gray-100'} h-32 border ${canGrade ? (isDark ? 'bg-white/10' : 'bg-gray-50') : 'bg-gray-100'}`}
                                placeholder="Write feedback here..."
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                multiline
                                textAlignVertical="top"
                                value={feedbackInput}
                                onChangeText={canGrade ? setFeedbackInput : undefined}
                                editable={canGrade}
                            />
                        </View>

                        {canGrade && (
                            <TouchableOpacity
                                className="bg-[#FF6900] py-5 rounded-2xl items-center shadow-lg active:bg-orange-600"
                                onPress={submitGrade}
                            >
                                <Text className="text-white font-bold text-lg">Submit Review</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
