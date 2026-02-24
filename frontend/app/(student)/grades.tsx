
import { Award, TrendingUp } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { useState, useEffect } from "react";

interface GradeProps {
    SubjectName: string;
    SubjectCode: string;
    grade: string;
    score: number,
    credits: number;
}

const SubjectGrade = ({ SubjectCode, SubjectName, grade, score, credits }: GradeProps) => {

    const getGradeColor = (g: string) => {
        if (g.startsWith('A')) return 'text-green-600 bg-green-50 border-green-100';
        if (g.startsWith('B')) return 'text-blue-600 bg-blue-50 border-blue-100';
        if (g.startsWith('C')) return 'text-yellow-600 bg-yellow-50 border-yellow-100';
        return 'text-red-600 bg-red-50 border-red-100'
    }
    return (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm flex-row items-center justify-between">
            <View className="flex-1">
                <Text className="text-xs font-bold text-gray-400 uppercase">{SubjectCode}</Text>
                <Text className="text-gray-800 font-semibold text-base" numberOfLines={1}>{SubjectName}</Text>
                <Text className="text-gray-500 text-xs mt-1">{credits} Credits</Text>
            </View>

            <View className="items-end">
                <View className={`px-3 py-1 rounded-full border ${getGradeColor(grade)}`}>
                    <Text className={`font-bold ${getGradeColor(grade).split(' ')[0]}`}>{grade}</Text>
                </View>
                <Text className="text-gray-400 text-xs mt-1">{score}%</Text>
            </View>
        </View>
    )
}

export default function Grades() {
    const { studentId, displayId } = useAuth();
    const [grades, setGrades] = useState<GradeProps[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ gpa: 0, credits: 0, rank: 0 });

    useEffect(() => {
        if (studentId) {
            fetchGrades();
        }
    }, [studentId]);

    const fetchGrades = async () => {
        if (!studentId) return;
        try {
            setLoading(true);
            // Fetch submissions that are graded
            // We need to join with assignments -> subjects to get subject details
            const { data, error } = await supabase
                .from('submissions')
                .select(`
                    grade,
                    assignment:assignments(
                        title,
                        subject:subjects(title, id, credits) 
                    )
                `)
                .eq('student_id', studentId)
                .eq('status', 'graded');

            if (error) throw error;

            // Group by subject
            const subjectGrades: Record<string, { total: number, count: number, name: string, credits: number }> = {};

            data.forEach((sub: any) => {
                const subjectId = sub.assignment?.subject?.id;
                const subjectName = sub.assignment?.subject?.title;
                const credits = sub.assignment?.subject?.credits || 0;
                const score = Number(sub.grade);

                if (subjectId && !isNaN(score)) {
                    if (!subjectGrades[subjectId]) {
                        subjectGrades[subjectId] = { total: 0, count: 0, name: subjectName, credits };
                    }
                    subjectGrades[subjectId].total += score;
                    subjectGrades[subjectId].count += 1;
                }
            });

            const formattedGrades: GradeProps[] = Object.entries(subjectGrades).map(([id, val]) => {
                const avg = val.total / val.count;
                let letter = 'F';
                if (avg >= 90) letter = 'A';
                else if (avg >= 80) letter = 'B';
                else if (avg >= 70) letter = 'C';
                else if (avg >= 60) letter = 'D';

                return {
                    SubjectName: val.name,
                    SubjectCode: "SUB-" + id.substring(0, 4).toUpperCase(),
                    grade: letter,
                    score: Math.round(avg),
                    credits: val.credits
                };
            });


            setGrades(formattedGrades);

            // Calc stats
            const totalScore = formattedGrades.reduce((acc, curr) => acc + curr.score, 0);
            const avgScore = formattedGrades.length ? totalScore / formattedGrades.length : 0;
            const gpa = (avgScore / 25).toFixed(2); // Rough GPA calc

            setStats({
                gpa: Number(gpa),
                credits: formattedGrades.reduce((sum, g) => sum + g.credits, 0),
                rank: 0 // Mock removed
            });

        } catch (error) {
            console.error("Error fetching grades:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F1FFF8]">
                <ActivityIndicator size="large" color="orange" />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-4 md:p-8 max-w-3xl mx-auto w-full">
                <Text className="text-2xl font-bold text-gray-900 mb-6">Academic Performance</Text>
                <View className="bg-orange-500 rounded-3xl p-6 mb-8 shadow-lg shadow-orange-200">
                    <View className="flex-row justify-between items-start">
                        <View>
                            <Text className="text-orange-100 font-medium italic">Cumulative GPA</Text>
                            {displayId && (
                                <Text className="text-orange-200 text-[10px] font-bold">Student ID: {displayId}</Text>
                            )}
                            <Text className="text-white text-5xl font-black mt-1">{stats.gpa}</Text>
                        </View>
                        <View className="bg-white/20 p-3 rounded-2xl">
                            <TrendingUp size={28} color="white" />
                        </View>
                    </View>

                    <View className="flex-row mt-6 pt-6 border-t border-white/10 justify-between">
                        {stats.rank > 0 && (
                            <View className="items-center flex-1">
                                <Text className="text-orange-100 text-xs uppercase">Rank</Text>
                                <Text className="text-white font-bold text-lg">#{stats.rank}</Text>
                            </View>
                        )}
                        <View className="items-center flex-1 border-x border-white/10">
                            <Text className="text-orange-100 text-xs uppercase">Credits</Text>
                            <Text className="text-white font-bold text-lg">{stats.credits}</Text>
                        </View>
                        <View className="items-center flex-1">
                            <Text className="text-orange-100 text-xs uppercase">Status</Text>
                            <Text className="text-white font-bold text-lg">Good Standing</Text>
                        </View>
                    </View>
                </View>

                {/* --- Current Semester Section --- */}
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                        <Award size={20} color="orange" />
                        <Text className="ml-2 font-bold text-gray-800">Current Semester</Text>
                    </View>
                    <Text className="text-orange-600 text-xs font-bold uppercase">{grades.length} Subjects</Text>
                </View>

                {grades.length === 0 ? (
                    <Text className="text-gray-500 text-center py-8">No grades available yet.</Text>
                ) : (
                    grades.map((g, i) => (
                        <SubjectGrade
                            key={i}
                            SubjectCode={g.SubjectCode}
                            SubjectName={g.SubjectName}
                            grade={g.grade}
                            score={g.score}
                            credits={g.credits}
                        />
                    ))
                )}

                {/* --- Past Semesters --- */}
                <TouchableOpacity className="mt-4 p-4 bg-white rounded-2xl border border-dashed border-orange-300 items-center">
                    <Text className="text-gray-500 font-medium">View Previous Semesters</Text>
                </TouchableOpacity>

            </View>
        </ScrollView>
    )
}
