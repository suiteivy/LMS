import { DatePicker } from "@/components/common/DatePicker";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { ExamService } from "@/services/ExamService";
import { GradingAPI } from "@/services/GradingService";
import { SubjectAPI } from "@/services/SubjectService";
import { TeacherService } from "@/services/TeacherService";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { router } from "expo-router";
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Clock,
    FileText,
    Plus,
    X
} from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';

interface Exam {
    id: string;
    title: string;
    subject_title: string;
    date: string;
    max_score: number;
    results_count: number;
    weight: number;
    term: string;
    submission_deadline?: string;
}

export default function ExamsPage() {
    const { teacherId, isDemo, user } = useAuth();
    const tier = useSubscriptionTier();
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'principal' || user?.role === 'head_teacher';
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [hodSubjectIds, setHodSubjectIds] = useState<Set<string>>(new Set());
    const [availableTerms, setAvailableTerms] = useState<string[]>(['Term 1', 'Term 2', 'Term 3']);

    // Form
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [submissionDeadline, setSubmissionDeadline] = useState("");
    const [maxScore, setMaxScore] = useState("100");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [weight, setWeight] = useState("0");
    const [term, setTerm] = useState("Term 1");
    const [creating, setCreating] = useState(false);

    const isHOD = hodSubjectIds.has(selectedSubjectId);
    const canSchedule = isAdmin || isHOD;

    useEffect(() => {
        fetchExams();
        fetchSubjectsAndTerms();
    }, []);

    const fetchSubjectsAndTerms = async () => {
        try {
            const [data, termsData, hodList] = await Promise.all([
                SubjectAPI.getFilteredSubjects().catch(() => []),
                GradingAPI.getTerms().catch(() => []),
                TeacherService.getHODSubjects().catch(() => [])
            ]);

            setSubjects(data || []);
            if (data && data.length > 0) {
                setSelectedSubjectId(data[0].id);
            }

            if (Array.isArray(termsData) && termsData.length > 0) {
                const termNames = termsData.map((t: any) => t.name || `Term ${t.term_number || ''}`.trim());
                setAvailableTerms(termNames);
                if (termNames.length > 0) setTerm(termNames[0]);
            }

            const hodIds = new Set((hodList || []).map((s: any) => s.id));
            setHodSubjectIds(hodIds);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchExams = async () => {
        try {
            setLoading(true);
            const data = await ExamService.getExams();
            setExams(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateExam = async () => {
        if (!canSchedule) {
            Alert.alert("Permission Denied", "Only the Subject Head (HOD) or Administration can schedule exam papers.");
            return;
        }

        if (!title.trim() || !selectedSubjectId || !date.trim()) {
            Alert.alert("Missing Fields", "Please provide exam title, subject, and date.");
            return;
        }

        if (isDemo) {
            const newExam: Exam = {
                id: Math.random().toString(),
                title,
                subject_title: subjects.find(s => s.id === selectedSubjectId)?.title || "Selected Subject",
                date,
                max_score: parseInt(maxScore) || 100,
                results_count: 0,
                weight: parseFloat(weight) || 0,
                term: term || "Term 1",
                submission_deadline: submissionDeadline || undefined
            };
            setExams(prev => [newExam, ...prev]);
            setShowCreateModal(false);
            Toast.show({
                type: 'success',
                text1: 'Done',
                text2: 'Exam scheduled successfully.'
            });
            resetForm();
            return;
        }

        try {
            setCreating(true);
            await ExamService.createExam({
                title,
                description,
                date,
                max_score: parseInt(maxScore) || 100,
                subject_id: selectedSubjectId,
                teacher_id: teacherId,
                weight: parseFloat(weight) || 0,
                term: term || "Term 1",
                submission_deadline: submissionDeadline || null
            });
            setShowCreateModal(false);
            resetForm();
            Toast.show({
                type: 'success',
                text1: 'Exam Created',
                text2: 'Exam assessment created successfully.'
            });
            fetchExams();
        } catch (error: any) {
            const msg = error?.response?.data?.error || "Failed to create exam";
            Alert.alert("Error", msg);
        } finally {
            setCreating(false);
        }
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setDate("");
        setSubmissionDeadline("");
        setMaxScore("100");
        setWeight("0");
        setTerm("");
    };

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Academic"
                subtitle="Exams Module"
                role="Teacher"
                fallbackPath="/(teacher)/management"
                rightActions={
                    <HelpTooltip
                        id="teacher.manage.exams"
                        role="teacher"
                        tier={tier}
                        onLearnMore={(anchor) =>
                            router.push({
                                pathname: "/(teacher)/accessibility/settings" as any,
                                params: { manual: "1", anchor: anchor || "exams-module" },
                            } as any)
                        }
                    />
                }
            />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-1">
                        <View>
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                Formal Assessments
                            </Text>
                            <Text className="text-gray-900 dark:text-white font-bold text-2xl tracking-tight mt-0.5">
                                Scheduled Exams
                            </Text>
                        </View>
                        {canSchedule && (
                            <TouchableOpacity
                                className="flex-row items-center bg-[#FF6900] px-4 py-2.5 rounded-xl shadow-sm active:bg-orange-600"
                                onPress={() => setShowCreateModal(true)}
                            >
                                <Plus size={16} color="white" />
                                <Text className="text-white font-bold text-xs ml-1.5 uppercase tracking-wider">Schedule Exam</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {loading ? (
                        <ListItemSkeleton loading={loading} count={4} label="Loading exams..." />
                    ) : exams.length === 0 ? (
                        <View className="bg-white dark:bg-[#161B22] p-12 rounded-[32px] items-center border border-gray-200 dark:border-gray-800 border-dashed">
                            <FileText size={48} color="#9CA3AF" style={{ opacity: 0.4 }} />
                            <Text className="text-gray-900 dark:text-white font-bold text-base mt-4 tracking-tight">No Exams Scheduled</Text>
                            <Text className="text-gray-400 dark:text-gray-500 text-xs text-center mt-1">
                                Create an exam period to score student performances against institution grading rubrics.
                            </Text>
                        </View>
                    ) : (
                        exams.map((exam) => {
                            const isLocked = exam.submission_deadline ? new Date() > new Date(exam.submission_deadline) : false;

                            return (
                                <View key={exam.id} className="bg-white dark:bg-[#161B22] p-5 rounded-[28px] border border-gray-200 dark:border-gray-800 mb-4 shadow-sm">
                                    <View className="flex-row justify-between items-start mb-3">
                                        <View className="flex-1 mr-2">
                                            <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight leading-tight">{exam.title}</Text>
                                            <Text className="text-[#FF6900] text-xs font-bold mt-0.5 uppercase tracking-wider">{exam.subject_title}</Text>
                                        </View>

                                        {/* Status Badge */}
                                        <View className="flex-row items-center gap-2">
                                            {isLocked ? (
                                                <View className="flex-row items-center bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-900/40">
                                                    <AlertCircle size={11} color="#E11D48" />
                                                    <Text className="text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider ml-1">Locked</Text>
                                                </View>
                                            ) : (
                                                <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/40">
                                                    <CheckCircle2 size={11} color="#059669" />
                                                    <Text className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider ml-1">Open</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Details row */}
                                    <View className="flex-row items-center flex-wrap gap-4 mb-4">
                                        <View className="flex-row items-center">
                                            <Calendar size={13} color="#6B7280" />
                                            <Text className="text-gray-500 dark:text-gray-400 text-xs font-semibold ml-1.5">{exam.date}</Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <Clock size={13} color="#6B7280" />
                                            <Text className="text-gray-500 dark:text-gray-400 text-xs font-semibold ml-1.5">{exam.max_score} Max Points</Text>
                                        </View>
                                        {exam.submission_deadline ? (
                                            <View className="flex-row items-center">
                                                <Text className="text-gray-400 text-[11px] font-medium">
                                                    Deadline: {new Date(exam.submission_deadline).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => router.push({ pathname: "/(teacher)/management/exam-results", params: { examId: exam.id } } as any)}
                                        className="flex-row items-center justify-between bg-gray-900 dark:bg-[#0D1117] p-3.5 rounded-xl active:opacity-80"
                                    >
                                        <Text className="text-white font-bold text-xs ml-1">Record & Manage Student Scores</Text>
                                        <ChevronRight size={16} color="white" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Create Modal */}
            <Modal visible={showCreateModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-[#161B22] rounded-t-[36px] p-6 pb-12 border-t border-gray-200 dark:border-gray-800 max-h-[90%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Schedule Exam Assessment</Text>
                            <TouchableOpacity
                                className="w-9 h-9 bg-gray-100 dark:bg-[#0D1117] rounded-full items-center justify-center"
                                onPress={() => setShowCreateModal(false)}
                            >
                                <X size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-1 mb-2">Select Subject</Text>
                            <ScrollView horizontal className="flex-row mb-4" showsHorizontalScrollIndicator={false}>
                                {subjects.map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        onPress={() => setSelectedSubjectId(s.id)}
                                        className={`mr-2.5 px-4 py-2.5 rounded-xl border ${selectedSubjectId === s.id ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-[#F6F8FA] dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                                    >
                                        <Text className={`font-bold text-xs ${selectedSubjectId === s.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{s.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View className="mb-4">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-1 mb-2">Exam Assessment Title *</Text>
                                <TextInput
                                    className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                    placeholder="e.g. Mid-Term Summative Assessment"
                                    placeholderTextColor="#9CA3AF"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            <View className="mb-4">
                                <DatePicker
                                    label="Exam Date *"
                                    value={date}
                                    onChange={setDate}
                                    placeholder="Select exam date"
                                />
                            </View>

                            <View className="mb-4">
                                <DatePicker
                                    label="Submission Deadline"
                                    value={submissionDeadline}
                                    onChange={setSubmissionDeadline}
                                    placeholder="Select submission deadline"
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-1 mb-2">Max Score (Points)</Text>
                                <TextInput
                                    className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                    placeholder="100"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    value={maxScore}
                                    onChangeText={setMaxScore}
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-1 mb-2">Term</Text>
                                <ScrollView horizontal className="flex-row" showsHorizontalScrollIndicator={false}>
                                    {availableTerms.map(tOption => (
                                        <TouchableOpacity
                                            key={tOption}
                                            onPress={() => setTerm(tOption)}
                                            className={`mr-2 px-3.5 py-2 rounded-xl border ${term === tOption ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-[#F6F8FA] dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                                        >
                                            <Text className={`font-bold text-xs ${term === tOption ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {tOption}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {(() => {
                                const canCreate = !!title.trim() && !!selectedSubjectId && !!date.trim() && canSchedule && !creating;
                                return (
                                    <TouchableOpacity
                                        onPress={handleCreateExam}
                                        disabled={!canCreate}
                                        style={{ opacity: canCreate ? 1 : 0.5 }}
                                        className="bg-[#FF6900] py-4 rounded-xl items-center shadow-md active:bg-orange-600 mb-6"
                                        accessibilityState={{ disabled: !canCreate, busy: creating }}
                                    >
                                        <Text className="text-white font-bold text-base">
                                            {creating ? "Scheduling..." : "Schedule Exam"}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
