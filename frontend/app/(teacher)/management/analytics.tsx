import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { ArrowLeft, TrendingUp, Users, BookOpen, Clock, Award, ChevronDown, Download } from 'lucide-react-native';
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface SubjectAnalytics {
    id: string;
    name: string;
    students: number;
    avgProgress: number; // Mapping to completion rate for now
    avgGrade: number;
    completionRate: number;
}

const StatBox = ({ icon: Icon, label, value, color, bgColor }: { icon: any; label: string; value: string; color: string; bgColor: string }) => (
    <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
        <View style={{ backgroundColor: bgColor }} className="w-10 h-10 rounded-xl items-center justify-center mb-2">
            <Icon size={20} color={color} />
        </View>
        <Text className="text-gray-900 text-2xl font-bold">{value}</Text>
        <Text className="text-gray-400 text-xs uppercase">{label}</Text>
    </View>
);

const SubjectAnalyticsCard = ({ Subject }: { Subject: SubjectAnalytics }) => {
    return (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                    <Text className="text-gray-900 font-bold">{Subject.name}</Text>
                    <Text className="text-gray-400 text-xs">{Subject.students} students</Text>
                </View>
                <View className="bg-orange-50 px-2 py-1 rounded-full">
                    <Text className="text-teacherOrange text-xs font-bold">{Subject.completionRate}% complete</Text>
                </View>
            </View>

            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-gray-400 text-xs mb-1">Completion</Text>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <View className="h-full bg-teacherOrange rounded-full" style={{ width: `${Subject.completionRate}%` }} />
                    </View>
                    <Text className="text-teacherOrange text-xs font-bold mt-1">{Subject.completionRate}%</Text>
                </View>
                <View className="flex-1">
                    <Text className="text-gray-400 text-xs mb-1">Avg Grade</Text>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <View className="h-full bg-teacherBlack rounded-full" style={{ width: `${Subject.avgGrade}%` }} />
                    </View>
                    <Text className="text-teacherBlack text-xs font-bold mt-1">{Subject.avgGrade}%</Text>
                </View>
            </View>
        </View>
    );
};

export default function AnalyticsPage() {
    const { user, teacherId } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState("All Time");
    const [SubjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [topPerformers, setTopPerformers] = useState<any[]>([]);

    useEffect(() => {
        if (teacherId) {
            fetchAnalytics();
        }
    }, [teacherId]);

    const fetchAnalytics = async () => {
        if (!teacherId) return;
        setLoading(true);
        try {
            // 1. Fetch Subjects for this teacher
            const { data: Subjects, error: SubjectsError } = await supabase
                .from('subjects') // Fixed: Lowercase 'subjects'
                .select('id, title, class_id')
                .eq('teacher_id', teacherId);

            if (SubjectsError) throw SubjectsError;

            // 2. Fetch Assignments & Students count for each Subject
            const analyticsPromises = Subjects.map(async (Subject) => {
                // A. Get Student Count
                let studentCount = 0;
                if (Subject.class_id) {
                    const { count } = await supabase
                        .from('enrollments')
                        .select('*', { count: 'exact', head: true })
                        .eq('class_id', Subject.class_id);
                    studentCount = count || 0;
                }

                // B. Get Assignments
                const { data: assignments } = await supabase
                    .from('assignments')
                    .select('id, total_points')
                    .eq('subject_id', Subject.id); // Fixed: Lowercase 'subject_id'

                const assignmentIds = (assignments || []).map(a => a.id);

                // C. Get Submissions
                let avgGrade = 0;
                let completionRate = 0;
                let totalSubmissions = 0;

                if (assignmentIds.length > 0) {
                    const { data: submissions } = await supabase
                        .from('submissions')
                        .select('grade, status')
                        .in('assignment_id', assignmentIds);

                    if (submissions && submissions.length > 0) {
                        // Avg Grade calculation
                        const gradedSubs = submissions.filter(s => s.grade !== null);
                        if (gradedSubs.length > 0) {
                            const totalScore = gradedSubs.reduce((sum, s) => sum + (s.grade || 0), 0);
                            avgGrade = Math.round(totalScore / gradedSubs.length);
                        }

                        // Completion Rate
                        totalSubmissions = submissions.length;
                        const expectedSubmissions = assignmentIds.length * studentCount;
                        if (expectedSubmissions > 0) {
                            completionRate = Math.round((totalSubmissions / expectedSubmissions) * 100);
                        }
                    }
                }

                return {
                    id: Subject.id,
                    name: Subject.title,
                    students: studentCount,
                    avgProgress: completionRate, // reusing
                    avgGrade,
                    completionRate
                };
            });

            const results = await Promise.all(analyticsPromises);
            setSubjectAnalytics(results);

            // Fetch performance data to calculate top performers
            // This part is adapted from the instruction, assuming 'TeacherAPI.getStudentPerformance()'
            // would fetch student grades across all subjects for the teacher.
            // For now, we'll simulate this by fetching all enrollments and their associated grades.

            const { data: enrollments, error: enrollmentsError } = await supabase
                .from('enrollments')
                .select(`
                    student_id,
                    students (full_name),
                    classes (
                        subjects (
                            id,
                            assignments (
                                id,
                                submissions (grade)
                            )
                        )
                    )
                `)
                .in('class_id', Subjects.map(s => s.class_id).filter(Boolean)); // Filter out null class_ids

            if (enrollmentsError) throw enrollmentsError;

            const allStudentsPerformance: { [key: string]: { full_name: string, grades: number[] } } = {};

            enrollments.forEach((enrollment: any) => {
                const studentId = enrollment.student_id;
                const studentName = enrollment.students?.full_name || 'Unknown Student';

                if (!allStudentsPerformance[studentId]) {
                    allStudentsPerformance[studentId] = { full_name: studentName, grades: [] };
                }

                enrollment.classes?.subjects.forEach((subject: any) => {
                    subject.assignments.forEach((assignment: any) => {
                        assignment.submissions.forEach((submission: any) => {
                            if (submission.grade !== null) {
                                allStudentsPerformance[studentId].grades.push(submission.grade);
                            }
                        });
                    });
                });
            });

            const topList = Object.values(allStudentsPerformance)
                .map(s => {
                    const avg = s.grades.length > 0
                        ? s.grades.reduce((a: number, b: number) => a + b, 0) / s.grades.length
                        : 0;
                    return {
                        name: s.full_name,
                        initials: s.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2),
                        score: Math.round(avg)
                    };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            setTopPerformers(topList);

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalStudents = SubjectAnalytics.reduce((acc, c) => acc + c.students, 0);
    const avgCompletion = SubjectAnalytics.length > 0
        ? Math.round(SubjectAnalytics.reduce((acc, c) => acc + c.completionRate, 0) / SubjectAnalytics.length)
        : 0;
    const avgGradeOverall = SubjectAnalytics.length > 0
        ? Math.round(SubjectAnalytics.reduce((acc, c) => acc + c.avgGrade, 0) / SubjectAnalytics.length)
        : 0;

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
                                <Text className="text-2xl font-bold text-gray-900">Analytics</Text>
                            </View>
                            <TouchableOpacity className="p-2 bg-white rounded-xl border border-gray-100">
                                <Download size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Period Selector */}
                        <TouchableOpacity className="bg-white rounded-xl px-4 py-3 mb-6 border border-gray-100 flex-row items-center justify-between">
                            <Text className="text-gray-700 font-medium">{selectedPeriod}</Text>
                            <ChevronDown size={16} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Overview Stats */}
                        <View className="flex-row gap-3 mb-6">
                            <StatBox icon={Users} label="Total Students" value={totalStudents.toString()} color="#FF6B00" bgColor="#fff7ed" />
                            <StatBox icon={TrendingUp} label="Avg Completion" value={`${avgCompletion}%`} color="#1a1a1a" bgColor="#f3f4f6" />
                        </View>
                        <View className="flex-row gap-3 mb-6">
                            <StatBox icon={BookOpen} label="Subjects" value={SubjectAnalytics.length.toString()} color="#FF6B00" bgColor="#fff7ed" />
                            <StatBox icon={Award} label="Avg Grade" value={`${avgGradeOverall}%`} color="#1a1a1a" bgColor="#f3f4f6" />
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#FF6B00" className="mt-8" />
                        ) : (
                            <>
                                {/* Performance Chart (Planned feature, removed placeholder) */}
                                <View className="bg-white p-6 rounded-2xl border border-gray-100 mb-6 items-center">
                                    <TrendingUp size={32} color="#e5e7eb" />
                                    <Text className="text-gray-400 text-sm mt-3 font-medium">Analytics metrics derived from live submissions</Text>
                                </View>

                                {/* Subject Breakdown */}
                                <Text className="text-lg font-bold text-gray-900 mb-3">Subject Breakdown</Text>
                                {SubjectAnalytics.map((Subject) => (
                                    <SubjectAnalyticsCard key={Subject.id} Subject={Subject} />
                                ))}

                                {/* Top Performers */}
                                {topPerformers.length > 0 && (
                                    <View className="bg-teacherBlack p-4 rounded-2xl mt-4">
                                        <Text className="text-white font-bold mb-3">🏆 Top Performers</Text>
                                        <View className="flex-row justify-between">
                                            {topPerformers.map((student, index) => (
                                                <View key={index} className="items-center">
                                                    <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mb-1">
                                                        <Text className="text-white font-bold">{student.initials}</Text>
                                                    </View>
                                                    <Text className="text-gray-300 text-xs">{student.name}</Text>
                                                    <Text className="text-white font-bold text-xs">{student.score}%</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
