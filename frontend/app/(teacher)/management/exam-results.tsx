import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { ExamService } from "@/services/ExamService";
import { GradingAPI } from "@/services/GradingService";
import { TeacherService } from "@/services/TeacherService";
import { showError, showSuccess } from "@/utils/toast";
import { router, useLocalSearchParams } from "expo-router";
import {
    AlertCircle,
    Award,
    CheckCircle2,
    Lock,
    Save,
    Search,
    User
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Toast from 'react-native-toast-message';

interface StudentScore {
    student_id: string;
    student_name: string;
    score: string;
    feedback: string;
    competency_band?: string;
}

export default function ExamResultsPage() {
    const { examId } = useLocalSearchParams();
    const { isDemo, user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'principal' || user?.role === 'head_teacher';
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exam, setExam] = useState<any>(null);
    const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [gradingScale, setGradingScale] = useState<any>(null);
    const [isHOD, setIsHOD] = useState(false);

    const isDeadlinePassed = exam?.submission_deadline
        ? new Date() > new Date(exam.submission_deadline)
        : false;
    const canOverride = isAdmin || isHOD;
    const isLocked = isDeadlinePassed && !canOverride;

    useEffect(() => {
        if (examId) {
            fetchInitialData();
        }
    }, [examId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [currentExam, studentList, existingResults, customScales, defaultScale, hodList] = await Promise.all([
                ExamService.getExamById(examId as string),
                ExamService.getExamRoster(examId as string).catch(() => []),
                ExamService.getExamResults(examId as string).catch(() => []),
                GradingAPI.getGradingScales().catch(() => []),
                GradingAPI.getDefaultScale().catch(() => null),
                TeacherService.getHODSubjects().catch(() => [])
            ]);

            setExam(currentExam);
            const activeScales = (Array.isArray(customScales) && customScales.length > 0)
                ? customScales
                : defaultScale;
            setGradingScale(activeScales);

            if (currentExam && Array.isArray(hodList)) {
                const isSubjectHod = hodList.some((s: any) => s.id === currentExam.subject_id);
                setIsHOD(isSubjectHod);
            }

            if (!currentExam) {
                showError("Error", "Exam not found");
                router.back();
                return;
            }

            const initialScores = (studentList || []).map((s: any) => {
                const existing = (existingResults || []).find((r: any) => r.student_id === s.student_id);
                return {
                    student_id: s.student_id,
                    student_name: s.name || s.full_name || s.student_name || "Unknown Student",
                    score: existing ? existing.score.toString() : "",
                    feedback: existing ? existing.feedback || "" : "",
                    competency_band: existing?.competency_band
                };
            });

            setStudentScores(initialScores);
        } catch (error) {
            console.error(error);
            showError("Error", "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const getScalesList = () => {
        if (Array.isArray(gradingScale)) return gradingScale;
        if (Array.isArray(gradingScale?.scales)) return gradingScale.scales;
        if (Array.isArray(gradingScale?.descriptors)) return gradingScale.descriptors;
        return null;
    };

    const calculateBand = (scoreNum: number, max: number) => {
        if (isNaN(scoreNum)) return undefined;
        const pct = (scoreNum / max) * 100;
        const scalesList = getScalesList();
        if (scalesList && scalesList.length > 0) {
            const found = scalesList.find((d: any) => pct >= Number(d.min_score) && pct <= Number(d.max_score));
            if (found) return found.letter_grade || found.grade || found.label || found.name;
        }
        if (pct >= 80) return 'A';
        if (pct >= 70) return 'B';
        if (pct >= 60) return 'C';
        if (pct >= 50) return 'D';
        return 'E';
    };

    const handleUpdateScore = (studentId: string, field: 'score' | 'feedback', value: string) => {
        if (isLocked) return;
        setStudentScores(prev => prev.map(s => {
            if (s.student_id !== studentId) return s;
            const updated = { ...s, [field]: value };
            if (field === 'score') {
                const numScore = parseFloat(value);
                const max = Number(exam?.max_score) || 100;
                updated.competency_band = calculateBand(numScore, max);
            }
            return updated;
        }));
    };

    const handleSaveResults = async () => {
        if (isLocked) {
            showError("Locked", "The submission deadline for this exam has passed.");
            return;
        }

        if (isDemo) {
            Toast.show({
                type: 'success',
                text1: 'Done',
                text2: 'Changes saved.'
            });
            return;
        }
        try {
            setSaving(true);
            const promises = studentScores
                .filter(s => s.score !== "")
                .map(s => ExamService.recordExamResult({
                    exam_id: examId,
                    student_id: s.student_id,
                    score: parseFloat(s.score),
                    feedback: s.feedback,
                    competency_band: s.competency_band
                }));

            await Promise.all(promises);
            showSuccess("Success", "Exam results saved successfully");
        } catch (error: any) {
            console.error(error);
            const msg = error?.response?.data?.error || "Failed to save results";
            showError("Error", msg);
        } finally {
            setSaving(false);
        }
    };

    const getCompetencyBadge = (scoreStr: string, band?: string) => {
        if (!scoreStr) return null;
        const numScore = parseFloat(scoreStr);
        if (isNaN(numScore)) return null;

        const max = Number(exam?.max_score) || 100;
        const b = band || calculateBand(numScore, max);
        if (!b) return null;

        const scalesList = getScalesList();
        if (scalesList && scalesList.length > 0) {
            const desc = scalesList.find((d: any) =>
                (d.letter_grade && d.letter_grade.toLowerCase() === b.toLowerCase()) ||
                (d.grade && d.grade.toLowerCase() === b.toLowerCase()) ||
                (d.label && d.label.toLowerCase() === b.toLowerCase()) ||
                (d.name && d.name.toLowerCase() === b.toLowerCase())
            );
            if (desc) {
                const badgeLabel = desc.letter_grade || desc.grade || b;
                const badgeDesc = desc.description || desc.label || '';
                const color = desc.color || (
                    badgeLabel === 'A' || badgeLabel === 'EE' ? '#059669' :
                    badgeLabel === 'B' || badgeLabel === 'ME' ? '#2563EB' :
                    badgeLabel === 'C' || badgeLabel === 'AE' ? '#D97706' : '#DC2626'
                );
                return (
                    <View
                        style={{ borderColor: color }}
                        className="bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border flex-row items-center"
                    >
                        <Award size={10} color={color} />
                        <Text style={{ color }} className="font-bold text-[9px] uppercase ml-1">
                            {badgeLabel}{badgeDesc ? ` • ${badgeDesc}` : ''}
                        </Text>
                    </View>
                );
            }
        }

        const color = b === 'A' || b === 'EE' ? '#059669' : b === 'B' || b === 'ME' ? '#2563EB' : b === 'C' || b === 'AE' ? '#D97706' : '#DC2626';
        return (
            <View style={{ borderColor: color }} className="px-2 py-0.5 rounded-md border flex-row items-center">
                <Text style={{ color }} className="font-bold text-[9px] uppercase">{b}</Text>
            </View>
        );
    };

    const filteredStudents = studentScores.filter(s =>
        s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title={exam?.title || "Exam Results"}
                subtitle={exam ? `Max: ${exam.max_score} Pts` : "Grading"}
                role="Teacher"
                onBack={() => router.back()}
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 200 }}>
                <View className="p-4 md:p-8">
                    {/* Submission Locked Warning Banner */}
                    {isLocked && (
                        <View className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 mb-5 flex-row items-center">
                            <Lock size={20} color="#E11D48" className="mr-3" />
                            <View className="flex-1 ml-2">
                                <Text className="text-rose-800 dark:text-rose-300 font-bold text-xs">
                                    Submissions Closed
                                </Text>
                                <Text className="text-rose-600 dark:text-rose-400 text-[11px] font-medium mt-0.5">
                                    The deadline for submitting grades ({new Date(exam.submission_deadline).toLocaleDateString()}) has passed. Contact your Subject Head (HOD) or Administration for changes.
                                </Text>
                            </View>
                        </View>
                    )}

                    {isDeadlinePassed && canOverride && (
                        <View className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-300 dark:border-amber-800/60 mb-5 flex-row items-center">
                            <AlertCircle size={18} color="#D97706" />
                            <View className="flex-1 ml-2.5">
                                <Text className="text-amber-800 dark:text-amber-300 font-bold text-xs">
                                    Submission Deadline Passed (Override Active)
                                </Text>
                                <Text className="text-amber-700 dark:text-amber-400 text-[11px] mt-0.5">
                                    You are editing under {isAdmin ? 'Administrator' : 'Subject Head (HOD)'} authority.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Actions Row */}
                    <View className="flex-row items-center gap-3 mb-6">
                        <View className="flex-1 flex-row items-center bg-white dark:bg-[#0D1117] px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800">
                            <Search size={16} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-2.5 text-gray-900 dark:text-white font-medium text-xs"
                                placeholder="Find learner..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSaveResults}
                            disabled={saving || isLocked}
                            className={`px-5 py-3 rounded-2xl flex-row items-center shadow-sm ${isLocked ? 'bg-gray-300 dark:bg-gray-800' : 'bg-[#FF6900] active:bg-orange-600'}`}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Save size={16} color="white" />
                                    <Text className="text-white font-bold text-xs uppercase tracking-wider ml-1.5">
                                        {isLocked ? "Locked" : "Save"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ListItemSkeleton loading={loading} count={4} label="Loading exam results..." />
                    ) : (
                        <>
                            {filteredStudents.map((student) => (
                                <View
                                    key={student.student_id}
                                    className="bg-white dark:bg-[#161B22] p-5 rounded-[28px] mb-4 border border-gray-200 dark:border-gray-800 shadow-sm"
                                >
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="flex-row items-center flex-1 mr-2">
                                            <View className="bg-orange-50 dark:bg-orange-950/40 p-2.5 rounded-xl mr-3 border border-orange-200 dark:border-orange-800/40">
                                                <User size={18} color="#FF6900" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight" numberOfLines={1}>
                                                    {student.student_name}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Competency Band Badge */}
                                        {getCompetencyBadge(student.score, student.competency_band)}
                                    </View>

                                    <View className="flex-row gap-3">
                                        <View className="w-24">
                                            <Text className="text-gray-400 dark:text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-1.5 ml-1">
                                                Score / {exam?.max_score || 100}
                                            </Text>
                                            <TextInput
                                                editable={!isLocked}
                                                className={`p-3 rounded-xl font-bold text-center border text-sm ${isLocked ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700' : 'bg-[#F6F8FA] dark:bg-[#0D1117] text-gray-900 dark:text-white border-gray-200 dark:border-gray-800'}`}
                                                placeholder="0"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                value={student.score}
                                                onChangeText={(val) => handleUpdateScore(student.student_id, 'score', val)}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-400 dark:text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-1.5 ml-1">
                                                Teacher Feedback / Rubric Notes
                                            </Text>
                                            <TextInput
                                                editable={!isLocked}
                                                className={`p-3 rounded-xl font-medium border text-xs ${isLocked ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700' : 'bg-[#F6F8FA] dark:bg-[#0D1117] text-gray-900 dark:text-white border-gray-200 dark:border-gray-800'}`}
                                                placeholder="Proficient in key concepts..."
                                                placeholderTextColor="#9CA3AF"
                                                value={student.feedback}
                                                onChangeText={(val) => handleUpdateScore(student.student_id, 'feedback', val)}
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}

                            {filteredStudents.length === 0 && (
                                <View className="bg-white dark:bg-[#161B22] p-12 rounded-[32px] items-center border border-dashed border-gray-200 dark:border-gray-800 mt-4">
                                    <User size={40} color="#9CA3AF" style={{ opacity: 0.5 }} />
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-3 text-sm">
                                        No matching learners found
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
