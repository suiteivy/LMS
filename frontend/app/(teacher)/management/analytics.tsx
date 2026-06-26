import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { ArrowLeft, TrendingUp, Users, BookOpen, Award, Download, Zap } from 'lucide-react-native';
import { router } from "expo-router";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { TeacherAPI } from "@/services/TeacherService";
import { GradingAPI } from "@/services/GradingService";
import { SubscriptionBanner, SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { TrendChart, SubjectTrendCard } from "@/components/common/TrendChart";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useTheme } from "@/contexts/ThemeContext";

interface SubjectAnalytics {
    id: string;
    name: string;
    students: number;
    avgProgress: number;
    avgGrade: number;
    completionRate: number;
}

const StatBox = ({ icon: Icon, label, value, color, bgColor }: { icon: any; label: string; value: string; color: string; bgColor: string }) => (
    <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]">
        <View style={{ backgroundColor: bgColor }} className="w-10 h-10 rounded-xl items-center justify-center mb-3">
            <Icon size={18} color={color} />
        </View>
        <Text className="text-gray-900 dark:text-white text-2xl font-black">{value}</Text>
        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">{label}</Text>
    </View>
);

const SubjectAnalyticsCard = ({ Subject }: { Subject: SubjectAnalytics }) => {
    return (
        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-3">
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-3">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{Subject.name}</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">{Subject.students} students</Text>
                </View>
                <View className="bg-orange-50 dark:bg-orange-950/20 px-2 py-1 rounded-md">
                    <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest">{Subject.completionRate}% complete</Text>
                </View>
            </View>

            <View className="flex-row gap-4 mt-2">
                <View className="flex-1">
                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-2">Completion</Text>
                    <View className="h-1.5 bg-[#D0D7DE] dark:bg-[#161B22] rounded-full overflow-hidden">
                        <View className="h-full bg-[#FF6900] rounded-full" style={{ width: `${Subject.completionRate}%` }} />
                    </View>
                    <Text className="text-gray-900 dark:text-white text-xs font-bold mt-2">{Subject.completionRate}%</Text>
                </View>
                <View className="flex-1">
                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-2">Avg Grade</Text>
                    <View className="h-1.5 bg-[#D0D7DE] dark:bg-[#161B22] rounded-full overflow-hidden">
                        <View className="h-full bg-[#1A1650] dark:bg-gray-300 rounded-full" style={{ width: `${Subject.avgGrade}%` }} />
                    </View>
                    <Text className="text-gray-900 dark:text-white text-xs font-bold mt-2">{Subject.avgGrade}%</Text>
                </View>
            </View>
        </View>
    );
};

export default function AnalyticsPage() {
    const { profile, teacherId, isDemo } = useAuth();
    const tier = useSubscriptionTier();
    const { isDark } = useTheme();
    const [selectedPeriod, setSelectedPeriod] = useState("All Time");
    const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [topPerformers, setTopPerformers] = useState<any[]>([]);
    const [trends, setTrends] = useState<any>({ terms: [], subjects: [] });
    const openManual = (anchor?: string) => {
        router.push({ pathname: '/(teacher)/accessibility/settings', params: { manual: '1', anchor: anchor || 'promotion-engine' } } as any);
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            if (isDemo) {
                setSubjectAnalytics([
                    { id: '1', name: "Advanced Mathematics", students: 12, avgProgress: 88, avgGrade: 84, completionRate: 88 },
                    { id: '2', name: "Theoretical Physics", students: 10, avgProgress: 75, avgGrade: 78, completionRate: 75 },
                    { id: '3', name: "Software Engineering", students: 15, avgProgress: 92, avgGrade: 89, completionRate: 92 },
                    { id: '4', name: "Database Systems", students: 5, avgProgress: 100, avgGrade: 92, completionRate: 100 }
                ]);
                setTopPerformers([
                    { name: "Sarah J.", initials: "SJ", score: 98 },
                    { name: "Michael C.", initials: "MC", score: 95 },
                    { name: "Grace W.", initials: "GW", score: 94 },
                ]);
                return;
            }

            const data = await TeacherAPI.getAnalytics();
            setSubjectAnalytics(data);

            // Fetch performance trends for first subject (overview)
            if (data.length > 0) {
                const trendData = await GradingAPI.getPerformanceTrends({}).catch(() => ({ terms: [], subjects: [] }));
                setTrends(trendData);
            }

            const { data: Subjects, error: SubjectsError } = (await supabase
                .from('subjects')
                .select('id, title, class_id')
                .eq('teacher_id', (teacherId as string))) as any;

            if (SubjectsError) throw SubjectsError;

            const classIds = (Subjects as any[]).map(s => s.class_id).filter(Boolean);
            if (classIds.length === 0) {
                setTopPerformers([]);
                setLoading(false);
                return;
            }

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

    useEffect(() => {
        if (teacherId || isDemo) {
            fetchAnalytics();
        }
    }, [teacherId, isDemo]);

    const totalStudents = subjectAnalytics.reduce((acc, c) => acc + (c.students || 0), 0);
    const avgCompletion = subjectAnalytics.length > 0
        ? Math.round(subjectAnalytics.reduce((acc, c) => acc + (c.completionRate || 0), 0) / subjectAnalytics.length)
        : 0;
    const avgGradeOverall = subjectAnalytics.length > 0
        ? Math.round(subjectAnalytics.reduce((acc, c) => acc + (c.avgGrade || 0), 0) / subjectAnalytics.length)
        : 0;

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <SubscriptionBanner />
            <UnifiedHeader
                title="Management"
                subtitle="Analytics"
                role="Teacher"
                onBack={() => router.back()}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
            >
                <View className="px-5 pt-4">
                    {/* Header Action */}
                    <View className="flex-row items-center justify-between mb-6">
                        <View>
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Performance</Text>
                            <Text className="text-2xl font-black text-gray-900 dark:text-white">Overview</Text>
                        </View>
                    </View>

                    <SubscriptionGate
                            feature="analytics"
                            fallback={
                                <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-8 rounded-2xl items-center border border-[#D0D7DE] dark:border-[#21262D] border-dashed flex-1">
                                    <Zap size={40} color="#FF6900" style={{ marginBottom: 20 }} />
                                    <Text className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">Analytics Locked</Text>
                                    <Text className="text-gray-500 dark:text-gray-400 text-center text-xs mb-6">
                                        Advanced analytics are not included in your current plan.
                                    </Text>
                                </View>
                            }
                        >
                            <View>
                                {/* Overview Stats */}
                                <View className="flex-row items-center mb-3">
                                    <Text className="text-gray-700 dark:text-gray-300 text-sm font-bold">Overview Metrics</Text>
                                    <HelpTooltip id="teacher.manage.insights" role="teacher" tier={tier} onLearnMore={openManual} />
                                </View>
                                <View className="flex-row gap-3 mb-3">
                                    <StatBox icon={Users} label="Total Students" value={totalStudents.toString()} color="#FF6900" bgColor={isDark ? "rgba(255, 105, 0, 0.1)" : "#fff7ed"} />
                                    <StatBox icon={TrendingUp} label="Avg Completion" value={`${avgCompletion}%`} color="#FF6900" bgColor={isDark ? "rgba(255, 105, 0, 0.1)" : "#fff7ed"} />
                                </View>
                                <View className="flex-row gap-3 mb-6">
                                    <StatBox icon={BookOpen} label="Subjects" value={subjectAnalytics.length.toString()} color="#FF6900" bgColor={isDark ? "rgba(255, 105, 0, 0.1)" : "#fff7ed"} />
                                    <StatBox icon={Award} label="Avg Grade" value={`${avgGradeOverall}%`} color="#FF6900" bgColor={isDark ? "rgba(255, 105, 0, 0.1)" : "#fff7ed"} />
                                </View>

                                {loading ? (
                                    <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                                ) : (
                                    <>
                                        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-5 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-6 items-center flex-row">
                                            <TrendingUp size={24} color="#9CA3AF" />
                                            <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest ml-3 flex-1">Metrics derived from live submissions</Text>
                                        </View>

                                        <View className="flex-row items-center mb-3 mt-2">
                                            <Text className="text-lg font-bold text-gray-900 dark:text-white">Subject Breakdown</Text>
                                            <HelpTooltip id="teacher.manage.performance" role="teacher" tier={tier} onLearnMore={openManual} />
                                        </View>
                                        {subjectAnalytics.map((Subject) => (
                                            <SubjectAnalyticsCard key={Subject.id} Subject={Subject} />
                                        ))}

                                        {/* Performance Trends Across Terms */}
                                        {trends.terms && trends.terms.length > 0 && (
                                            <View className="mt-6">
                                                <View className="flex-row items-center mb-3">
                                                    <Text className="text-lg font-bold text-gray-900 dark:text-white">Performance Trends</Text>
                                                    <HelpTooltip id="teacher.manage.insights" role="teacher" tier={tier} onLearnMore={openManual} />
                                                </View>
                                                <TrendChart
                                                    title="Class Average by Term"
                                                    data={trends.terms.map((t: any) => {
                                                        const avg = t.subjects?.length > 0
                                                            ? t.subjects.reduce((s: number, sub: any) => s + (sub.average || 0), 0) / t.subjects.length
                                                            : 0;
                                                        return { label: t.term_name, value: Math.round(avg * 10) / 10 };
                                                    })}
                                                    color="#FF6900"
                                                    height={140}
                                                />
                                            </View>
                                        )}

                                        {topPerformers.length > 0 && (
                                            <View className="bg-navy dark:bg-[#161B22] p-5 rounded-xl mt-6">
                                                <Text className="text-white font-bold mb-4">🏆 Top Performers</Text>
                                                <View className="flex-row justify-between">
                                                    {topPerformers.map((student, index) => (
                                                        <View key={index} className="items-center flex-1">
                                                            <View className="w-12 h-12 rounded-xl bg-white/10 items-center justify-center mb-2">
                                                                <Text className="text-white font-black text-lg">{student.initials}</Text>
                                                            </View>
                                                            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1" numberOfLines={1}>{student.name}</Text>
                                                            <Text className="text-[#FF6900] font-black text-sm">{student.score}%</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </SubscriptionGate>
                </View>
            </ScrollView>
        </View>
    );
}
