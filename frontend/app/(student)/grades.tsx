import { GradeDetailModal } from "@/components/common/GradeDetailModal";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { router } from "expo-router";
import { Award, BarChart3, Star, TrendingUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

interface GradeProps {
    SubjectName: string;
    SubjectCode: string;
    grade: string;
    score: number;
    credits: number;
    onPress: () => void;
}

const SubjectGrade = ({ SubjectCode, SubjectName, grade, score, credits, onPress }: GradeProps) => {
    const getGradeColor = (g: string) => {
        if (g.startsWith('A')) return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/20' };
        if (g.startsWith('B')) return { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20' };
        if (g.startsWith('C')) return { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/20' };
        return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20' };
    }
    const styles = getGradeColor(grade);
    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-50 dark:border-gray-800 mb-4 shadow-sm flex-row items-center active:bg-gray-50 dark:active:bg-gray-900"
        >
            <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${styles.bg}`}>
                <Text className={`font-black text-xl ${styles.text}`}>{grade === 'N/A' || grade === null ? '?' : grade}</Text>
            </View>
            <View className="flex-1">
                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-[2px] mb-1">{SubjectCode}</Text>
                <Text className="text-gray-900 dark:text-white font-bold text-base leading-tight" numberOfLines={1}>{SubjectName}</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">{credits} Credits Earned</Text>
            </View>
            <View className="items-end">
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-base">{score}%</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">Weightage</Text>
            </View>
        </TouchableOpacity>
    )
}

export default function Grades() {
    const { studentId, displayId, user, isDemo } = useAuth();
    const [grades, setGrades] = useState<GradeProps[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ gpa: 0, credits: 0, totalMarks: 0, avgMark: 0, rank: 'N/A' as string | number, totalStudents: 0 });
    const [showModal, setShowModal] = useState(false);
    const [fetchingDetails, setFetchingDetails] = useState(false);
    const [selectedDetails, setSelectedDetails] = useState({
        subjectName: "",
        lecturerName: "",
        examMark: 0,
        testScores: [] as any[]
    });

    useEffect(() => {
        if (studentId || user?.id || isDemo) {
            fetchGrades();
        }
    }, [studentId, user?.id, isDemo]);

    const getPerformanceStatus = (gpa: number) => {
        if (gpa >= 4.0) return { label: "Elite Achievement", color: "text-emerald-400" };
        if (gpa >= 3.7) return { label: "Scholar Distinction", color: "text-emerald-300" };
        if (gpa >= 3.3) return { label: "Merit Standing", color: "text-blue-300" };
        if (gpa >= 3.0) return { label: "Standard Proficiency", color: "text-blue-200" };
        return { label: "Academic Advisory", color: "text-orange-200" };
    };

    const fetchGrades = async () => {
        const targetId = studentId || user?.id;
        if (!targetId) return;
        try {
            setLoading(true);
            const { data } = await supabase
                .from('submissions')
                .select(`grade, assignment:assignments!inner(title, is_published, subject:subjects(title, id, credits))`)
                .eq('student_id', targetId)
                .eq('status', 'graded')
                .eq('assignment.is_published', true);

            const { data: enrollmentGrades } = await supabase
                .from('enrollments')
                .select(`grade, subjects(id, title, credits)`)
                .eq('student_id', targetId);

            const { data: reportGrades } = await supabase
                .from('grades')
                .select(`total_grade, subjects:subject_id(id, title, credits)`)
                .eq('student_id', targetId);

            const subjectGrades: Record<string, { total: number, count: number, name: string, credits: number, finalGrade?: string, manualScore?: number }> = {};

            data?.forEach((sub: any) => {
                const subjectId = sub.assignment?.subject?.id;
                const score = Number(sub.grade);
                if (subjectId && !isNaN(score)) {
                    if (!subjectGrades[subjectId]) {
                        subjectGrades[subjectId] = {
                            total: 0,
                            count: 0,
                            name: sub.assignment.subject.title,
                            credits: sub.assignment.subject.credits || 0
                        };
                    }
                    subjectGrades[subjectId].total += score;
                    subjectGrades[subjectId].count += 1;
                }
            });

            enrollmentGrades?.forEach((eg: any) => {
                const subId = eg.subjects?.id;
                if (subId) {
                    if (!subjectGrades[subId]) subjectGrades[subId] = { total: 0, count: 0, name: eg.subjects.title, credits: eg.subjects.credits || 0 };
                    subjectGrades[subId].finalGrade = eg.grade;
                }
            });

            reportGrades?.forEach((rg: any) => {
                const subId = rg.subjects?.id;
                if (subId) {
                    if (!subjectGrades[subId]) subjectGrades[subId] = { total: 0, count: 0, name: rg.subjects?.title || "Unknown Subject", credits: rg.subjects?.credits || 0 };
                    subjectGrades[subId].manualScore = Number(rg.total_grade);
                }
            });

            const formattedGrades: GradeProps[] = Object.entries(subjectGrades).map(([id, val]) => {
                const score = val.manualScore ?? (val.count > 0 ? (val.total / val.count) : 0);
                let letter = val.finalGrade || 'N/A';
                if (letter === 'N/A' || letter === null) {
                    if (score >= 90) letter = 'A';
                    else if (score >= 80) letter = 'B';
                    else if (score >= 70) letter = 'C';
                    else if (score >= 60) letter = 'D';
                    else if (score > 0) letter = 'F';
                }
                const gradeItem = {
                    SubjectName: val.name,
                    SubjectCode: "ACAD-" + id.substring(0, 4).toUpperCase(),
                    grade: letter,
                    score: Math.round(score),
                    credits: val.credits,
                    onPress: () => { }
                };
                gradeItem.onPress = () => fetchSubjectDetails(gradeItem);
                return gradeItem;
            });

            setGrades(formattedGrades);
            const totalScore = formattedGrades.reduce((acc, curr) => acc + curr.score, 0);
            const avgScore = formattedGrades.length ? totalScore / formattedGrades.length : 0;
            const gpa = (avgScore / 25).toFixed(2);

            // Fetch Rank - Cast to any to bypass generated type check
            const { data: rankData }: any = await (supabase.rpc as any)('get_student_rank', { p_student_id: targetId });

            setStats({
                gpa: Number(gpa),
                credits: formattedGrades.reduce((acc, curr) => acc + curr.credits, 0),
                totalMarks: totalScore,
                avgMark: Number(avgScore.toFixed(2)),
                rank: rankData?.rank || 'N/A',
                totalStudents: rankData?.total_students || 0
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjectDetails = async (subject: any) => {
        const targetId = studentId || user?.id;
        if (!targetId) return;
        try {
            setFetchingDetails(true);

            const { data: subjectData, error: error } = await supabase
                .from('subjects')
                .select('id, title, teacher:teachers(user:users(full_name))')
                .eq('title', subject.SubjectName)
                .single();

            if (error || !subjectData) throw new Error("Subject not found");

            const subId = (subjectData as any).id;

            const { data: submissions } = await supabase
                .from('submissions')
                .select('grade, assignment:assignments!inner(id, title, total_points, weight, is_published)')
                .eq('student_id', targetId)
                .eq('assignment.subject_id', (subjectData as any).id)
                .eq('assignment.is_published', true)
                .eq('status', 'graded');

            const { data: examResults } = await supabase
                .from('exam_results')
                .select('score, exam:exams!inner(id, title, max_score, weight, is_published)')
                .eq('student_id', targetId)
                .eq('exam.subject_id', (subjectData as any).id)
                .eq('exam.is_published', true);

            const testScores = [
                ...(submissions?.map((s: any) => ({
                    title: s.assignment.title,
                    mark: s.grade,
                    maxMark: s.assignment.total_points,
                    weight: s.assignment.weight
                })) || []),
                ...(examResults?.map((er: any) => ({
                    title: er.exam.title,
                    mark: er.score,
                    maxMark: er.exam.max_score,
                    weight: er.exam.weight
                })) || [])
            ];

            setSelectedDetails({
                subjectName: subject.SubjectName,
                lecturerName: (subjectData as any).teacher?.user?.full_name || "Assigned Faculty",
                examMark: subject.score,
                testScores
            });
            setShowModal(true);
        } catch (error) {
            console.error("Error fetching subject details:", error);
            Alert.alert("Error", "Failed to fetch grade breakdown");
        } finally {
            setFetchingDetails(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
                <ActivityIndicator size="large" color="#FF6900" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Intelligence"
                subtitle="Performance"
                role="Student"
                onBack={() => router.back()}
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                <View className="p-4 md:p-8">
                    {/* GPA Hero */}
                    <View className="bg-gray-900 dark:bg-[#1a1a1a] p-8 rounded-[48px] shadow-2xl mb-8 border border-transparent dark:border-gray-800">
                        <View className="flex-row justify-between items-start mb-10">
                            <View>
                                <Text className="text-white/40 dark:text-gray-500 text-[10px] font-bold uppercase tracking-[3px] mb-2">Academic Index</Text>
                                <Text className="text-white text-6xl font-black tracking-tighter">{stats.gpa}</Text>
                                <Text className={`text-sm font-bold mt-2 ${getPerformanceStatus(stats.gpa).color}`}>
                                    {getPerformanceStatus(stats.gpa).label}
                                </Text>
                            </View>
                            <View className="bg-[#FF6900] p-4 rounded-3xl shadow-lg">
                                <TrendingUp size={28} color="white" />
                            </View>
                        </View>

                        <View className="flex-row justify-between pt-8 border-t border-white/10 dark:border-gray-800">
                            <View className="items-center">
                                <Text className="text-white/30 dark:text-gray-600 text-[8px] font-bold uppercase tracking-widest">Global Rank</Text>
                                <Text className="text-white font-bold text-xl mt-1">{stats.rank}{stats.totalStudents > 0 ? `/${stats.totalStudents}` : ''}</Text>
                            </View>
                            <View className="items-center border-x border-white/10 dark:border-gray-800 px-8">
                                <Text className="text-white/30 dark:text-gray-600 text-[8px] font-bold uppercase tracking-widest">Credits</Text>
                                <Text className="text-white font-bold text-xl mt-1">{stats.credits}</Text>
                            </View>
                            <View className="items-center">
                                <Text className="text-white/30 dark:text-gray-600 text-[8px] font-bold uppercase tracking-widest">Weighted</Text>
                                <Text className="text-[#FF6900] font-bold text-xl mt-1">{stats.avgMark}%</Text>
                            </View>
                        </View>
                    </View>

                    {/* Performance Analytics Card */}
                    <View className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm mb-10">
                        <View className="flex-row items-center mb-6">
                            <BarChart3 size={18} color="#FF6900" />
                            <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight ml-3">Analytical Overview</Text>
                        </View>
                        <View className="flex-row border-t border-gray-50 dark:border-gray-800 pt-6">
                            <View className="flex-1">
                                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-1">Raw Aggregation</Text>
                                <Text className="text-gray-900 dark:text-gray-100 font-bold text-xl">{stats.totalMarks.toLocaleString()}</Text>
                            </View>
                            <View className="flex-1 border-l border-gray-50 dark:border-gray-800 pl-6">
                                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-1">Average Grade</Text>
                                <Text className="text-gray-900 dark:text-gray-100 font-bold text-xl">
                                    {(() => {
                                        const avg = stats.avgMark;
                                        if (avg >= 90) return 'A';
                                        if (avg >= 80) return 'B';
                                        if (avg >= 70) return 'C';
                                        if (avg >= 60) return 'D';
                                        return 'F';
                                    })()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Subject Breakdown */}
                    <View className="px-2 flex-row justify-between items-center mb-6">
                        <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Transcript Records</Text>
                        <TouchableOpacity className="flex-row items-center bg-white dark:bg-[#1a1a1a] px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden active:bg-gray-50 dark:active:bg-gray-900">
                            <Award size={14} color="#FF6900" />
                            <Text className="text-gray-900 dark:text-gray-100 text-[10px] font-bold uppercase tracking-widest ml-2">History</Text>
                        </TouchableOpacity>
                    </View>

                    {grades.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-20 rounded-[48px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-4">
                            <Star size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6">Void Transcript</Text>
                        </View>
                    ) : (
                        grades.map((g, i) => (
                            <SubjectGrade
                                key={i}
                                SubjectCode={g.SubjectCode}
                                SubjectName={g.SubjectName}
                                grade={g.grade}
                                score={g.score}
                                credits={g.credits}
                                onPress={g.onPress}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            <GradeDetailModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                {...selectedDetails}
            />

            {fetchingDetails && (
                <View className="absolute inset-0 bg-black/20 justify-center items-center">
                    <ActivityIndicator size="large" color="#FF6900" />
                </View>
            )}
        </View>
    );
}
