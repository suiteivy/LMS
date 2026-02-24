import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { ArrowLeft, TrendingUp, Users, BookOpen, Clock, Award, ChevronDown, Download } from 'lucide-react-native';
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { TeacherAPI } from "@/services/TeacherService";

interface SubjectAnalytics {
    id: string;
    name: string;
    students: number;
    avgProgress: number;
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
    const { teacherId } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState("All Time");
    const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [topPerformers, setTopPerformers] = useState<any[]>([]);

    useEffect(() => {
        if (teacherId) {
            fetchAnalytics();
        }
    }, [teacherId]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const data = await TeacherAPI.getAnalytics();
            setSubjectAnalytics(data);

            const { data: Subjects, error: SubjectsError } = await supabase
                .from('subjects')
                .select('id, title, class_id')
                .eq('teacher_id', (teacherId as string));

            if (SubjectsError) throw SubjectsError;

            const classIds = Subjects.map(s => s.class_id).filter(Boolean);
            if (classIds.length === 0) {
                setTopPerformers([]);
                setLoading(false);
                return;
            }

            // Fetch all graded submissions for students in the teacher's classes
            const { data: allSubmissions, error: submissionError } = await supabase
                .from('submissions')
                .select(`
                    grade,
                    student_id,
                    students (full_name),
                    assignment:assignments!inner (
                        subject:subjects!inner (
                            teacher_id
                        )
                    )
                `)
                .eq('assignment.subject.teacher_id', (teacherId as string))
                .eq('status', 'graded');

            if (submissionError) throw submissionError;

            const studentPerformance: { [key: string]: { name: string, total: number, count: number } } = {};

            (allSubmissions || []).forEach((sub: any) => {
                const sid = sub.student_id;
                const name = sub.students?.full_name || "Unknown";
                const grade = Number(sub.grade);

                if (!isNaN(grade)) {
                    if (!studentPerformance[sid]) {
                        studentPerformance[sid] = { name, total: 0, count: 0 };
                    }
                    studentPerformance[sid].total += grade;
                    studentPerformance[sid].count += 1;
                }
            });

            const topList = Object.entries(studentPerformance)
                .map(([id, stats]) => ({
                    name: stats.name,
                    initials: stats.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
                    score: Math.round(stats.total / stats.count)
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            setTopPerformers(topList);

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalStudents = subjectAnalytics.reduce((acc, c) => acc + (c.students || 0), 0);
    const avgCompletion = subjectAnalytics.length > 0
        ? Math.round(subjectAnalytics.reduce((acc, c) => acc + (c.completionRate || 0), 0) / subjectAnalytics.length)
        : 0;
    const avgGradeOverall = subjectAnalytics.length > 0
        ? Math.round(subjectAnalytics.reduce((acc, c) => acc + (c.avgGrade || 0), 0) / subjectAnalytics.length)
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

                        {/* Overview Stats */}
                        <View className="flex-row gap-3 mb-6">
                            <StatBox icon={Users} label="Total Students" value={totalStudents.toString()} color="#FF6B00" bgColor="#fff7ed" />
                            <StatBox icon={TrendingUp} label="Avg Completion" value={`${avgCompletion}%`} color="#1a1a1a" bgColor="#f3f4f6" />
                        </View>
                        <View className="flex-row gap-3 mb-6">
                            <StatBox icon={BookOpen} label="Subjects" value={subjectAnalytics.length.toString()} color="#FF6B00" bgColor="#fff7ed" />
                            <StatBox icon={Award} label="Avg Grade" value={`${avgGradeOverall}%`} color="#1a1a1a" bgColor="#f3f4f6" />
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#FF6B00" className="mt-8" />
                        ) : (
                            <>
                                <View className="bg-white p-6 rounded-2xl border border-gray-100 mb-6 items-center">
                                    <TrendingUp size={32} color="#e5e7eb" />
                                    <Text className="text-gray-400 text-sm mt-3 font-medium">Analytics metrics derived from live submissions</Text>
                                </View>

                                <Text className="text-lg font-bold text-gray-900 mb-3">Subject Breakdown</Text>
                                {subjectAnalytics.map((Subject) => (
                                    <SubjectAnalyticsCard key={Subject.id} Subject={Subject} />
                                ))}

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
